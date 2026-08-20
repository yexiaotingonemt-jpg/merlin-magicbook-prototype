import { $, ELEMENTS, esc } from "./core.js?v=8";
import { CARDS, CARD_BY_ID } from "./cards.js?v=8";
import { EVENTS } from "./content.js?v=8";
import { runtime, state } from "./store.js?v=8";
import { attack, cardLevel, COMBAT_DECK_CAP, costLabel, defense, expNeed, maxHp, poolCap, schoolLabel, slotCap } from "./state.js?v=8";

export function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $("toast").hidden = true; }, 2600);
}
export function showModal(html, closable = true) {
  $("modalContent").innerHTML = html;
  $("modalClose").hidden = !closable;
  $("modal").hidden = false;
}
export function closeModal() { $("modal").hidden = true; runtime.pendingElement = null; }
export function elementOrb(element, empty = false) {
  if (empty) return '<span class="element-orb empty">+</span>';
  const colors = { fire: "#e46f46", water: "#4aa8dc", wind: "#77cdbd", earth: "#b08b5d", light: "#f1d56f", dark: "#aa76c7" };
  return `<span class="element-orb" style="--c:${colors[element]}">${ELEMENTS[element].name}</span>`;
}
export function levelPips(level) { return `<span class="level-pips">${Array.from({ length: 6 }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</span>`; }
export function deckCounts() {
  const counts = {};
  state.deck.forEach((id) => { const s = CARD_BY_ID.get(id)?.school; if (s) counts[s] = (counts[s] || 0) + 1; });
  return counts;
}
export function showView(name) {
  if (name !== "battle" && state.battle && !state.battle.over) { toast("战斗进行中，请先完成或暂停战斗。"); return; }
  runtime.currentView = name;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
export function renderRunStats() {
  $("runStats").innerHTML = `<div class="stat-chip"><span>章节</span><b>${state.chapter}/6</b></div><div class="stat-chip"><span>生命</span><b>${Math.ceil(state.hp)}/${maxHp()}</b></div><div class="stat-chip"><span>积分</span><b>${state.score}</b></div>`;
}
export function renderExplore() {
  const bossChapter = [3, 6].includes(state.chapter);
  $("floorTitle").textContent = `第 ${state.chapter} 章${bossChapter ? state.chapter === 6 ? " · 终极首领" : " · 首领" : ""}`;
  $("routeHint").textContent = bossChapter ? "可先查看首领信息并调整魔法书" : `事件池剩余 ${state.eventPool.length} · 展示位 ${state.events.length}`;
  $("wizardLevel").textContent = `Lv.${state.level}`;
  $("vitalStats").innerHTML = [
    ["生命", `${Math.ceil(state.hp)} / ${maxHp()}`, state.hp / maxHp()], ["法攻", attack(), 1], ["法防", defense(), 1]
  ].map(([name, value, ratio]) => `<div class="stat-line"><span>${name}</span><div class="mini-bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div><strong>${value}</strong></div>`).join("");
  $("expBar").firstElementChild.style.width = `${state.exp / expNeed() * 100}%`;
  $("expText").textContent = `经验 ${state.exp} / ${expNeed()}；还需 ${Math.max(0, expNeed() - state.exp)} 点升级。`;
  const nextLevel = state.level + 1;
  $("levelPreview").innerHTML = `<div><b>Lv.${nextLevel}</b><span>升级立即回复 40 生命</span></div><ul><li>生命上限 <b>+${maxHp(nextLevel) - maxHp()} → ${maxHp(nextLevel)}</b></li><li>法术攻击 <b>+${attack(nextLevel) - attack()} → ${attack(nextLevel)}</b></li><li>法术防御 <b>+${defense(nextLevel) - defense()} → ${defense(nextLevel)}</b></li><li>起始元素上限 <b>${slotCap()} → ${slotCap(nextLevel)}</b></li><li>战斗元素池 <b>${poolCap()} → ${poolCap(nextLevel)}</b></li></ul>`;
  $("elementSlotText").textContent = `${state.startElements.length} / ${slotCap()}`;
  $("startElements").innerHTML = [...state.startElements.map((e) => elementOrb(e)), ...Array.from({ length: Math.max(0, slotCap() - state.startElements.length) }, () => elementOrb(null, true))].join("");
  $("deckCount").textContent = `${state.deck.length} 页`;
  const counts = deckCounts();
  $("deckProfile").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<span class="profile-chip ${s}">${schoolLabel(s)} ${n}</span>`).join("");
  $("eventChoices").hidden = Boolean(state.eventResult);
  $("eventResult").hidden = !state.eventResult;
  $("continueButton").hidden = !state.eventResult || state.runComplete;
  if (state.eventResult) {
    $("eventResult").innerHTML = `<div style="font-size:38px">✦</div><h2>${esc(state.eventResult.title)}</h2><p>${esc(state.eventResult.copy)}</p>`;
  } else {
    $("eventChoices").innerHTML = state.events.map((event, index) => {
      const meta = EVENTS[event.type];
      const glow = ["#915c72", "#557f9d", "#74668f"][index];
      const timer = event.countdown == null ? "∞" : event.countdown;
      const level = ["monster", "player"].includes(event.type) ? ` · Lv.${event.level}` : "";
      return `<button class="event-card" data-event="${event.id}" style="--event-glow:${glow}"><small>展示位 ${index + 1} · 倒计时 ${timer}${level}</small><span class="event-icon">${meta.icon}</span><h3>${event.name || meta.name}</h3><p>${meta.copy}</p><b>${event.boss ? "查看信息并挑战" : "处理事件"} →</b></button>`;
    }).join("");
  }
}
export function cardMatches(card, search, school, costFilter) {
  const q = search.trim().toLowerCase();
  if (q && !`${card.id}${card.name}${card.tags}`.toLowerCase().includes(q)) return false;
  if (school !== "all" && card.school !== school) return false;
  if (costFilter && costFilter !== "all") {
    if (costFilter === "all-cost" && card.cost.type !== "all") return false;
    if (costFilter !== "all-cost" && card.cost.amount !== Number(costFilter)) return false;
  }
  return true;
}
export function spellRow(card, location) {
  const lv = cardLevel(card.id);
  const canRemove = state.organizeTokens > 0;
  const deckFull = state.deck.length >= COMBAT_DECK_CAP;
  return `<article class="spell-row ${card.school}"><span class="spell-rune">${card.id}</span><div><h3>${card.name}</h3><small>${schoolLabel(card.school)} · 消耗 ${costLabel(card)}</small>${levelPips(lv)}</div><p><b>完整：</b>${card.full}<br><b>残响：</b>${card.echo}</p>${location === "deck" ? `<button data-unbind="${card.id}" ${canRemove ? "" : "disabled"}>移入仓库</button>` : `<button data-bind="${card.id}" ${deckFull ? "disabled" : ""}>${deckFull ? "已满10页" : "装订"}</button>`}</article>`;
}
export function renderGrimoire() {
  const search = $("cardSearch").value || "";
  const school = $("schoolFilter").value || "all";
  const costF = $("costFilter").value || "all";
  const deckCards = state.deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
  const warehouseCards = Object.keys(state.collection).filter((id) => !state.deck.includes(id)).map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
  $("organizeTokens").innerHTML = `安全整理 <b>${state.organizeTokens}</b> 次`;
  $("combatDeckCount").textContent = `${state.deck.length} / ${COMBAT_DECK_CAP} 页`;
  $("warehouseCount").textContent = `${Object.keys(state.collection).length - state.deck.length} 页`;
  $("combatDeckCards").innerHTML = deckCards.map((c) => spellRow(c, "deck")).join("") || '<p class="empty-copy">没有符合条件的战斗书页。</p>';
  $("warehouseCards").innerHTML = warehouseCards.map((c) => spellRow(c, "warehouse")).join("") || '<p class="empty-copy">仓库中没有符合条件的书页。</p>';
}
export function renderArchive() {
  const search = $("archiveSearch").value || "";
  const school = $("archiveSchoolFilter").value || "all";
  const filtered = CARDS.filter((c) => cardMatches(c, search, school));
  $("catalogProgress").innerHTML = `已学 <b>${Object.keys(state.collection).length}</b> / ${CARDS.length}`;
  $("archiveGrid").innerHTML = filtered.map((card) => {
    const lv = cardLevel(card.id);
    return `<article class="archive-card ${card.school} ${lv ? "" : "locked"}"><span class="spell-rune">${card.id}</span><h3>${card.name}</h3><p><b>${costLabel(card)}</b> · ${card.tags}</p><p>${card.full}</p><footer><span>${schoolLabel(card.school)}</span><span>${lv ? `Lv.${lv}` : "未学习"}</span></footer></article>`;
  }).join("");
}
export const SHOP = [
  { id: "attack", icon: "✦", name: "法攻手稿", copy: "永久提高4点基础法术攻击。", base: 100, apply: () => { state.meta.attack += 4; } },
  { id: "defense", icon: "◈", name: "护法铭文", copy: "永久提高2点基础法术防御。", base: 100, apply: () => { state.meta.defense += 2; } },
  { id: "maxHp", icon: "♥", name: "生命秘典", copy: "永久提高10点最大生命，并立即回复10点。", base: 100, apply: () => { state.meta.maxHp += 10; state.hp += 10; } }
];
export function shopLevel(id) { return Number(state.meta.passiveLevels?.[id] || 0); }
export function shopCost(item) { return Math.round(item.base * (1 + shopLevel(item.id) * .55)); }
export function renderShop() {
  $("shopScore").textContent = state.score;
  $("shopGrid").innerHTML = SHOP.map((item) => {
    const level = shopLevel(item.id), price = shopCost(item);
    return `<article class="shop-item"><span class="shop-icon">${item.icon}</span><h2>${item.name}</h2><p>${item.copy}</p><p>Lv.${level} · 下次价格 ${price}</p><button data-buy="${item.id}" ${state.score < price ? "disabled" : ""}>兑换 · ${price} 积分</button></article>`;
  }).join("");
}
export function render() {
  renderRunStats();
  if (runtime.currentView === "explore") renderExplore();
  if (runtime.currentView === "grimoire") renderGrimoire();
  if (runtime.currentView === "archive") renderArchive();
  if (runtime.currentView === "shop") renderShop();
}
