import { $, ELEMENTS, SCHOOL_ORDER, esc, pick, shuffle } from "./core.js?v=26";
import { CARDS, CARD_BY_ID, PASSIVES } from "./cards.js?v=26";
import { PASSIVE_LIBRARY_CHANCE } from "./content.js?v=26";
import { runtime, state } from "./store.js?v=26";
import { advanceChapter, cardLevel, chapterLabel, COMBAT_DECK_CAP, expectedDeckPerformance, gainExp, maxHp, missingBuildElements, replaceBoundPage, resetTowerRun, saveState, settleExplorationTurn, slotCap } from "./state.js?v=26";
import { cardCostHtml, cardMetadataHtml, closeModal, damageForecastHtml, elementBalanceHtml, showModal, showView, toast } from "./ui.js?v=26";
import { startBattle, stopBattle } from "./battle.js?v=26";

export function completeEvent(title, copy) {
  const selectedId = state.activeEventId;
  if (selectedId) settleExplorationTurn(selectedId);
  state.battle = null;
  stopBattle();
  closeModal(true);
  let feedback = `${title}：${copy}`;
  state.eventResult = null;
  if (state.chapterComplete) {
    if (advanceChapter()) feedback += ` 已进入${chapterLabel()}，生命已经补满。`;
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
  const performance = expectedDeckPerformance();
  const elements = Object.entries(counts).map(([element, amount]) => `<span class="context-element ${element}">${ELEMENTS[element].icon} ${ELEMENTS[element].name} ×${amount}</span>`).join("") || '<span class="context-empty">暂无起始元素</span>';
  const pages = state.deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).map((card) => `<span class="context-page ${card.school}">${cardMetadataHtml(card)}<b>${esc(card.name)}</b>${cardCostHtml(card, true)}<small>Lv.${cardLevel(card.id)}</small></span>`).join("") || '<span class="context-empty">当前没有已装订书页</span>';
  return `<section class="decision-context" aria-label="当前构筑"><header><div><small>BUILD REFERENCE</small><b>当前构筑</b></div><span>预期直伤 <b>${performance.damagePct}%</b> · 完整施法率 ${performance.fullCastRate}%</span></header><div class="decision-context-grid"><div><h3>起始元素 <b>${state.startElements.length} / ${slotCap()}</b></h3><div class="context-elements">${elements}</div></div><div><h3>已装订书页 <b>${state.deck.length} / ${COMBAT_DECK_CAP}</b></h3><div class="context-pages">${pages}</div></div></div></section>`;
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
  showModal(`<h2>${title}</h2><p>${copy}</p><p><b>已选定本事件：请做出选择以完成处理。</b></p>${decisionContextHtml()}<div class="choice-grid">${cards.map((card) => `<button class="choice-button ${card.school}" data-modal-card="${card.id}">${cardMetadataHtml(card)}<h3>${card.name}</h3>${cardCostHtml(card)}<p>${card.full}</p>${candidateFitHtml(card)}</button>`).join("")}</div>`, false);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-modal-card]")?.dataset.modalCard;
    if (!id) return; closeModal(true); action(CARD_BY_ID.get(id));
  };
}
export function choosePassiveModal() {
  const choices = shuffle(PASSIVES).slice(0, 3);
  showModal(`<h2>被动秘典 · 三选一</h2><p>被动卡不进入战斗魔法书，可无限升级；当所有战斗咒语满级后，成长牌库只会出现这些秘典。</p><p><b>已选定本事件：请做出选择以完成处理。</b></p>${decisionContextHtml()}<div class="choice-grid">${choices.map((passive) => `<button class="choice-button arcane" data-passive="${passive.id}"><span class="spell-meta arcane">✶ 奥术 · 被动秘典</span><h3>${passive.name}</h3><small>当前 Lv.${Number(state.meta.passiveLevels?.[passive.id] || 0)}</small><p>${passive.copy}</p></button>`).join("")}</div>`, false);
  $("modalContent").onclick = (event) => {
    const id = event.target.closest("[data-passive]")?.dataset.passive; if (!id) return;
    const passive = PASSIVES.find((item) => item.id === id); passive.apply(); state.meta.passiveLevels[id] = Number(state.meta.passiveLevels[id] || 0) + 1;
    closeModal(true); completeEvent("秘典成长", `${passive.name}提升至 Lv.${state.meta.passiveLevels[id]}：${passive.copy}`);
  };
}
export const LIBRARY_SCHOOLS = SCHOOL_ORDER.slice(0, 6);
export function librarySpellChoices(primaryPool, fallbackPool = [], randomValue = Math.random) {
  return LIBRARY_SCHOOLS.map((school) => {
    const primary = primaryPool.filter((card) => card.school === school);
    const fallback = fallbackPool.filter((card) => card.school === school);
    const candidates = primary.length ? primary : fallback;
    return candidates.length ? candidates[Math.floor(randomValue() * candidates.length)] : null;
  }).filter(Boolean);
}
const SINGLE_SPELL_SCHOOLS = ["fire", "water", "wind", "earth", "light", "dark"];
export function transmutationOptions(oldCard, startElements = state.startElements) {
  if (!oldCard || !SINGLE_SPELL_SCHOOLS.includes(oldCard.school)) return [];
  const availableSchools = new Set(startElements.filter((school) => SINGLE_SPELL_SCHOOLS.includes(school) && school !== oldCard.school));
  return CARDS.filter((card) => (
    SINGLE_SPELL_SCHOOLS.includes(card.school)
    && availableSchools.has(card.school)
    && card.cost.type === oldCard.cost.type
    && card.cost.amount === oldCard.cost.amount
    && !cardLevel(card.id)
  ));
}
export function transmuteLearnedSpell(oldCard, replacement) {
  if (!oldCard || !replacement || !cardLevel(oldCard.id) || !transmutationOptions(oldCard).some((card) => card.id === replacement.id)) return null;
  const level = cardLevel(oldCard.id);
  const deckIndex = state.deck.indexOf(oldCard.id);
  delete state.collection[oldCard.id];
  state.collection[replacement.id] = level;
  if (deckIndex >= 0) state.deck[deckIndex] = replacement.id;
  return { level, deckIndex, bound: deckIndex >= 0 };
}
export function storeAcquiredPage(card) {
  if (cardLevel(card.id)) {
    state.collection[card.id] = Math.min(6, cardLevel(card.id) + 1);
    return `${card.name}的同名书页已转化为升级，提升至 Lv.${cardLevel(card.id)}`;
  }
  state.collection[card.id] = 1;
  return `学会${card.name}，已放入仓库`;
}
export function upgradePageWithReward(card, targetId) {
  const target = CARD_BY_ID.get(targetId);
  if (!target || target.basePage || !state.deck.includes(targetId) || cardLevel(targetId) >= 6) return null;
  state.collection[targetId] = cardLevel(targetId) + 1;
  return `将《${card.name}》作为升级材料，《${target.name}》提升至 Lv.${cardLevel(targetId)}`;
}
export function replacePageWithReward(card, outgoingId) {
  if (state.deck.includes(card.id) || !state.deck.includes(outgoingId)) return null;
  const wasKnown = Boolean(cardLevel(card.id));
  if (!wasKnown) state.collection[card.id] = 1;
  const result = replaceBoundPage(card.id, outgoingId);
  if (result !== "replaced") {
    if (!wasKnown) delete state.collection[card.id];
    return null;
  }
  return `《${card.name}》替换了《${CARD_BY_ID.get(outgoingId).name}》；旧书页${CARD_BY_ID.get(outgoingId).basePage ? "回归基础页库" : "已收入仓库"}`;
}
function confirmReplacement(card, outgoingId, onReplace, locked, onActionBack) {
  const remainingDeck = state.deck.filter((id) => id !== outgoingId);
  const previewDeck = state.deck.map((id) => id === outgoingId ? card.id : id);
  const missing = missingBuildElements(card, remainingDeck);
  if (!missing.length) { onReplace(outgoingId); return; }
  const names = missing.map((element) => `${ELEMENTS[element].icon}${ELEMENTS[element].name}元素`).join("、");
  showModal(`<h2>替换后将引入新元素系</h2><p>《${card.name}》会引入当前起始元素和替换后魔法书中完全没有的 <b>${names}</b>。这可能扩大元素缺口，但不会禁止装订。</p><div class="confirm-balance"><span>替换后理论余缺</span><div class="element-balance-chips">${elementBalanceHtml(previewDeck)}</div>${damageForecastHtml(previewDeck, {}, "替换后")}</div><div class="confirmation-actions"><button class="secondary" data-back-replace>返回选择</button><button class="primary" data-confirm-replace>仍然替换</button></div>`, locked);
  $("modalContent").onclick = (event) => {
    if (event.target.closest("[data-back-replace]")) { showReplacementModal(card, onReplace, locked, onActionBack); return; }
    if (event.target.closest("[data-confirm-replace]")) onReplace(outgoingId);
  };
}
export function showReplacementModal(card, onReplace, locked = false, onActionBack = null) {
  const back = onActionBack ? '<div class="modal-step-actions"><button class="secondary" data-back-acquire>← 返回选择处理方式</button></div>' : "";
  showModal(`<h2>选择要替换的书页</h2><p>魔法书固定为${COMBAT_DECK_CAP}页。新页占据所选槽位；被替换的非基础书页保留等级并进入仓库。</p>${back}${decisionContextHtml()}<div class="choice-grid">${state.deck.map((id) => { const page = CARD_BY_ID.get(id), previewDeck = state.deck.map((currentId) => currentId === id ? card.id : currentId); return `<button class="choice-button ${page.school}" data-replace-page="${id}">${cardMetadataHtml(page)}<h3>${page.name}</h3>${cardCostHtml(page)}<small>${page.basePage ? "基础页" : `Lv.${cardLevel(id)}`}</small>${damageForecastHtml(previewDeck, {}, "替换后")}</button>`; }).join("")}</div>`, locked);
  $("modalContent").onclick = (event) => {
    if (event.target.closest("[data-back-acquire]") && onActionBack) { onActionBack(); return; }
    const outgoingId = event.target.closest("[data-replace-page]")?.dataset.replacePage;
    if (outgoingId) confirmReplacement(card, outgoingId, onReplace, locked, onActionBack);
  };
}
export function showAcquiredPageModal(card) {
  const upgradeTargets = state.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage && cardLevel(id) < 6);
  showModal(`<h2>获得《${card.name}》</h2><p>新书页不会自动改变构筑。你可以替换当前一页、将它作为材料升级一张已装订咒语，或收入仓库；进入下一步后仍可返回重新选择处理方式。</p>${decisionContextHtml()}<div class="choice-grid acquire-actions"><button class="choice-button ${card.school}" data-acquire-action="replace">${cardMetadataHtml(card)}<h3>替换一页</h3><p>装订新书页，并将被替换的非基础页收入仓库。</p></button><button class="choice-button arcane" data-acquire-action="upgrade" ${upgradeTargets.length ? "" : "disabled"}><span class="spell-meta arcane">✶ 奥术 · 书页精炼</span><h3>升级一页</h3><p>${upgradeTargets.length ? "消耗这张新书页，选择一张未满级的已装订咒语升级。" : "当前没有可以升级的已装订咒语。"}</p></button><button class="choice-button arcane" data-acquire-action="store"><span class="spell-meta arcane">✶ 奥术 · 暂存</span><h3>收入仓库</h3><p>保留新书页，不改变当前10页构筑。</p></button></div>`, false);
  $("modalContent").onclick = (event) => {
    const action = event.target.closest("[data-acquire-action]")?.dataset.acquireAction;
    if (action === "store") {
      showModal(`<h2>将《${card.name}》收入仓库？</h2><p>当前10页魔法书不会改变；确认后完成本次事件。</p>${damageForecastHtml(state.deck, {}, "保持") }<div class="confirmation-actions"><button class="secondary" data-back-acquire>返回选择处理方式</button><button class="primary" data-confirm-store>确认收入仓库</button></div>`, false);
      $("modalContent").onclick = (storeEvent) => {
        if (storeEvent.target.closest("[data-back-acquire]")) { showAcquiredPageModal(card); return; }
        if (storeEvent.target.closest("[data-confirm-store]")) completeEvent("书页入库", storeAcquiredPage(card));
      };
      return;
    }
    if (action === "replace") {
      showReplacementModal(card, (outgoingId) => {
        const result = replacePageWithReward(card, outgoingId);
        if (result) completeEvent("替换完成", result);
      }, false, () => showAcquiredPageModal(card));
      return;
    }
    if (action === "upgrade" && upgradeTargets.length) {
      showModal(`<h2>选择要升级的书页</h2><p>《${card.name}》将作为升级材料消耗，不会进入收藏。</p><div class="modal-step-actions"><button class="secondary" data-back-acquire>← 返回选择处理方式</button></div>${decisionContextHtml()}<div class="choice-grid">${upgradeTargets.map((id) => { const target = CARD_BY_ID.get(id), nextLevel = cardLevel(id) + 1; return `<button class="choice-button ${target.school}" data-upgrade-reward="${id}">${cardMetadataHtml(target)}<h3>${target.name}</h3><p>Lv.${cardLevel(id)} → Lv.${nextLevel}</p>${damageForecastHtml(state.deck, { [id]: nextLevel }, "升级后")}</button>`; }).join("")}</div>`, false);
      $("modalContent").onclick = (upgradeEvent) => {
        if (upgradeEvent.target.closest("[data-back-acquire]")) { showAcquiredPageModal(card); return; }
        const targetId = upgradeEvent.target.closest("[data-upgrade-reward]")?.dataset.upgradeReward;
        if (!targetId) return;
        const result = upgradePageWithReward(card, targetId);
        if (result) completeEvent("升级完成", result);
      };
    }
  };
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
  if (type === "organize") { state.organizeTokens += 1; completeEvent("获得安全整理", "获得1次安全拆页机会。可将一张非基础战斗书页移回仓库，空位自动恢复为基础咒术页。"); return; }
  if (type === "library") {
    const pool = CARDS.filter((card) => LIBRARY_SCHOOLS.includes(card.school) && !cardLevel(card.id));
    if (!pool.length || Math.random() < PASSIVE_LIBRARY_CHANCE) { choosePassiveModal(); return; }
    const fallbackPool = CARDS.filter((card) => LIBRARY_SCHOOLS.includes(card.school) && cardLevel(card.id) < 6 && !state.deck.includes(card.id));
    const choices = librarySpellChoices(pool, fallbackPool);
    if (choices.length < LIBRARY_SCHOOLS.length) { choosePassiveModal(); return; }
    chooseCardModal("残破书库 · 六系六选一", choices, showAcquiredPageModal, `火、水、风、土、光、暗各提供一张候选咒语。选择后可替换当前一页、作为升级材料或收入仓库；魔法书始终保持${COMBAT_DECK_CAP}页。`); return;
  }
  if (type === "upgrade") {
    const cards = state.deck.map((id) => CARD_BY_ID.get(id)).filter((c) => c && !c.basePage && cardLevel(c.id) < 6);
    if (!cards.length) { state.score += 60; completeEvent("幽灵导师", "战斗魔法书中所有咒语已满级，改为获得60积分。"); return; }
    chooseCardModal("幽灵导师", cards, (card) => { state.collection[card.id] += 1; completeEvent("指导完成", `${card.name}升至 Lv.${cardLevel(card.id)}。${[3, 6].includes(cardLevel(card.id)) ? "该咒语已发生机制质变。" : ""}`); }); return;
  }
  if (type === "element") { showElementEvent(); return; }
  if (type === "transmute") {
    const candidates = Object.keys(state.collection).map((id) => CARD_BY_ID.get(id)).filter((card) => card && transmutationOptions(card).length);
    if (!candidates.length) {
      state.score += 60;
      completeEvent("实验条件不足", "当前没有可转化为起始元素中其他系同消耗咒语的已学单系咒语，改为获得60积分。");
      return;
    }
    const availableNames = [...new Set(state.startElements)].map((school) => `${ELEMENTS[school].icon}${ELEMENTS[school].name}`).join("、");
    chooseCardModal("沸腾实验室", candidates, (oldCard) => {
      const replacement = pick(transmutationOptions(oldCard));
      const result = transmuteLearnedSpell(oldCard, replacement);
      if (!result) return;
      completeEvent("转化完成", `${oldCard.name}转化为${replacement.name}，保留 Lv.${result.level}${result.bound ? ` 和第${result.deckIndex + 1}页装订位置` : "；原咒语位于仓库，因此新咒语仍在仓库"}。`);
    }, `当前起始元素为${availableNames}。选择一张已学单系咒语后，它会随机替换为这些元素中与目标不同系、消耗类型和数量相同的未学单系咒语，并保留等级与装订位置。没有合法结果的咒语不会出现在选项中。`);
    return;
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
  resetTowerRun();
  const schools = state.startElements.map((element) => ELEMENTS[element].name).join("、");
  saveState(); closeModal(true); showView("explore"); toast(`已重新进入法师塔；10页基础魔法书中有3页替换为${schools}初始元素牌，起始元素各1个。`);
}

export function restartAfterPveDefeat() {
  if (state.battle?.mode !== "pve" || !state.battle.over || state.battle.won) return false;
  const failedChapter = state.chapter;
  resetTowerRun();
  runtime.currentView = "explore";
  saveState(); closeModal(true); showView("explore");
  toast(`${chapterLabel(failedChapter)}挑战失败，本轮结算已确认，新的法师塔挑战已经从序章开始。`);
  return true;
}
