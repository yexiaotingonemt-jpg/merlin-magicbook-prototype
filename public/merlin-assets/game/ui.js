import { $, ELEMENTS, esc } from "./core.js?v=12";
import { CARDS, CARD_BY_ID } from "./cards.js?v=12";
import { EVENTS } from "./content.js?v=12";
import { runtime, state } from "./store.js?v=12";
import { attack, battleRewards, cardLevel, COMBAT_DECK_CAP, costLabel, criticalChance, defense, dodge, evasionChance, expNeed, hit, maxHp, poolCap, resist, schoolLabel, slotCap, crit as critStat } from "./state.js?v=12";

export function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $("toast").hidden = true; }, 2600);
}
export function showModal(html, closable = true) {
  $("modalContent").innerHTML = html;
  $("modalClose").hidden = !closable;
  $("modal").dataset.locked = closable ? "false" : "true";
  $("modal").classList.toggle("decision-modal", html.includes('class="decision-context"'));
  document.body.classList.add("modal-open");
  $("modal").hidden = false;
}
export function closeModal(force = false) {
  if (!force && $("modal").dataset.locked === "true") return false;
  $("modal").hidden = true; document.body.classList.remove("modal-open"); runtime.pendingElement = null;
  return true;
}
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
  if (name !== "battle" && state.battle) { toast(state.battle.over ? "请先确认战斗结果。" : "战斗进行中，请先完成战斗。"); return; }
  runtime.currentView = name;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
export function renderRunStats() {
  $("runStats").innerHTML = `<div class="stat-chip"><span>章节</span><b>${state.chapter}/6</b></div><div class="stat-chip"><span>生命</span><b>${Math.ceil(state.hp)}/${maxHp()}</b></div><div class="stat-chip"><span>积分</span><b>${state.score}</b></div>`;
}
function percent(value) { return `${Math.round(value * 100)}%`; }
export function eventDecisionFacts(event) {
  const timer = event.countdown == null ? "无限；不会自燃" : ["monster", "player"].includes(event.type) ? `${event.countdown}回合后升级` : `${event.countdown}回合后消失`;
  const facts = { timer };
  if (event.type === "experience") Object.assign(facts, { reward: `${42 + state.floor * 5}经验`, risk: "立即结算" });
  if (event.type === "rest") Object.assign(facts, { reward: `回复${Math.min(maxHp() - Math.ceil(state.hp), Math.ceil(maxHp() * .42))}生命`, risk: "不会溢出上限" });
  if (event.type === "element") Object.assign(facts, { reward: "起始元素+1", risk: state.startElements.length >= slotCap() ? "已满，需替换1个" : "可直接增加" });
  if (event.type === "library") Object.assign(facts, { reward: "3选1书页", risk: state.deck.length >= COMBAT_DECK_CAP ? "魔法书已满，进仓库" : "新书页直接装订" });
  if (event.type === "upgrade") Object.assign(facts, { reward: "1张战斗书页+1级", risk: "自由选择" });
  if (event.type === "organize") Object.assign(facts, { reward: "安全整理+1", risk: "移入仓库保留等级" });
  if (event.type === "transmute") Object.assign(facts, { reward: "保留等级与位置", risk: "转为同消耗的其他系" });
  if (event.type === "monster") {
    const level = Number(event.level || 1), scale = 1 + (level - 1) * .2;
    const ratios = event.boss ? "生命100% · 攻防100%" : `生命${Math.round(60 * scale)}% · 攻${Math.round(70 * scale)}% · 防${Math.round(50 * scale)}%`;
    const reward = battleRewards("pve");
    Object.assign(facts, { reward: `${reward.exp}经验 + ${reward.points}积分`, risk: `Lv.${level} · ${ratios}`, combat: `实际闪避${percent(evasionChance(Math.max(0, dodge() - 20), hit()))} · 失败无奖励` });
  }
  if (event.type === "player") {
    const reward = battleRewards("pvp");
    Object.assign(facts, { reward: `${reward.exp}经验 + ${reward.points}积分`, risk: `Lv.${event.level || 1} · 随机先手`, combat: "双方满血 · 败方无奖励" });
  }
  return facts;
}
export function renderExplore() {
  const bossChapter = [3, 6].includes(state.chapter);
  $("floorTitle").textContent = `第 ${state.chapter} 章${bossChapter ? state.chapter === 6 ? " · 终极首领" : " · 首领" : ""}`;
  $("routeHint").textContent = state.activeEventId ? "已选定事件：必须完成后才能继续" : bossChapter ? "可先查看首领信息并调整魔法书" : `事件池剩余 ${state.eventPool.length} · 展示位 ${state.events.length}`;
  $("wizardLevel").textContent = `Lv.${state.level}`;
  const mainAttributes = [
    ["法攻", attack()], ["法防", defense()],
    ["命中", hit(), `标准命中 ${percent(1 - evasionChance(80, hit()))}`],
    ["闪避", dodge(), `标准闪避 ${percent(evasionChance(dodge(), 50))}`],
    ["暴击", critStat(), `标准暴击 ${percent(criticalChance(critStat(), 50))}`],
    ["抗暴", resist(), `标准受暴 ${percent(criticalChance(100, resist()))}`],
  ];
  $("vitalStats").innerHTML = `<div class="stat-line"><span>生命</span><div class="mini-bar"><i style="width:${Math.min(100, state.hp / maxHp() * 100)}%"></i></div><strong>${Math.ceil(state.hp)} / ${maxHp()}</strong></div><div class="combat-attribute-grid main-attribute-grid">${mainAttributes.map(([label, value, actual]) => `<div class="combat-attribute"><span>${label}</span><b>${value}</b>${actual ? `<small>${actual}</small>` : ""}</div>`).join("")}</div>`;
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
  if (state.eventResult) {
    $("eventResult").innerHTML = `<div style="font-size:38px">✦</div><h2>${esc(state.eventResult.title)}</h2><p>${esc(state.eventResult.copy)}</p>`;
  } else {
    const visibleEvents = state.activeEventId ? state.events.filter((event) => event.id === state.activeEventId) : state.events;
    $("eventChoices").classList.toggle("committed", Boolean(state.activeEventId));
    $("eventChoices").innerHTML = visibleEvents.map((event, index) => {
      const meta = EVENTS[event.type];
      const glow = ["#915c72", "#557f9d", "#74668f"][index];
      const timer = event.countdown == null ? "∞" : event.countdown;
      const level = ["monster", "player"].includes(event.type) ? ` · Lv.${event.level}` : "";
      const facts = eventDecisionFacts(event);
      return `<button class="event-card" data-event="${event.id}" style="--event-glow:${glow}"><small>展示位 ${index + 1} · 倒计时 ${timer}${level}</small><span class="event-icon">${meta.icon}</span><h3>${event.name || meta.name}</h3><p>${meta.copy}</p><span class="event-facts">${[["收益", facts.reward], ["代价", facts.risk], ["战斗", facts.combat], ["时限", facts.timer]].filter(([, value]) => value).map(([label, value]) => `<span><em>${label}</em><strong>${value}</strong></span>`).join("")}</span><b>${event.boss ? "立即挑战" : "选择后立即处理"} →</b></button>`;
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
