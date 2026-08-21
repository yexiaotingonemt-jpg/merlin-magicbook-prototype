import { $, ELEMENTS, SCHOOL_ORDER, esc, pick, shuffle } from "./core.js?v=15";
import { CARDS, CARD_BY_ID, PASSIVES } from "./cards.js?v=15";
import { runtime, setState, state } from "./store.js?v=15";
import { advanceChapter, bindCard, cardLevel, COMBAT_DECK_CAP, costLabel, freshTowerRun, gainExp, generateEvents, maxHp, saveState, settleExplorationTurn, slotCap } from "./state.js?v=15";
import { closeModal, showModal, showView, toast } from "./ui.js?v=15";
import { startBattle, stopBattle } from "./battle.js?v=15";

export function completeEvent(title, copy) {
  const selectedId = state.activeEventId;
  if (selectedId) settleExplorationTurn(selectedId);
  state.battle = null;
  stopBattle();
  closeModal(true);
  let feedback = `${title}：${copy}`;
  state.eventResult = null;
  if (state.chapterComplete) {
    if (advanceChapter()) feedback += ` 已进入第${state.chapter}章，生命已经补满。`;
    else state.eventResult = { title: "法师塔探索完成", copy: `${feedback} 你击败了终极首领；本轮构筑、等级和塔内成长将在重新进入法师塔时重置，积分与场外商店成长保留。` };
  }
  runtime.currentView = "explore";
  saveState();
  showView("explore");
  if (!state.runComplete) toast(feedback);
}
function startElementCounts() {
  return state.startElements.reduce((counts, element) => {
    counts[element] = (counts[element] || 0) + 1;
    return counts;
  }, {});
}
export function decisionContextHtml() {
  const counts = startElementCounts();
  const elements = Object.entries(counts).map(([element, amount]) => `<span class="context-element ${element}">${ELEMENTS[element].icon} ${ELEMENTS[element].name} ×${amount}</span>`).join("") || '<span class="context-empty">暂无起始元素</span>';
  const pages = state.deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).map((card) => `<span class="context-page ${card.school}"><b>${esc(card.name)}</b><small>Lv.${cardLevel(card.id)} · ${costLabel(card)}</small></span>`).join("") || '<span class="context-empty">当前没有已装订书页</span>';
  return `<section class="decision-context" aria-label="当前构筑"><header><div><small>BUILD REFERENCE</small><b>当前构筑</b></div><span>用于本次选择，事件确认后立即结算</span></header><div class="decision-context-grid"><div><h3>起始元素 <b>${state.startElements.length} / ${slotCap()}</b></h3><div class="context-elements">${elements}</div></div><div><h3>已装订书页 <b>${state.deck.length} / ${COMBAT_DECK_CAP}</b></h3><div class="context-pages">${pages}</div></div></div></section>`;
}
export function candidateFitHtml(card) {
  const counts = startElementCounts();
  const location = state.deck.includes(card.id) ? `已装订 Lv.${cardLevel(card.id)}` : cardLevel(card.id) ? `仓库 Lv.${cardLevel(card.id)}` : "尚未学习";
  let coverage = "无需起始元素";
  if (card.cost.amount > 0 && card.cost.type === "fixed" && card.cost.parts) {
    coverage = Object.entries(card.cost.parts).map(([element, needed]) => `${ELEMENTS[element].name}${counts[element] || 0}/${needed}`).join(" · ");
  } else if (card.cost.amount > 0) coverage = `当前${state.startElements.length}元素 · 需要${card.cost.amount}`;
  return `<span class="candidate-fit"><b>${location}</b><small>开局匹配：${coverage}</small></span>`;
}
export function chooseCardModal(title, cards, action, copy = "选择一张书页。") {
  showModal(`<h2>${title}</h2><p>${copy}</p><p><b>已选定本事件：请做出选择以完成处理。</b></p>${decisionContextHtml()}<div class="choice-grid">${cards.map((card) => `<button class="choice-button ${card.school}" data-modal-card="${card.id}"><h3>${card.name}</h3><small>${card.id} · ${costLabel(card)}</small><p>${card.full}</p>${candidateFitHtml(card)}</button>`).join("")}</div>`, false);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-modal-card]")?.dataset.modalCard;
    if (!id) return; closeModal(true); action(CARD_BY_ID.get(id));
  };
}
export function choosePassiveModal() {
  const choices = shuffle(PASSIVES).slice(0, 3);
  showModal(`<h2>被动秘典 · 三选一</h2><p>被动卡不进入战斗魔法书，可无限升级；当所有战斗咒语满级后，成长牌库只会出现这些秘典。</p><p><b>已选定本事件：请做出选择以完成处理。</b></p>${decisionContextHtml()}<div class="choice-grid">${choices.map((passive) => `<button class="choice-button arcane" data-passive="${passive.id}"><h3>${passive.name}</h3><small>${passive.id} · 当前 Lv.${Number(state.meta.passiveLevels?.[passive.id] || 0)}</small><p>${passive.copy}</p></button>`).join("")}</div>`, false);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-passive]")?.dataset.passive; if (!id) return;
    const passive = PASSIVES.find((item) => item.id === id); passive.apply(); state.meta.passiveLevels[id] = Number(state.meta.passiveLevels[id] || 0) + 1;
    closeModal(true); completeEvent("秘典成长", `${passive.name}提升至 Lv.${state.meta.passiveLevels[id]}：${passive.copy}`);
  };
}
export function learnCard(card, forceDeck = true) {
  if (cardLevel(card.id)) {
    state.collection[card.id] = Math.min(6, cardLevel(card.id) + 1);
    return `${card.name}升至 Lv.${cardLevel(card.id)}`;
  }
  state.collection[card.id] = 1;
  if (!forceDeck) return `学会${card.name}，已放入仓库`;
  if (bindCard(card.id) === "bound") return `学会${card.name}，已装订到战斗魔法书`;
  return `学会${card.name}；战斗魔法书已达${COMBAT_DECK_CAP}页上限，书页已自动放入仓库`;
}
export function resolveEvent(eventId) {
  if (state.activeEventId && state.activeEventId !== eventId) { toast("已选定其他事件，请先完成当前处理。"); return; }
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  state.activeEventId = event.id;
  saveState();
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
    chooseCardModal("残破书库 · 三选一", shuffle(pool).slice(0, 3), (card) => completeEvent("书页归位", learnCard(card, true)), `学习新咒语时优先直接装订；战斗魔法书达到${COMBAT_DECK_CAP}页后自动放入仓库。同名书页会升级，Lv.3与Lv.6发生质变。`); return;
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
  const counts = startElementCounts();
  showModal(`<h2>元素池</h2><p>选择要增加的起始元素。${state.startElements.length >= slotCap() ? "当前已满，下一步需选择被替换的元素。" : ""}</p><p><b>已选定本事件：请完成元素编排。</b></p>${decisionContextHtml()}<div class="choice-grid">${SCHOOL_ORDER.slice(0, 6).map((e) => `<button class="choice-button ${e}" data-element="${e}"><h3>${ELEMENTS[e].icon} ${ELEMENTS[e].name}元素</h3><p>将${ELEMENTS[e].name}纳入起始编排。</p><span class="candidate-fit"><b>当前 ${counts[e] || 0} 个</b><small>${state.startElements.length >= slotCap() ? "选择后进入替换步骤" : "选择后增加1个"}</small></span></button>`).join("")}</div>`, false);
  $("modalContent").onclick = (event) => {
    const element = event.target.closest("[data-element]")?.dataset.element;
    if (!element) return;
    if (state.startElements.length < slotCap()) { state.startElements.push(element); closeModal(true); completeEvent("元素增加", `起始编排增加1个${ELEMENTS[element].name}元素。`); return; }
    runtime.pendingElement = element;
    showModal(`<h2>选择替换位置</h2><p>选择一个现有元素，将它替换为${ELEMENTS[element].name}。</p><p><b>已选定本事件：请完成替换。</b></p>${decisionContextHtml()}<div class="choice-grid">${state.startElements.map((e, i) => `<button class="choice-button ${e}" data-replace="${i}"><h3>位置 ${i + 1}</h3><p>${ELEMENTS[e].icon} ${ELEMENTS[e].name} → ${ELEMENTS[element].icon} ${ELEMENTS[element].name}</p></button>`).join("")}</div>`, false);
    $("modalContent").onclick = (replaceEvent) => {
      const index = replaceEvent.target.closest("[data-replace]")?.dataset.replace;
      if (index == null) return; const old = state.startElements[index]; state.startElements[index] = runtime.pendingElement; closeModal(true); completeEvent("元素替换", `${ELEMENTS[old].name}元素已替换为${ELEMENTS[state.startElements[index]].name}元素。`);
    };
  };
}
export function newTowerRun() {
  setState(freshTowerRun());
  const schools = state.startElements.map((element) => ELEMENTS[element].name).join("、");
  generateEvents(); saveState(); closeModal(true); showView("explore"); toast(`已重新进入法师塔；从${schools}基础牌中生成3页，起始元素各1个。`);
}
