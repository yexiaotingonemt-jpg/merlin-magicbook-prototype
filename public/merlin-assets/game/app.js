import { $, ELEMENTS, SCHOOL_ORDER } from "./core.js?v=25";
import { CARD_BY_ID } from "./cards.js?v=25";
import { runtime, setState, state } from "./store.js?v=25";
import { freshState, generateEvents, hydrate, loadLocal, organizeBoundPage, replaceBoundPage, saveState } from "./state.js?v=25";
import { closeModal, render, renderArchive, renderGrimoire, shopCost, shopLevel, SHOP, showModal, showView, toast } from "./ui.js?v=25";
import { completeEvent, newTowerRun, resolveEvent, restartAfterPveDefeat, showReplacementModal } from "./exploration.js?v=25";
import { cycleBattleSpeed, renderBattle, scheduleBattle, stepBattle, toggleBattlePause, toggleBattleStatusPanel } from "./battle.js?v=25";

export function populateFilters() {
  const options = ['<option value="all">全部流派</option>', ...SCHOOL_ORDER.map((s) => `<option value="${s}">${ELEMENTS[s].name}系</option>`)].join("");
  $("schoolFilter").innerHTML = options; $("archiveSchoolFilter").innerHTML = options;
}
export function showHelp() {
  showModal(`<h2>玩法说明</h2><p>这是一个可完整游玩的系统原型，用于验证探索、元素经济、组卡与自动战斗的衔接。</p><div class="choice-grid"><article class="choice-button"><h3>1 · 序章＋六章探索</h3><p>序章固定展示元素池、残破书库和元素试炼。普通章预先生成有限事件池；每处理1个事件，其他有限事件倒计时减1，正面事件会自燃，怪物与镜像会升级。</p></article><article class="choice-button"><h3>2 · 固定10页组卡</h3><p>开局10页中有7张基础咒术页，另有火、水、风随机双系的3张元素页。获得新页时可替换、升级或入库，不会自动稀释构筑。</p></article><article class="choice-button"><h3>3 · 自动战斗</h3><p>书页不放回随机，全部翻完后洗回。元素足够时自动完整施法，否则发动残响且不消耗元素；基础页只支付不影响未翻元素页的富余元素。</p></article></div><p><b>方差规则：</b>元素效果保留40%–300%偏态方差；最终伤害和治疗再独立乘95%–105%微方差。</p><p><b>继承规则：</b>章内生命继承，进入下一章前补满。重新进入法师塔时，塔内等级、经验、生命、魔法书、咒语收藏与起始元素重置；积分与场外商店属性永久保留。</p>`);
}
export function bindEvents() {
  document.addEventListener("click", (event) => {
    const view = event.target.closest("[data-view]")?.dataset.view;
    if (view) {
      if (state.battle?.mode === "pve" && state.battle.over && !state.battle.won) {
        showView("battle"); toast("请先确认本轮法师塔的失败结算。"); return;
      }
      showView(view); return;
    }
    const eventId = event.target.closest("[data-event]")?.dataset.event; if (eventId) { resolveEvent(eventId); return; }
    const bind = event.target.closest("[data-bind]")?.dataset.bind;
    if (bind) {
      const card = CARD_BY_ID.get(bind);
      showReplacementModal(card, (outgoingId) => {
        if (replaceBoundPage(bind, outgoingId) !== "replaced") return;
        const outgoing = CARD_BY_ID.get(outgoingId);
        closeModal(true); saveState(); renderGrimoire(); toast(`《${card.name}》已替换《${outgoing.name}》；${outgoing.basePage ? "基础页已回归基础页库" : "旧页保留在仓库"}。`);
      }, true);
      return;
    }
    const unbind = event.target.closest("[data-unbind]")?.dataset.unbind;
    if (unbind && state.organizeTokens > 0) {
      if (organizeBoundPage(unbind) !== "organized") { toast("基础咒术页不需要整理。"); return; }
      state.organizeTokens -= 1; saveState(); renderGrimoire(); toast(`已安全将《${CARD_BY_ID.get(unbind).name}》移入仓库，空位恢复为基础咒术页。`); return;
    }
    const buy = event.target.closest("[data-buy]")?.dataset.buy;
    if (buy) {
      const item = SHOP.find((x) => x.id === buy), price = shopCost(item); if (state.score < price) return;
      state.score -= price; item.apply(); state.meta.passiveLevels[buy] = shopLevel(buy) + 1; saveState(); render(); toast(`${item.name}提升至 Lv.${shopLevel(buy)}。`); return;
    }
    const statusSide = event.target.closest("[data-status-toggle]")?.dataset.statusToggle;
    if (statusSide) { toggleBattleStatusPanel(statusSide); return; }
    if (event.target.closest("[data-battle-finish]")) {
      const { mode, won, reward } = state.battle;
      if (mode === "pve" && !won) { restartAfterPveDefeat(); return; }
      const title = mode === "pvp" ? won ? "镜像对决胜利" : "镜像对决失败" : won ? "元素试炼完成" : "元素试炼失败";
      const copy = won ? `奖励已领取：${reward.exp}经验与${reward.points}积分。${mode === "pve" ? "当前生命在本章继承。" : "镜像疲劳状态已更新。"}` : "本次事件已结束，不获得经验或积分。镜像疲劳状态已更新。";
      completeEvent(title, copy); return;
    }
  });
  $("newRunButton").addEventListener("click", () => showModal('<h2>重新进入法师塔？</h2><p>层数、塔内等级、经验、生命、起始元素、装订方案、咒语收藏和等级都会重置；积分及商店成长保留。系统先生成10张基础咒术页，再从火、水、风随机选2系，以2页＋1页替换其中3页，仓库从0页开始。</p><button class="primary" id="confirmNewRun">确认重开</button>'));
  $("modalContent").addEventListener("click", (event) => { if (event.target.id === "confirmNewRun") newTowerRun(); });
  $("modalClose").addEventListener("click", () => closeModal()); $("modal").addEventListener("click", (event) => { if (event.target === $("modal")) closeModal(); });
  $("helpButton").addEventListener("click", showHelp);
  ["cardSearch", "schoolFilter", "costFilter"].forEach((id) => $(id).addEventListener(id === "cardSearch" ? "input" : "change", renderGrimoire));
  ["archiveSearch", "archiveSchoolFilter"].forEach((id) => $(id).addEventListener(id === "archiveSearch" ? "input" : "change", renderArchive));
  $("battleSpeed").addEventListener("click", cycleBattleSpeed);
  $("battlePause").addEventListener("click", toggleBattlePause);
  $("battleStep").addEventListener("click", stepBattle);
  window.addEventListener("message", (event) => {
    const message = event.data; if (!message || typeof message !== "object") return;
    if (["merlin:load", "merlin:load-remote"].includes(message.type) && message.state) { if (!hydrate(message.state)) { setState(freshState(message.state)); generateEvents(); } runtime.currentView = state.battle ? "battle" : "explore"; render(); if (runtime.currentView === "battle") { renderBattle(); if (!state.battle.over) scheduleBattle(500); } }
    if (message.type === "merlin:new") { setState(freshState()); generateEvents(); runtime.currentView = "explore"; render(); saveState(); }
  });
}
export function init() {
  populateFilters();
  if (!loadLocal()) { setState(freshState()); generateEvents(); }
  if (state.battle) runtime.currentView = "battle";
  bindEvents(); showView(runtime.currentView); saveState();
  if (runtime.currentView === "battle") { renderBattle(); if (!state.battle.over) scheduleBattle(500); }
  if (window.parent !== window) window.parent.postMessage({ type: "merlin:ready" }, "*");
}
init();
