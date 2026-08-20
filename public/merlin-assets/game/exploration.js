import { $, ELEMENTS, SCHOOL_ORDER, pick, shuffle } from "./core.js";
import { CARDS, CARD_BY_ID, PASSIVES } from "./cards.js";
import { runtime, setState, state } from "./store.js";
import { advanceChapter, cardLevel, costLabel, freshTowerRun, gainExp, generateEvents, maxHp, saveState, settleExplorationTurn, slotCap } from "./state.js";
import { closeModal, render, showModal, showView, toast } from "./ui.js";
import { startBattle, stopBattle } from "./battle.js";

export function completeEvent(title, copy) {
  const selectedId = state.activeEventId;
  if (selectedId) settleExplorationTurn(selectedId);
  state.eventResult = { title, copy };
  state.battle = null;
  stopBattle();
  runtime.currentView = "explore";
  saveState();
  showView("explore");
}
export function continueExplore() {
  if (state.chapterComplete) {
    if (!advanceChapter()) state.eventResult = { title: "法师塔探索完成", copy: "你击败了终极首领。本轮构筑、等级和塔内成长将在重新进入法师塔时重置，积分与场外商店成长保留。" };
  } else state.eventResult = null;
  saveState(); render();
}
export function chooseCardModal(title, cards, action, copy = "选择一张书页。") {
  showModal(`<h2>${title}</h2><p>${copy}</p><div class="choice-grid">${cards.map((card) => `<button class="choice-button ${card.school}" data-modal-card="${card.id}"><h3>${card.name}</h3><small>${card.id} · ${costLabel(card)}</small><p>${card.full}</p></button>`).join("")}</div>`);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-modal-card]")?.dataset.modalCard;
    if (!id) return; closeModal(); action(CARD_BY_ID.get(id));
  };
}
export function choosePassiveModal() {
  const choices = shuffle(PASSIVES).slice(0, 3);
  showModal(`<h2>被动秘典 · 三选一</h2><p>被动卡不进入战斗魔法书，可无限升级；当所有战斗咒语满级后，成长牌库只会出现这些秘典。</p><div class="choice-grid">${choices.map((passive) => `<button class="choice-button arcane" data-passive="${passive.id}"><h3>${passive.name}</h3><small>${passive.id} · 当前 Lv.${Number(state.meta.passiveLevels?.[passive.id] || 0)}</small><p>${passive.copy}</p></button>`).join("")}</div>`);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-passive]")?.dataset.passive; if (!id) return;
    const passive = PASSIVES.find((item) => item.id === id); passive.apply(); state.meta.passiveLevels[id] = Number(state.meta.passiveLevels[id] || 0) + 1;
    closeModal(); completeEvent("秘典成长", `${passive.name}提升至 Lv.${state.meta.passiveLevels[id]}：${passive.copy}`);
  };
}
export function learnCard(card, forceDeck = true) {
  if (cardLevel(card.id)) {
    state.collection[card.id] = Math.min(6, cardLevel(card.id) + 1);
    return `${card.name}升至 Lv.${cardLevel(card.id)}`;
  }
  state.collection[card.id] = 1;
  if (forceDeck) state.deck.push(card.id);
  return `学会${card.name}，已装订到战斗魔法书`;
}
export function resolveEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  state.activeEventId = event.id;
  const type = event.type;
  if (type === "monster") { startBattle("pve"); return; }
  if (type === "player") { startBattle("pvp"); return; }
  if (type === "experience") {
    const amount = 42 + state.floor * 5, levels = gainExp(amount);
    completeEvent("课程完成", `获得 ${amount} 点经验${levels ? `，提升了 ${levels} 级` : ""}。`); return;
  }
  if (type === "rest") {
    const before = state.hp; state.hp = Math.min(maxHp(), state.hp + Math.ceil(maxHp() * .42));
    completeEvent("壁炉仍有余温", `回复 ${Math.ceil(state.hp - before)} 点生命。`); return;
  }
  if (type === "organize") { state.organizeTokens += 1; completeEvent("获得安全整理", "获得1次安全拆页机会。在魔法书中可将一张战斗书页移回仓库，并保留等级。"); return; }
  if (type === "library") {
    const pool = CARDS.filter((c) => cardLevel(c.id) < 6);
    if (!pool.length || Math.random() < .16) { choosePassiveModal(); return; }
    chooseCardModal("残破书库 · 三选一", shuffle(pool).slice(0, 3), (card) => completeEvent("书页归位", learnCard(card, true)), "学习新咒语时会直接装订；同名书页会升级，Lv.3与Lv.6发生质变。"); return;
  }
  if (type === "upgrade") {
    const cards = state.deck.map((id) => CARD_BY_ID.get(id)).filter((c) => cardLevel(c.id) < 6);
    if (!cards.length) { state.score += 60; completeEvent("幽灵导师", "战斗魔法书中所有咒语已满级，改为获得60积分。"); return; }
    chooseCardModal("幽灵导师", cards, (card) => { state.collection[card.id] += 1; completeEvent("指导完成", `${card.name}升至 Lv.${cardLevel(card.id)}。${[3, 6].includes(cardLevel(card.id)) ? "该咒语已发生机制质变。" : ""}`); }); return;
  }
  if (type === "element") { showElementEvent(); return; }
  if (type === "transmute") {
    const candidates = Object.keys(state.collection).map((id) => CARD_BY_ID.get(id)).filter((c) => c && ["fire", "water", "wind", "earth", "light", "dark"].includes(c.school));
    chooseCardModal("沸腾实验室", shuffle(candidates).slice(0, 9), (oldCard) => {
      const sameCost = CARDS.filter((c) => c.school !== oldCard.school && c.school !== "arcane" && c.cost.type === oldCard.cost.type && c.cost.amount === oldCard.cost.amount && !cardLevel(c.id));
      const replacement = pick(sameCost.length ? sameCost : CARDS.filter((c) => c.school !== oldCard.school && c.cost.amount === oldCard.cost.amount));
      const wasDeck = state.deck.includes(oldCard.id), lv = cardLevel(oldCard.id);
      delete state.collection[oldCard.id]; state.collection[replacement.id] = Math.max(lv, cardLevel(replacement.id));
      if (wasDeck) state.deck[state.deck.indexOf(oldCard.id)] = replacement.id;
      completeEvent("转化完成", `${oldCard.name}转化为${replacement.name}，保留 Lv.${lv}。`);
    }, "选择要转化的已学单系咒语；结果保留等级和装订位置。");
  }
}
export function showElementEvent() {
  showModal(`<h2>元素池</h2><p>选择要增加的起始元素。${state.startElements.length >= slotCap() ? "当前已满，下一步需选择被替换的元素。" : ""}</p><div class="choice-grid">${SCHOOL_ORDER.slice(0, 6).map((e) => `<button class="choice-button ${e}" data-element="${e}"><h3>${ELEMENTS[e].icon} ${ELEMENTS[e].name}元素</h3><p>将${ELEMENTS[e].name}纳入起始编排。</p></button>`).join("")}</div>`);
  $("modalContent").onclick = (event) => {
    const element = event.target.closest("[data-element]")?.dataset.element;
    if (!element) return;
    if (state.startElements.length < slotCap()) { state.startElements.push(element); closeModal(); completeEvent("元素增加", `起始编排增加1个${ELEMENTS[element].name}元素。`); return; }
    runtime.pendingElement = element;
    showModal(`<h2>选择替换位置</h2><p>选择一个现有元素，将它替换为${ELEMENTS[element].name}。</p><div class="choice-grid">${state.startElements.map((e, i) => `<button class="choice-button ${e}" data-replace="${i}"><h3>位置 ${i + 1}</h3><p>${ELEMENTS[e].icon} ${ELEMENTS[e].name} → ${ELEMENTS[element].icon} ${ELEMENTS[element].name}</p></button>`).join("")}</div>`);
    $("modalContent").onclick = (replaceEvent) => {
      const index = replaceEvent.target.closest("[data-replace]")?.dataset.replace;
      if (index == null) return; const old = state.startElements[index]; state.startElements[index] = runtime.pendingElement; closeModal(); completeEvent("元素替换", `${ELEMENTS[old].name}元素已替换为${ELEMENTS[state.startElements[index]].name}元素。`);
    };
  };
}
export function newTowerRun() {
  setState(freshTowerRun());
  const schools = state.startElements.map((element) => ELEMENTS[element].name).join("、");
  generateEvents(); saveState(); closeModal(); showView("explore"); toast(`已重新进入法师塔；从${schools}基础牌中生成3页，起始元素各1个。`);
}
