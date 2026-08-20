import { $, ELEMENTS, SCHOOL_ORDER, clamp, esc, fixed, microVariance, pick, randomInt, shuffle, variance } from "./core.js";
import { CARD_BY_ID } from "./cards.js";
import { runtime, state } from "./store.js";
import { attack, cardLevel, costLabel, crit as critStat, defense, dodge, gainExp, hit, levelScale, mainElement, maxHp, poolCap, resist, saveState, schoolLabel } from "./state.js";
import { elementOrb, showView, toast } from "./ui.js";

let battleTimer = null;
let battleSpeed = 1;
let paused = false;

export const MONSTER_PASSIVES = {
  shell: { name: "符文护壳", copy: "抵消下一段直接伤害；4次怪物行动后恢复1次。" },
  windHeal: { name: "噬风再生", copy: "每受到3段命中的直接攻击，恢复6%最大生命。" },
  reverseWater: { name: "逆流诅咒", copy: "玩家治疗失效，并转化为50%自伤。" },
  shieldBreaker: { name: "碎盾尖角", copy: "对护盾伤害翻倍，破盾后下一次攻击提高15%。" },
  lightMirror: { name: "逆辉镜面", copy: "玩家获得强化时积累辉蚀，每层减伤5%。" },
  cleanse: { name: "净化核心", copy: "每3次怪物行动移除最早的一项Debuff。" },
};

function passiveSet(level, boss, finalBoss) {
  const common = ["shell", "windHeal", "shieldBreaker", "lightMirror", "cleanse"];
  const amount = finalBoss ? 3 : boss || level >= 2 ? 2 : 1;
  const result = shuffle(common).slice(0, amount);
  if ((finalBoss || level >= 3) && !result.includes("windHeal") && Math.random() < .5) result[result.length - 1] = "reverseWater";
  return [...new Set(result)];
}

export function createEnemies(mode, spec = {}) {
  const eventLevel = clamp(Number(spec.eventLevel || 1), 1, 3);
  const eventScale = 1 + (eventLevel - 1) * .2;
  if (mode === "pvp") {
    const names = ["灰塔的艾莉亚", "翠风学徒罗伊", "暗月记录者", "赤焰魔导师"];
    const hp = Math.round(maxHp() * eventScale);
    return [{ id: "mirror", name: pick(names), hp, maxHp: hp, atk: attack() * eventScale, def: defense() * eventScale, hit: hit() * eventScale, dodge: dodge() * eventScale, crit: critStat() * eventScale, resist: resist() * eventScale, attackPct: 70, burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, passives: [], actionCount: 0, mirrorStacks: 0, breakBoost: false, icon: "♙" }];
  }
  const boss = Boolean(spec.boss);
  const names = boss ? ["星辉魔像", "深渊典藏官", "六相元素龙"] : ["灰烬小鬼", "结晶魔犬", "风之鸦", "苔石傀儡", "书页幽灵", "虚空信徒"];
  const scale = boss ? 1 : eventScale;
  const hp = Math.round(maxHp() * (boss ? 1 : .6) * scale);
  return [{ id: "enemy-0", name: spec.name || pick(names), hp, maxHp: hp, atk: attack() * (boss ? 1 : .7) * scale, def: defense() * (boss ? 1 : .5) * scale,
    hit: hit() * scale, dodge: dodge() * scale, crit: critStat() * scale, resist: resist() * scale, attackPct: 70,
    burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, passives: passiveSet(eventLevel, boss, spec.finalBoss),
    boss, shellReady: true, shellSpent: false, shellCooldown: 0, shellRefreshes: 0, hitSegments: 0, actionCount: 0, mirrorStacks: 0, breakBoost: false, icon: boss ? "♛" : "♞" }];
}
export function startBattle(mode, restartSpec = null) {
  if (!state.deck.length) { toast("战斗魔法书没有书页，无法开始战斗。"); showView("grimoire"); return; }
  clearTimeout(battleTimer);
  const activeEvent = state.events.find((event) => event.id === state.activeEventId);
  const spec = restartSpec || { mode, chapter: state.chapter, hp: mode === "pvp" ? maxHp() : state.hp, eventLevel: activeEvent?.level || 1, boss: Boolean(activeEvent?.boss), finalBoss: Boolean(activeEvent?.finalBoss), name: activeEvent?.name };
  const enemies = createEnemies(mode, spec);
  state.battle = {
    mode, spec, enemies, playerHp: spec.hp, playerMaxHp: maxHp(), shield: 0,
    elements: state.startElements.slice(0, poolCap()), poolCap: poolCap(),
    drawPile: shuffle(state.deck), discarded: [], cycle: 1, drawnInCycle: 0,
    turn: mode === "pve" ? "player" : (Math.random() < .5 ? "player" : "enemy"),
    enemyCursor: 0, action: 0, logs: [], over: false, won: false, currentCard: null, castType: null,
    player: { heat: 0, tide: 0, wind: 0, light: 0, star: 0, thorns: 0, rock: 0, waterShield: 0, nextWind: 0, damageBuff: 0, windWeight: 0, bookmark: null, attuned: null, recent: [] },
    enemyFatigue: mode === "pvp" ? state.fatigue : null
  };
  paused = false; battleSpeed = 1; addLog(mode === "pve" ? "你抢占先手，魔法书开始随机翻页。" : `${state.battle.turn === "player" ? "你" : "镜像法师"}获得随机先手。`, "good");
  runtime.currentView = "battle"; showView("battle"); renderBattle(); scheduleBattle(650);
}
export function addLog(message, tone = "") {
  const b = state.battle; if (!b) return;
  b.logs.unshift({ n: b.action + 1, message, tone });
  b.logs = b.logs.slice(0, 80);
}
export function countElements(elements = state.battle.elements) {
  return elements.reduce((map, e) => { map[e] = (map[e] || 0) + 1; return map; }, {});
}
export function effectiveCost(card) {
  if (!state.battle.player.attuned || card.cost.type !== "fixed" || !card.cost.amount) return card.cost;
  return fixed({ [state.battle.player.attuned]: card.cost.amount });
}
export function paymentFor(card) {
  const elements = state.battle.elements, c = effectiveCost(card);
  if (c.type === "any") return elements.length >= c.amount ? [...Array(c.amount).keys()] : null;
  if (c.type === "random") return elements.length >= c.amount ? shuffle([...elements.keys()]).slice(0, c.amount).sort((a, b) => a - b) : null;
  if (c.type === "fixed") {
    const indices = [], used = new Set();
    for (const [element, needed] of Object.entries(c.parts || {})) {
      const found = elements.map((e, i) => e === element && !used.has(i) ? i : -1).filter((i) => i >= 0).slice(0, needed);
      if (found.length < needed) return null; found.forEach((i) => { used.add(i); indices.push(i); });
    }
    return indices.sort((a, b) => a - b);
  }
  if (c.type === "all") {
    const allowed = c.parts ? Object.keys(c.parts) : null;
    const counts = countElements();
    if (c.parts && Object.keys(c.parts).some((e) => !counts[e])) return null;
    const indices = elements.map((e, i) => (!allowed || allowed.includes(e)) ? i : -1).filter((i) => i >= 0);
    return indices.length >= c.amount ? indices : null;
  }
  return null;
}
export function spend(indices) {
  const paid = indices.map((i) => state.battle.elements[i]);
  [...indices].sort((a, b) => b - a).forEach((i) => state.battle.elements.splice(i, 1));
  return paid;
}
export function addElement(element, amount = 1) {
  const b = state.battle; let added = 0;
  while (amount-- > 0 && b.elements.length < b.poolCap) { b.elements.push(element); added += 1; }
  return added;
}
export function drawCard() {
  const b = state.battle;
  if (!b.drawPile.length) { b.drawPile = shuffle(state.deck); b.discarded = []; b.drawnInCycle = 0; b.cycle += 1; b.player.attuned = null; addLog(`所有书页翻完，重新洗回，进入第 ${b.cycle} 轮。`); }
  const counts = countElements();
  const missingGeneratorIndex = b.drawPile.findIndex((id) => {
    const card = CARD_BY_ID.get(id); return card?.kind === "generator" && !counts[card.school];
  });
  let index = missingGeneratorIndex >= 0 ? missingGeneratorIndex : Math.floor(Math.random() * b.drawPile.length);
  if (missingGeneratorIndex < 0 && b.player.windWeight > 0) {
    const windIndices = b.drawPile.map((id, i) => { const card = CARD_BY_ID.get(id); return card?.school === "wind" && card.kind !== "generator-large" ? i : -1; }).filter((i) => i >= 0);
    if (windIndices.length && Math.random() < .72) index = pick(windIndices);
    b.player.windWeight = 0;
  }
  const [id] = b.drawPile.splice(index, 1); b.discarded.push(id); b.drawnInCycle += 1;
  return CARD_BY_ID.get(id);
}
export function targetLowest() {
  const alive = state.battle.enemies.filter((e) => e.hp > 0); if (!alive.length) return null;
  const min = Math.min(...alive.map((e) => e.hp)); return pick(alive.filter((e) => e.hp === min));
}
export function hitEnemy(basePct, school, options = {}) {
  const b = state.battle, target = targetLowest(); if (!target) return { damage: 0, crit: false, killed: false };
  const effectiveDef = target.def * (1 - (options.pierce || 0)) * (1 - Math.min(.45, target.erosion * .02));
  const hitChance = options.sureHit ? 1 : 1 - clamp((target.dodge - hit()) / 100, 0, .8);
  if (Math.random() > hitChance) { addLog(`${target.name}闪过了这一击。`); return { damage: 0, crit: false, killed: false }; }
  const critChance = clamp((critStat() - target.resist) / 100 + (options.crit || 0) + Math.min(.25, b.player.heat * .05), 0, .75);
  const crit = Math.random() < critChance;
  const roll = variance();
  let multiplier = 1;
  if (b.player.light > 0) { multiplier += .15; b.player.light -= 1; }
  if (b.player.star > 0) { multiplier += pick([.12, .18, .24]); b.player.star -= 1; }
  if (b.player.damageBuff > 0) { multiplier += b.player.damageBuff; b.player.damageBuff = 0; }
  if (target.vulnerable > 0) multiplier += .12;
  if (target.passives.includes("shell") && target.shellReady) {
    target.shellReady = false; target.shellSpent = true; target.shellCooldown = 4;
    addLog(`${target.name}的符文护壳抵消了这一段直接伤害。`);
    return { damage: 0, crit, killed: false, target, roll };
  }
  multiplier *= 1 - Math.min(.2, Number(target.mirrorStacks || 0) * .05);
  const damage = Math.max(1, Math.round(attack() * basePct / 100 * .25 * roll * microVariance() * (attack() / (attack() + effectiveDef)) * (crit ? 2 : 1) * multiplier));
  const before = target.hp; target.hp = Math.max(0, target.hp - damage);
  if (target.passives.includes("windHeal") && target.hp > 0) {
    target.hitSegments += 1;
    if (target.hitSegments >= 3) { const restored = Math.round(target.maxHp * .06); target.hp = Math.min(target.maxHp, target.hp + restored); target.hitSegments = 0; addLog(`${target.name}触发噬风再生，恢复 ${restored} 生命。`, "bad"); }
  }
  if (target.vulnerable > 0) target.vulnerable -= 1;
  return { damage, crit, killed: before > 0 && target.hp <= 0, target, roll };
}
export function doHits(card, full, hits, pct, options = {}) {
  let total = 0, kills = 0, crits = 0;
  for (let i = 0; i < hits && targetLowest(); i += 1) {
    const result = hitEnemy(pct * levelScale(card.id), card.school, options);
    total += result.damage; kills += result.killed ? 1 : 0; crits += result.crit ? 1 : 0;
    if (result.target && full) {
      if (["burn", "meteor"].includes(card.kind) && card.burn) result.target.burn += card.burn + (cardLevel(card.id) >= 3 ? 1 : 0);
      if (card.kind === "thunder" && Math.random() < .4) result.target.thunder += 1;
    }
  }
  return { total, kills, crits };
}
export function healPlayer(amount) {
  const b = state.battle;
  const finalAmount = Math.max(0, Math.round(amount * .5 * microVariance()));
  const cursed = b.enemies.some((enemy) => enemy.hp > 0 && enemy.passives.includes("reverseWater"));
  if (cursed) {
    let damage = Math.round(finalAmount * .5); const absorbed = Math.min(b.shield, damage); b.shield -= absorbed; damage -= absorbed; b.playerHp = Math.max(0, b.playerHp - damage);
    addLog(`逆流诅咒将治疗转化为 ${damage} 点自伤。`, "bad"); return 0;
  }
  const before = b.playerHp; b.playerHp = Math.min(b.playerMaxHp, b.playerHp + finalAmount); return Math.round(b.playerHp - before);
}

function gainShield(amount) { const shield = Math.max(0, Math.round(amount * .35)); state.battle.shield += shield; return shield; }
export function applyCard(card, full, paid) {
  const b = state.battle, p = b.player, lv = cardLevel(card.id);
  let text = "", hits = typeof card.hits === "number" ? card.hits : Array.isArray(card.hits) ? randomInt(card.hits[0], card.hits[1]) : 1;
  if (!full && card.echoHits) hits = card.echoHits;
  if (!full && Array.isArray(card.hits)) hits = Math.max(1, card.hits[0] - 1);
  if (full && lv >= 3 && hits > 1) hits += 1;
  if (full && p.nextWind && card.school === "wind" && card.pct) { hits += p.nextWind; p.nextWind = 0; }
  if (card.kind === "generator-large") {
    const added = addElement(card.school, card.generatorAmount || 3); text = `补充 ${added} ${ELEMENTS[card.school].name}${added < 3 ? "，其余因元素池已满而溢出" : ""}`;
  } else if (card.kind === "generator") {
    const before = countElements()[card.school] || 0, added = addElement(card.school, before ? 1 : 2);
    if (card.school === "fire") p.damageBuff += .15;
    if (card.school === "water") p.waterShield = Math.min(3, p.waterShield + 1);
    if (card.school === "wind") p.nextWind += 1;
    if (card.school === "earth") gainShield(defense() * .3 * variance());
    if (card.school === "light") { p.light += 1; const mirror = targetLowest(); if (mirror?.passives.includes("lightMirror")) mirror.mirrorStacks = Math.min(4, mirror.mirrorStacks + 1); }
    if (card.school === "dark") targetLowest().curse += 1;
    text = `补充 ${added} ${ELEMENTS[card.school].name}`;
  } else if (card.kind === "wind-index") { p.windWeight = 3; p.nextWind += 1; text = "未翻风系书页的抽取权重提高";
  } else if (card.kind === "bookmark") { gainShield(defense() * .3); p.bookmark = true; text = "获得护盾并记录下一张残响书页";
  } else if (card.kind === "attune") { p.attuned = mainElement(); text = `本轮未翻书页的固定消耗改写为${ELEMENTS[p.attuned].name}`;
  } else if (card.kind === "refill") {
    const main = mainElement(), target = state.startElements.filter((e) => e === main).length;
    const added = addElement(main, Math.min(2, Math.max(0, target - (countElements()[main] || 0)))); text = added ? `补充 ${added} ${ELEMENTS[main].name}` : `未补充元素，改为强化下张${ELEMENTS[main].name}系牌`;
    if (!added) p.damageBuff += .15;
  } else if (["index", "replay"].includes(card.kind)) {
    const legal = b.drawPile.map((id) => CARD_BY_ID.get(id)).filter((c) => c && paymentFor(c) && !["index", "replay", "generator-large"].includes(c.kind));
    if (legal.length) {
      const max = Math.max(...legal.map((c) => c.cost.amount)); const selected = pick(legal.filter((c) => c.cost.amount === max));
      b.drawPile.splice(b.drawPile.indexOf(selected.id), 1); b.drawPile.unshift(selected.id); text = `已将合法候选《${selected.name}》设为下一页`;
    } else { addElement(mainElement(), 1); text = "无合法候选，增加1主元素"; }
  } else if (card.kind.startsWith("total")) {
    const n = full ? paid.length : 0, A = n * 100 * (1 + n / 5);
    if (card.kind === "total-earth") { const shield = gainShield(defense() * (full ? A / 100 : 1.3) * variance()); text = `获得 ${shield} 护盾`; }
    else if (card.kind === "total-light") { p.light += full ? n + 1 : 2; text = `获得 ${full ? n + 1 : 2} 枚圣印`; }
    else if (card.kind === "total-dark") { const target = targetLowest(); target.vulnerable += full ? n + 1 : 2; target.curse = Math.max(target.curse, n); text = `建立 ${full ? n + 1 : 2} 次易伤`; }
    else {
      const pct = full ? Math.max(160, A * (card.school === "hybrid" ? 1.1 : 1)) : (card.echoPct || 150);
      const totalHits = card.kind.includes("wind") || card.id === "HY-14" || card.id === "HY-17" || card.id === "HY-18" ? Math.max(3, n * 2 + 1) : card.kind.includes("water") ? Math.max(2, n + 2) : 1;
      const result = doHits(card, full, totalHits, pct / totalHits);
      if (card.kind.includes("water") || ["HY-13", "HY-14", "HY-18"].includes(card.id)) healPlayer(attack() * .05 * totalHits * variance());
      if (["HY-15", "HY-18"].includes(card.id)) gainShield(defense() * Math.max(1, n) * .55 * variance());
      text = `${totalHits}段共造成 ${result.total} 伤害`;
    }
  } else if (card.kind === "hybrid") {
    const result = card.pct ? doHits(card, full, Math.max(1, hits), full ? card.pct : card.echoPct || Math.max(35, card.pct * .55)) : { total: 0 };
    let healed = 0, shield = 0; const target = targetLowest();
    if (["HY-01", "HY-02", "HY-03", "HY-09", "HY-11"].includes(card.id)) healed = healPlayer(attack() * (full ? .06 : .03) * Math.max(1, hits) * variance());
    if (["HY-04", "HY-07", "HY-09", "HY-11"].includes(card.id)) shield = gainShield(defense() * (full ? 1.7 : .9) * Math.max(1, card.id === "HY-11" ? hits * .2 : 1) * variance());
    if (full && ["HY-01", "HY-04", "HY-05", "HY-10"].includes(card.id) && target) target.burn += card.id === "HY-10" ? Math.min(3, Math.ceil(hits * .3)) : 2;
    if (full && ["HY-05", "HY-10"].includes(card.id)) p.damageBuff += .18;
    if (full && card.id === "HY-06" && target) target.vulnerable += Math.min(6, hits);
    if (full && card.id === "HY-07") p.light += 2;
    if (full && card.id === "HY-08" && target) { p.light += 3; target.curse += 2; target.vulnerable += 2; }
    if (full && ["HY-05", "HY-07", "HY-08", "HY-10"].includes(card.id) && target?.passives.includes("lightMirror")) target.mirrorStacks = Math.min(4, target.mirrorStacks + 1);
    text = [result.total ? `造成 ${result.total} 伤害` : "", healed ? `回复 ${healed} 生命` : "", shield ? `获得 ${shield} 护盾` : "", full ? "同时发动各元素的流派特性" : ""].filter(Boolean).join("，");
  } else if (card.shield || card.echoShield || ["earth", "earth-finisher", "thorn", "thorn-finisher"].includes(card.kind)) {
    let shieldPct = full ? card.shield : card.echoShield;
    if (card.kind === "earth-finisher") { shieldPct += p.rock * 45; p.rock = 0; }
    const shield = gainShield(defense() * shieldPct / 100 * variance() * levelScale(card.id));
    if (full) { p.rock += 1; if (card.kind === "thorn") p.thorns += card.stacks || 1; if (card.kind === "thorn-finisher") p.thorns = Math.min(6, 3 + p.thorns); }
    text = `获得 ${shield} 护盾`;
  } else if (["light", "light-finisher", "star", "star-finisher"].includes(card.kind)) {
    if (card.kind.includes("star")) { const amount = full ? card.stacks || Math.min(6, 3 + p.star) : 1; p.star = card.kind === "star-finisher" ? amount : p.star + amount; text = `获得 ${amount} 层星佑`; }
    else { const amount = full ? card.stacks || Math.min(6, 3 + p.light) : 1; p.light = card.kind === "light-finisher" ? amount : p.light + amount; text = `获得 ${amount} 层辉光/圣印`; }
  } else if (["dark", "dark-mark"].includes(card.kind)) {
    const target = targetLowest(); target.curse += full ? card.stacks || 1 : 0; target.vulnerable += card.kind === "dark-mark" ? (full ? 4 : 2) : 1; text = `施加诅咒与易伤`;
  } else {
    if (card.kind === "water-finisher") hits += p.waterShield; if (card.kind === "tide-finisher") { hits += Math.min(6, p.tide); p.tide = 0; }
    if (card.kind === "wind-finisher") { hits += Math.min(3, Math.floor(p.wind / 2)); p.wind = 0; }
    if (card.kind === "thunder-finisher") { hits += Math.min(6, targetLowest()?.thunder || 0); if (targetLowest()) targetLowest().thunder = 0; }
    let pct = full ? card.pct : card.echoPct;
    if (card.kind === "burn-finisher" && full) { const target = targetLowest(), burn = Math.min(target?.burn || 0, randomInt(1, 3)); pct += burn * 30; if (target) target.burn -= burn; }
    if (card.kind === "meteor" && full) { const target = targetLowest(), burn = target?.burn || 0; pct += burn * 35; if (target) target.burn = 0; }
    if (card.kind === "heat-finisher" && full) { pct += Math.min(5, p.heat) * 40; p.heat = 0; }
    if (card.kind === "dark-finisher" && full) { const target = targetLowest(), curses = target?.curse || 0; pct += curses * 35; if (target) target.curse = 0; }
    if (card.kind === "erosion-finisher" && full) { const target = targetLowest(), erosion = target?.erosion || 0; pct += erosion * 40; if (target) target.erosion = 0; }
    const result = doHits(card, full, Math.max(1, hits), pct || (full ? 90 : 45), { sureHit: card.sureHit, crit: card.crit, pierce: card.pierce });
    if (full && card.kind === "heat") p.heat += card.stacks || 1;
    if (full && card.kind === "tide") p.tide += card.stacks || Math.min(2, Math.round(hits * .4));
    if (full && card.kind === "wind") p.wind += Math.min(3, result.crits);
    if (full && card.kind === "erosion") { const erosionTarget = targetLowest(); if (erosionTarget) erosionTarget.erosion += card.stacks || 1; }
    if (card.heal || ["water", "water-finisher", "tide", "tide-finisher"].includes(card.kind)) {
      const healed = healPlayer(attack() * (card.heal || 4) / 100 * Math.max(1, hits) * variance()); text = `${hits}段共造成 ${result.total} 伤害，回复 ${healed} 生命`;
    } else text = `${hits}段共造成 ${result.total} 伤害${result.crits ? `，${result.crits}段暴击` : ""}`;
    if (full && card.kind === "meteor" && result.kills) { addElement("fire", 1); const candidates = b.drawPile.filter((id) => { const c = CARD_BY_ID.get(id); return c?.school === "fire" && c.cost.amount >= 2 && c.pct; }); if (candidates.length) { const next = pick(candidates); b.drawPile.splice(b.drawPile.indexOf(next), 1); b.drawPile.unshift(next); text += `；击杀接续《${CARD_BY_ID.get(next).name}》`; } }
  }
  if (!full && p.bookmark && card.cost.amount > 0 && !["index", "bookmark"].includes(card.kind)) { p.bookmark = card.id; text += `；已被未竟书签记录`; }
  if (full && typeof p.bookmark === "string" && paymentFor(CARD_BY_ID.get(p.bookmark))) { const retry = CARD_BY_ID.get(p.bookmark); p.bookmark = null; b.drawPile.unshift(retry.id); text += `；书签将《${retry.name}》设为下一页`; }
  if (full && lv >= 6 && card.cost.amount && Math.random() < .2 && paid[0]) { addElement(paid[0], 1); text += `；Lv.6质变返还1${ELEMENTS[paid[0]].name}`; }
  return text;
}
export function playerAction() {
  const b = state.battle, card = drawCard(); b.action += 1; b.currentCard = card;
  const payment = paymentFor(card), full = Boolean(payment); b.castType = full ? "full" : "echo";
  const paid = full ? spend(payment) : [];
  const resultText = applyCard(card, full, paid);
  if (full && !["generator", "generator-large"].includes(card.kind)) b.player.recent.unshift(card.id); b.player.recent = b.player.recent.slice(0, 2);
  addLog(`翻到《${card.name}》，${full ? `消耗${paid.length ? paid.map((e) => ELEMENTS[e].name).join("·") : "0元素"}完整施法` : "元素不足发动残响，不消耗元素"}：${resultText}。`, full ? "good" : "");
  if (b.playerHp <= 0) endBattle(false); else if (!targetLowest()) endBattle(true); else b.turn = "enemy";
}
export function enemyAction() {
  const b = state.battle, alive = b.enemies.filter((e) => e.hp > 0); if (!alive.length) { endBattle(true); return; }
  const enemy = alive[b.enemyCursor % alive.length]; b.enemyCursor += 1; b.action += 1;
  enemy.actionCount += 1;
  if (enemy.shellSpent && !enemy.shellReady && enemy.shellCooldown > 0 && (enemy.boss || enemy.shellRefreshes < 1)) { enemy.shellCooldown -= 1; if (enemy.shellCooldown === 0) { enemy.shellReady = true; enemy.shellSpent = false; enemy.shellRefreshes += 1; addLog(`${enemy.name}重新生成符文护壳。`, "bad"); } }
  if (enemy.mirrorStacks > 0) enemy.mirrorStacks -= 1;
  if (enemy.passives.includes("cleanse") && enemy.actionCount % 3 === 0) {
    if (enemy.burn > 0) enemy.burn = 0; else if (enemy.curse > 0) enemy.curse = 0; else if (enemy.erosion > 0) enemy.erosion = 0; else if (enemy.vulnerable > 0) enemy.vulnerable = 0;
  }
  if (enemy.burn > 0) { const burnDamage = Math.round(attack() * .12 * .25 * enemy.burn * variance() * microVariance()); enemy.hp = Math.max(0, enemy.hp - burnDamage); addLog(`${enemy.name}的 ${enemy.burn} 层灼烧造成 ${burnDamage} 伤害。`, "good"); if (enemy.hp <= 0) { if (!targetLowest()) endBattle(true); else b.turn = "player"; return; } }
  const weakened = 1 - Math.min(.35, enemy.curse * .05 + enemy.erosion * .02);
  const enemyHitChance = 1 - clamp((dodge() - enemy.hit) / 100, 0, .8);
  if (Math.random() > enemyHitChance) { addLog(`${enemy.name}的攻击被你闪避。`, "good"); b.turn = "player"; return; }
  const enemyCrit = Math.random() < clamp((enemy.crit - resist()) / 100, 0, .75);
  let damage = Math.max(1, Math.round(enemy.atk * enemy.attackPct / 100 * .25 * weakened * microVariance() * (enemy.atk / (enemy.atk + defense())) * (enemyCrit ? 2 : 1) * (enemy.breakBoost ? 1.15 : 1)));
  enemy.breakBoost = false;
  const shieldDamage = enemy.passives.includes("shieldBreaker") ? damage * 2 : damage;
  const shieldBefore = b.shield, absorbed = Math.min(b.shield, shieldDamage); b.shield -= absorbed; damage = Math.max(0, damage - absorbed); b.playerHp = Math.max(0, b.playerHp - damage);
  if (shieldBefore > 0 && b.shield <= 0 && enemy.passives.includes("shieldBreaker")) enemy.breakBoost = true;
  let counter = 0;
  if (b.player.thorns > 0) { counter = Math.round(defense() * .48 * .25 * variance() * microVariance()); enemy.hp = Math.max(0, enemy.hp - counter); b.player.thorns -= 1; }
  if (b.shield > 0) b.player.rock = Math.min(6, b.player.rock + 1);
  addLog(`${enemy.name}发动攻击，护盾吸收 ${Math.round(absorbed)}，造成 ${damage} 伤害${counter ? `；棘甲反击 ${counter}` : ""}。`, damage ? "bad" : "");
  if (b.playerHp <= 0) endBattle(false); else if (!targetLowest()) endBattle(true); else b.turn = "player";
}
export function battleTick(manual = false) {
  const b = state.battle; if (!b || b.over || (paused && !manual)) return;
  if (b.turn === "player") playerAction(); else enemyAction();
  renderBattle(); if (!b.over && !paused) scheduleBattle();
}
export function scheduleBattle(delay = 820 / battleSpeed) { clearTimeout(battleTimer); battleTimer = setTimeout(() => battleTick(), delay); }
export function endBattle(won) {
  const b = state.battle; b.over = true; b.won = won; clearTimeout(battleTimer);
  if (b.mode === "pve") state.hp = won ? Math.max(1, b.playerHp) : 1;
  if (b.mode === "pvp") {
    b.enemyFatigue = b.enemies.every((enemy) => enemy.hp <= 0) ? 0 : Math.max(0, b.enemyFatigue - 20);
    if (b.enemyFatigue === 0) {
      const index = state.startElements.length ? Math.floor(Math.random() * state.startElements.length) : -1;
      if (index >= 0) { const old = state.startElements[index], next = pick(SCHOOL_ORDER.slice(0, 6)); state.startElements[index] = next; addLog(`疲劳归零，完成元素交易：${ELEMENTS[old].name}更换为${ELEMENTS[next].name}。`, won ? "good" : "bad"); }
      b.enemyFatigue = 100;
    }
    state.fatigue = b.enemyFatigue;
  }
  if (won) {
    const exp = Math.round(36 + state.floor * 7 + (state.floor % 10 === 0 ? 80 : 0));
    const points = Math.round(24 + state.floor * 5 + (b.mode === "pvp" ? 55 : 0));
    const levels = gainExp(exp); state.score += points; b.reward = { exp, points, levels };
    addLog(`战斗胜利！获得 ${exp} 经验和 ${points} 积分。`, "good");
  } else addLog("你的生命归零，本次战斗失败。", "bad");
  saveState(); renderBattle();
}
export function renderBattle() {
  const b = state.battle; if (!b) return;
  $("battleMode").textContent = b.mode === "pve" ? "PVE · 玩家先手 · 怪物不预告" : `PVP 镜像 · 随机先手 · 疲劳 ${b.enemyFatigue}`;
  $("battleTitle").textContent = b.mode === "pve" ? `${state.floor % 10 === 0 ? "首领" : "元素"}试炼` : "镜像法师对决";
  $("battleSpeed").textContent = `速度 ×${battleSpeed}`; $("battlePause").textContent = paused ? "继续" : "暂停"; $("battleStep").hidden = !paused;
  $("playerBattleStats").innerHTML = `<div class="battle-stat"><span>生命</span><div class="mini-bar"><i style="width:${b.playerHp / b.playerMaxHp * 100}%"></i></div><b>${Math.ceil(b.playerHp)}</b></div><div class="battle-stat"><span>护盾</span><div class="mini-bar"><i style="width:${Math.min(100, b.shield / b.playerMaxHp * 100)}%;background:#68a5cc"></i></div><b>${Math.round(b.shield)}</b></div><div class="battle-stat"><span>法攻</span><div></div><b>${attack()}</b></div>`;
  $("battleElements").innerHTML = [...b.elements.map((e) => elementOrb(e)), ...Array.from({ length: Math.max(0, b.poolCap - b.elements.length) }, () => elementOrb(null, true))].join("");
  const labels = { heat: "炽热", tide: "潮印", wind: "风势", light: "辉光", star: "星佑", thorns: "棘甲", rock: "岩层", waterShield: "水疗盾" };
  $("battleStatuses").innerHTML = Object.entries(labels).filter(([k]) => b.player[k] > 0).map(([k, name]) => `<span class="status-pill">${name} ${b.player[k]}</span>`).join("") || '<span class="status-pill">无状态</span>';
  $("turnRune").textContent = b.over ? "战斗结束" : b.turn === "player" ? "魔法书正在翻页" : "敌方行动";
  if (b.currentCard) {
    const card = b.currentCard; $("currentCard").className = `current-card ${card.school} ${b.over ? "" : "casting"}`;
    $("currentCard").innerHTML = `<span class="card-school">${card.id} · ${schoolLabel(card.school)} · 消耗 ${costLabel(card)}</span><h2>${card.name}</h2><p>${b.castType === "full" ? card.full : card.echo}</p><span class="cast-badge ${b.castType === "echo" ? "echo" : ""}">${b.castType === "full" ? "完整施法" : "残响保底"}</span>`;
  } else { $("currentCard").className = "current-card empty"; $("currentCard").innerHTML = '<span class="card-school">WAITING</span><h2>等待翻页</h2><p>每张书页在本轮只会出现一次。</p>'; }
  $("cycleText").textContent = `第 ${b.cycle} 轮 · ${b.drawnInCycle} / ${state.deck.length}`; $("cycleBar").style.width = `${b.drawnInCycle / Math.max(1, state.deck.length) * 100}%`;
  $("enemyGroupTitle").textContent = b.mode === "pve" ? `塔中敌人 · ${b.enemies.filter((e) => e.hp > 0).length}存活` : `镜像玩家 · 疲劳 ${b.enemyFatigue}`;
  const target = targetLowest();
  $("enemyList").innerHTML = b.enemies.map((e) => `<article class="enemy-card ${target?.id === e.id ? "target" : ""}"><header><b>${e.hp > 0 ? e.icon : "☠"} ${e.name}</b><small>${Math.ceil(e.hp)}/${e.maxHp}</small></header><div class="mini-bar"><i style="width:${e.hp / e.maxHp * 100}%"></i></div><p>${e.hp > 0 ? `法攻 ${Math.round(e.atk)} · 法防 ${Math.round(e.def)} · 灼烧 ${e.burn} · 诅咒 ${e.curse}` : "已击败"}</p>${e.passives?.length ? `<p>${e.passives.map((id) => `<span class="status-pill" title="${MONSTER_PASSIVES[id].copy}">${MONSTER_PASSIVES[id].name}</span>`).join(" ")}</p>` : ""}</article>`).join("");
  $("battleLog").innerHTML = b.logs.map((log) => `<div class="log-entry ${log.tone}"><b>#${log.n}</b><span>${esc(log.message)}</span></div>`).join("");
  $("battleSummary").hidden = !b.over;
  if (b.over) $("battleSummary").innerHTML = b.won ? `<h2>战斗胜利</h2><p>获得 ${b.reward.exp} 经验与 ${b.reward.points} 积分${b.reward.levels ? `，角色提升 ${b.reward.levels} 级` : ""}。</p><button data-battle-finish="win">收取奖励并继续</button>` : `<h2>挑战失败</h2><p>可以立即重新挑战；镜像玩家事件也可以结算失败并继续探索。</p><button data-battle-retry>重新开打</button>${b.mode === "pvp" ? '<button data-battle-finish="loss">接受结果并继续</button>' : ""}<button data-battle-new-run>重开法师塔</button>`;
}

export function stopBattle() {
  paused = false;
  clearTimeout(battleTimer);
}

export function cycleBattleSpeed() {
  battleSpeed = battleSpeed === 1 ? 2 : battleSpeed === 2 ? 4 : 1;
  renderBattle();
  if (!paused) scheduleBattle(100);
}

export function toggleBattlePause() {
  paused = !paused;
  clearTimeout(battleTimer);
  renderBattle();
  if (!paused) scheduleBattle(200);
}

export function stepBattle() { battleTick(true); }

export function restartBattle() {
  if (!state.battle) return;
  startBattle(state.battle.mode, { ...state.battle.spec });
}
