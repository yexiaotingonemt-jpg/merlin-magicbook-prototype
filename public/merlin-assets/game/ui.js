import { $, ELEMENTS, esc } from "./core.js?v=16";
import { CARDS, CARD_BY_ID } from "./cards.js?v=16";
import { EVENTS } from "./content.js?v=16";
import { runtime, state } from "./store.js?v=16";
import { attack, battleRewards, cardLevel, COMBAT_DECK_CAP, criticalChance, defense, dodge, eventThreatScale, evasionChance, expNeed, hit, LEVEL_UP_HEAL, maxHp, poolCap, resist, schoolLabel, slotCap, theoreticalElementBalance, crit as critStat } from "./state.js?v=16";

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
function costOrb(element, label, icon) {
  return `<span class="spell-cost-orb ${element}" title="${esc(label)}" aria-label="${esc(label)}">${icon}</span>`;
}
export function cardCostHtml(card, compact = false) {
  const cost = card?.cost || { type: "any", amount: 0 };
  let tokens = [];
  if (cost.type === "fixed") {
    tokens = Object.entries(cost.parts || {}).flatMap(([element, amount]) => Array.from({ length: amount }, () => costOrb(element, `${ELEMENTS[element].name}元素`, ELEMENTS[element].icon)));
  } else if (["any", "random"].includes(cost.type)) {
    const label = cost.type === "any" ? "任意元素" : "随机元素";
    const icon = cost.type === "any" ? "✦" : "?";
    tokens = Array.from({ length: cost.amount }, () => costOrb("arcane", label, icon));
  } else if (cost.type === "all") {
    tokens = Object.entries(cost.parts || {}).flatMap(([element, amount]) => Array.from({ length: amount }, () => costOrb(element, `${ELEMENTS[element].name}元素`, ELEMENTS[element].icon)));
    const required = Object.values(cost.parts || {}).reduce((sum, amount) => sum + amount, 0);
    tokens.push(...Array.from({ length: Math.max(0, cost.amount - required) }, () => costOrb("arcane", "任意元素", "✦")));
  }
  const free = !cost.amount ? '<span class="spell-cost-free">零元素</span>' : "";
  const all = cost.type === "all" ? `<span class="spell-cost-rule">全部 ≥${cost.amount}</span>` : "";
  return `<span class="spell-cost${compact ? " compact" : ""}">${free}${tokens.join("")}${all}</span>`;
}
export function cardMetadataHtml(card) {
  const redundantTag = `${ELEMENTS[card.school]?.name || ""}势`;
  const tags = String(card.tags || "").split("·").filter(Boolean);
  if (tags[0] === redundantTag) tags.shift();
  return `<span class="spell-meta ${card.school}">${schoolLabel(card.school)}${tags.length ? ` · ${esc(tags.join("·"))}` : ""}</span>`;
}
export function levelPips(level) { return `<span class="level-pips">${Array.from({ length: 6 }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</span>`; }
export function deckCounts() {
  const counts = {};
  state.deck.forEach((id) => { const s = CARD_BY_ID.get(id)?.school; if (s) counts[s] = (counts[s] || 0) + 1; });
  return counts;
}
function signedElementAmount(amount) { return amount > 0 ? `+${amount}` : String(amount); }
export function elementBalanceHtml(deck = state.deck) {
  const balances = theoreticalElementBalance(deck);
  if (!balances.length) return '<span class="element-balance-empty">暂无可计算的元素系</span>';
  return balances.map(({ element, best, worst }) => {
    const value = best === worst ? signedElementAmount(best) : `${signedElementAmount(best)}~${signedElementAmount(worst)}`;
    const tone = worst >= 0 ? "surplus" : best < 0 ? "deficit" : "variable";
    return `<span class="element-balance-chip ${element} ${tone}"><b>${ELEMENTS[element].icon} ${ELEMENTS[element].name}元素</b><strong>${value}</strong></span>`;
  }).join("");
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
export function expectedBattleHpLoss(event) {
  const level = Number(event.level || 1), pvp = event.type === "player", scale = event.boss ? 1 : eventThreatScale(level);
  const enemyAttack = attack() * (pvp ? scale : (event.boss ? 1 : .7) * scale);
  const enemyHit = pvp ? hit() * scale : hit();
  const enemyCrit = pvp ? critStat() * scale : critStat();
  const hitChance = 1 - evasionChance(dodge(), enemyHit);
  const critMultiplier = 1 + criticalChance(enemyCrit, resist());
  const defenseFactor = enemyAttack / (enemyAttack + defense());
  const baseEnemyDefense = defense() * (pvp || event.boss ? 1 : .5);
  const durationScale = event.boss ? 1 : scale * (attack() + baseEnemyDefense * scale) / (attack() + baseEnemyDefense);
  const expectedEnemyActions = pvp ? 19.5 * durationScale : event.boss ? 19 : Math.max(1, 10 * durationScale - 1);
  return Math.max(0, Math.round(enemyAttack * .7 * .25 * defenseFactor * hitChance * critMultiplier * expectedEnemyActions));
}
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
    const level = Number(event.level || 1), scale = eventThreatScale(level);
    const ratios = event.boss ? "生命100% · 攻防100%" : `生命${Math.round(60 * scale)}% · 攻${Math.round(70 * scale)}% · 防${Math.round(50 * scale)}%`;
    const reward = battleRewards("pve");
    const expectedLoss = expectedBattleHpLoss(event), lethal = expectedLoss >= state.hp;
    Object.assign(facts, { reward: `${reward.exp}经验 + ${reward.points}积分`, risk: `Lv.${level} · ${ratios}`, combat: `预计掉血约${expectedLoss} · 实际闪避${percent(evasionChance(Math.max(0, dodge() - 20), hit()))}`, warning: lethal ? `高风险：当前${Math.ceil(state.hp)}生命，预计可能阵亡` : "估算未计极端方差与特殊被动", lethal });
  }
  if (event.type === "player") {
    const reward = battleRewards("pvp");
    const expectedLoss = expectedBattleHpLoss(event), lethal = expectedLoss >= maxHp();
    Object.assign(facts, { reward: `${reward.exp}经验 + ${reward.points}积分`, risk: `Lv.${event.level || 1} · 随机先手`, combat: `双方满血 · 预计掉血约${expectedLoss}`, warning: lethal ? `高风险：预计掉血达到满血上限${maxHp()}` : "估算未计极端方差与随机先手", lethal });
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
  $("levelPreview").innerHTML = `<div><b>Lv.${nextLevel}</b><span>升级立即回复 ${LEVEL_UP_HEAL} 生命</span></div><ul><li>生命上限 <b>+${maxHp(nextLevel) - maxHp()} → ${maxHp(nextLevel)}</b></li><li>法术攻击 <b>+${attack(nextLevel) - attack()} → ${attack(nextLevel)}</b></li><li>法术防御 <b>+${defense(nextLevel) - defense()} → ${defense(nextLevel)}</b></li><li>起始元素上限 <b>${slotCap()} → ${slotCap(nextLevel)}</b></li><li>战斗元素池 <b>${poolCap()} → ${poolCap(nextLevel)}</b></li></ul>`;
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
      const glow = ["#915c72", "#557f9d", "#74668f"][event.slot ?? index];
      const timer = event.countdown == null ? "∞" : event.countdown;
      const isThreat = ["monster", "player"].includes(event.type);
      const threatLevel = isThreat ? Number(event.level || 1) : 0;
      const facts = eventDecisionFacts(event);
      const timerClass = event.countdown === 1 ? " urgent" : "";
      const factRows = [["收益", facts.reward], ["代价", facts.risk], ["战斗", facts.combat], ["警示", facts.warning], ["时限", facts.timer]];
      const titleClass = isThreat ? ` event-title-level-${threatLevel}` : "";
      const levelLabel = isThreat ? `<span class="event-level-label">Lv.${threatLevel}</span>` : "";
      return `<button class="event-card" data-event="${event.id}" style="--event-glow:${glow}"><span class="event-timer${timerClass}"><span class="event-hourglass" aria-hidden="true">⌛</span><strong>${timer}</strong></span><span class="event-icon">${meta.icon}</span><h3 class="event-title${titleClass}"><span>${event.name || meta.name}</span>${levelLabel}</h3><p>${meta.copy}</p><span class="event-facts">${factRows.filter(([, value]) => value).map(([label, value]) => `<span class="${label === "警示" && facts.lethal ? "event-fact-danger" : ""}"><em>${label}</em><strong>${value}</strong></span>`).join("")}</span><b>${event.boss ? "立即挑战" : "选择后立即处理"} →</b></button>`;
    }).join("");
  }
}
export function cardMatches(card, search, school, costFilter) {
  const q = search.trim().toLowerCase();
  if (q && !`${card.name}${card.tags}`.toLowerCase().includes(q)) return false;
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
  return `<article class="spell-row ${card.school}"><div class="spell-overview">${cardMetadataHtml(card)}<h3>${card.name}</h3>${cardCostHtml(card)}${levelPips(lv)}</div><p><b>完整：</b>${card.full}<br><b>残响：</b>${card.echo}</p>${location === "deck" ? `<button data-unbind="${card.id}" ${canRemove ? "" : "disabled"}>移入仓库</button>` : `<button data-bind="${card.id}" ${deckFull ? "disabled" : ""}>${deckFull ? "已满10页" : "装订"}</button>`}</article>`;
}
export function renderGrimoire() {
  const search = $("cardSearch").value || "";
  const school = $("schoolFilter").value || "all";
  const costF = $("costFilter").value || "all";
  const deckCards = state.deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
  const warehouseCards = Object.keys(state.collection).filter((id) => !state.deck.includes(id)).map((id) => CARD_BY_ID.get(id)).filter(Boolean).filter((c) => cardMatches(c, search, school, costF));
  $("organizeTokens").innerHTML = `安全整理 <b>${state.organizeTokens}</b> 次`;
  $("elementBalance").innerHTML = elementBalanceHtml();
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
    return `<article class="archive-card ${card.school} ${lv ? "" : "locked"}">${cardMetadataHtml(card)}<h3>${card.name}</h3>${cardCostHtml(card)}<p>${card.full}</p><footer><span>${lv ? `Lv.${lv}` : "未学习"}</span></footer></article>`;
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
