import { $, ELEMENTS, SCHOOL_ORDER } from "./core.js";
import { CARD_BY_ID } from "./cards.js";
import { runtime, setState, state } from "./store.js";
import { freshState, generateEvents, hydrate, loadLocal, saveState } from "./state.js";
import { closeModal, render, renderArchive, renderGrimoire, shopCost, shopLevel, SHOP, showModal, showView, toast } from "./ui.js";
import { completeEvent, continueExplore, newTowerRun, resolveEvent } from "./exploration.js";
import { cycleBattleSpeed, renderBattle, restartBattle, scheduleBattle, startBattle, stepBattle, toggleBattlePause } from "./battle.js";

export function populateFilters() {
  const options = ['<option value="all">全部流派</option>', ...SCHOOL_ORDER.map((s) => `<option value="${s}">${ELEMENTS[s].name}系</option>`)].join("");
  $("schoolFilter").innerHTML = options; $("archiveSchoolFilter").innerHTML = options;
}
export function showHelp() {
  showModal(`<h2>玩法说明</h2><p>这是一个可完整游玩的系统原型，用于验证探索、元素经济、组卡与自动战斗的衔接。</p><div class="choice-grid"><article class="choice-button"><h3>1 · 探索</h3><p>每层三选一事件。生命值在同一轮法师塔内继承，休息室可回复。</p></article><article class="choice-button"><h3>2 · 组卡</h3><p>战斗魔法书没有页数上限。仓库可自由装订；移回仓库需要装订台事件提供的安全整理次数。</p></article><article class="choice-button"><h3>3 · 战斗</h3><p>书页不放回随机，全部翻完后洗回。元素足够时自动完整施法，否则发动残响且不消耗元素。</p></article></div><p><b>方差规则：</b>每段效果独立投掷 40%–300% 偏态方差；高值少见，但会真实改变战斗结果。</p><p><b>原型暂定：</b>重新进入法师塔时，角色等级、经验、当前生命与层数重置；已学咒语、咒语等级、魔法书编排、积分与商店属性永久保留。</p>`);
}
export function bindEvents() {
  document.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view]")?.dataset.view; if (view) { showView(view); return; }
    const eventType = event.target.closest("[data-event]")?.dataset.event; if (eventType) { resolveEvent(eventType); return; }
    const bind = event.target.closest("[data-bind]")?.dataset.bind;
    if (bind) { if (!state.deck.includes(bind)) state.deck.push(bind); saveState(); renderGrimoire(); toast(`已将《${CARD_BY_ID.get(bind).name}》装订到战斗魔法书。`); return; }
    const unbind = event.target.closest("[data-unbind]")?.dataset.unbind;
    if (unbind && state.organizeTokens > 0) {
      if (state.deck.length <= 1) { toast("至少需要保留1张战斗书页。"); return; }
      state.deck = state.deck.filter((id) => id !== unbind); state.organizeTokens -= 1; saveState(); renderGrimoire(); toast(`已安全将《${CARD_BY_ID.get(unbind).name}》移入仓库。`); return;
    }
    const buy = event.target.closest("[data-buy]")?.dataset.buy;
    if (buy) {
      const item = SHOP.find((x) => x.id === buy), price = shopCost(item); if (state.score < price) return;
      state.score -= price; item.apply(); state.meta.passiveLevels[buy] = shopLevel(buy) + 1; saveState(); render(); toast(`${item.name}提升至 Lv.${shopLevel(buy)}。`); return;
    }
    if (event.target.closest("[data-battle-finish]")) { const mode = state.battle.mode; completeEvent(mode === "pvp" ? "镜像对决胜利" : "元素试炼完成", mode === "pvp" ? "你击败了镜像玩家，已获得经验与积分。" : "塔中敌人已被清除，生命值将继承到下一层。"); return; }
    if (event.target.closest("[data-battle-retry]")) { const spec = { ...state.battle.spec }; startBattle(state.battle.mode, spec); return; }
    if (event.target.closest("[data-battle-new-run]")) { newTowerRun(); }
  });
  $("continueButton").addEventListener("click", continueExplore);
  $("newRunButton").addEventListener("click", () => showModal('<h2>重新进入法师塔？</h2><p>当前层数、塔内等级、经验和生命会重置；已学咒语、魔法书、积分与商店成长保留。</p><button class="primary" id="confirmNewRun">确认重开</button>'));
  $("modalContent").addEventListener("click", (event) => { if (event.target.id === "confirmNewRun") newTowerRun(); });
  $("modalClose").addEventListener("click", closeModal); $("modal").addEventListener("click", (event) => { if (event.target === $("modal")) closeModal(); });
  $("helpButton").addEventListener("click", showHelp);
  ["cardSearch", "schoolFilter", "costFilter"].forEach((id) => $(id).addEventListener(id === "cardSearch" ? "input" : "change", renderGrimoire));
  ["archiveSearch", "archiveSchoolFilter"].forEach((id) => $(id).addEventListener(id === "archiveSearch" ? "input" : "change", renderArchive));
  $("battleSpeed").addEventListener("click", cycleBattleSpeed);
  $("battlePause").addEventListener("click", toggleBattlePause);
  $("battleStep").addEventListener("click", stepBattle);
  $("battleRestart").addEventListener("click", restartBattle);
  window.addEventListener("message", (event) => {
    const message = event.data; if (!message || typeof message !== "object") return;
    if (["merlin:load", "merlin:load-remote"].includes(message.type) && message.state) { if (!hydrate(message.state)) { setState(freshState(message.state)); generateEvents(); } runtime.currentView = state.battle && !state.battle.over ? "battle" : "explore"; render(); if (runtime.currentView === "battle") { renderBattle(); scheduleBattle(500); } }
    if (message.type === "merlin:new") { setState(freshState()); generateEvents(); runtime.currentView = "explore"; render(); saveState(); }
  });
}
export function init() {
  populateFilters();
  if (!loadLocal()) { setState(freshState()); generateEvents(); }
  if (state.battle && !state.battle.over) runtime.currentView = "battle";
  bindEvents(); showView(runtime.currentView); saveState();
  if (runtime.currentView === "battle") { renderBattle(); scheduleBattle(500); }
  if (window.parent !== window) window.parent.postMessage({ type: "merlin:ready" }, "*");
}
init();
