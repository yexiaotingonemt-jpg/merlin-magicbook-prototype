import { $, ELEMENTS, SCHOOL_ORDER, clamp, esc, fixed, microVariance, pick, randomInt, shuffle, variance } from "./core.js?v=14";
import { CARD_BY_ID } from "./cards.js?v=14";
import { runtime, state } from "./store.js?v=14";
import { attack, battleRewards, cardLevel, costLabel, crit as critStat, criticalChance, defense, dodge, eventThreatScale, evasionChance, gainExp, hit, levelScale, mainElement, maxHp, poolCap, resist, saveState, schoolLabel } from "./state.js?v=14";
import { elementOrb, renderRunStats, showView, toast } from "./ui.js?v=14";

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

export const PLAYER_STATUS_INFO = {
  heat: { name: "炽热", copy: "每层使直接攻击的暴击率提高5个百分点，最多计入5层；熔核终结牌会消耗它追加伤害。" },
  tide: { name: "潮印", copy: "回潮流派的积累状态；回潮终结牌会消耗潮印并追加攻击与治疗次数。" },
  wind: { name: "风势", copy: "风系攻击暴击时积累；风势终结牌每2层追加1段攻击，最多追加3段。" },
  light: { name: "辉光", copy: "下一次造成直接伤害时，每次消耗1层并使该次伤害提高15%。" },
  star: { name: "星佑", copy: "下一次造成直接伤害时消耗1层，并随机提高12%、18%或24%伤害。" },
  thorns: { name: "棘甲", copy: "受到敌方直接攻击后消耗1层，并按照自身法术防御造成反击伤害。" },
  rock: { name: "岩层", copy: "护盾承受攻击后积累；大地终结牌会消耗岩层追加护盾或反击效果。" },
  waterShield: { name: "水疗盾", copy: "水系终结牌会根据层数追加攻击与治疗段数。" },
  damageBuff: { name: "伤害强化", copy: "下一段直接伤害结算时消耗，并提高该段最终伤害。", percent: true },
  nextWind: { name: "追风", copy: "下一张风系攻击牌完整施法时消耗，并追加攻击段数。" },
  bookmark: { name: "未竟书签", copy: "记录下一张发动残响的书页；元素足够时把该页设为后续指定页。", flag: true },
  attuned: { name: "元素同调", copy: "本轮尚未翻出的固定元素消耗被改写为当前主元素。", flag: true },
};

const ENEMY_STATUS_INFO = {
  burn: { name: "灼烧", copy: "敌方行动前受到持续伤害。", tone: "debuff" },
  curse: { name: "诅咒", copy: "降低该敌人的攻击输出，并可被暗系终结牌消耗。", tone: "debuff" },
  thunder: { name: "雷印", copy: "由雷鸣流派积累，可被雷鸣终结牌消耗并追加雷击。", tone: "debuff" },
  erosion: { name: "蚀痕", copy: "降低有效法术防御，并可被影蚀终结牌消耗。", tone: "debuff" },
  vulnerable: { name: "易伤", copy: "后续直接伤害提高12%，每次受到直接伤害后减少1层。", tone: "debuff" },
  mirrorStacks: { name: "辉蚀", copy: "每层使该敌人受到的直接伤害降低5%，最多4层。", tone: "buff" },
};

function sentence(text) {
  const copy = String(text || "无额外效果").trim().replace(/[。；]+$/, "");
  return `${copy}。`;
}

function naturalEffect(card, effect, castType) {
  const schoolName = ELEMENTS[card.school]?.name;
  if (card.kind === "generator" && schoolName) {
    const suffix = String(card.full).split("并").slice(1).join("并") || `强化下一张${schoolName}系牌`;
    return `翻到此页魔法咒语时，若当前没有${schoolName}元素，则增加2个${schoolName}元素；否则增加1个${schoolName}元素，并${sentence(suffix)}`;
  }
  if (card.kind === "generator-large" && schoolName) return `翻到此页魔法咒语时，增加${card.generatorAmount || 3}个${schoolName}元素；本页只参与正常随机翻页，不能被检索、重演或书签指定。`;
  let copy = String(effect || "无额外效果");
  const pct = castType === "full" ? Number(card.pct || 0) : Number(card.echoPct || 0);
  if (pct > 0 && !copy.includes("%")) {
    const hits = castType === "echo" && card.echoHits ? card.echoHits : card.hits;
    const hitCopy = Array.isArray(hits)
      ? `发动${hits[0]}–${hits[1]}段攻击，每段造成${pct}%伤害`
      : Number(hits || 1) > 1
        ? `发动${hits}段攻击，每段造成${pct}%伤害`
        : `造成${pct}%伤害`;
    copy = `${hitCopy}；${copy}`;
  }
  copy = copy.replace(/^(\d+(?:–\d+)?)段(\d+)%伤害/, "发动$1段攻击，每段造成$2%伤害");
  copy = copy.replace(/^(\d+)%伤害/, "造成$1%伤害");
  return `翻到此页魔法咒语并${castType === "full" ? "完整施法" : "发动残响"}时，${sentence(copy)}`;
}

function paymentRule(card) {
  const cost = card.cost;
  if (!cost.amount) return "本页消耗0元素，翻到后自动完整施法。";
  if (cost.type === "fixed") return `完整施法需要${costLabel(card)}；满足时系统自动支付对应元素。`;
  if (cost.type === "any") return `完整施法需要${cost.amount}个任意元素，并按照元素池从左到右自动支付。`;
  if (cost.type === "random") return `完整施法需要元素池中至少有${cost.amount}个元素，并从已占用槽位中随机支付${cost.amount}个。`;
  return `完整施法需要达到${costLabel(card)}的门槛；满足时消耗卡面指定范围内的全部剩余元素。`;
}

export function expandedCardEffects(card) {
  const noEcho = !card.cost.amount || card.echo === "无残响";
  const attackTotals = new Set(["total", "total-water", "total-wind", "total-all", "total-hybrid"]);
  const enemyEffects = new Set(["dark", "dark-mark", "dark-finisher", "erosion", "erosion-finisher", "total-dark"]);
  const attacksEnemy = Boolean(card.pct || card.echoPct || card.hits || attackTotals.has(card.kind));
  return {
    payment: paymentRule(card),
    full: naturalEffect(card, card.full, "full"),
    echo: noEcho ? "本页不会发动残响。" : `元素不足时不消耗任何元素。${naturalEffect(card, card.echo, "echo")}`,
    targeting: card.targeting || (attacksEnemy
      ? "攻击自动选择当前生命最低的敌人；多段攻击每段重新检查，击杀后自动更换目标。"
      : enemyEffects.has(card.kind)
        ? "负面效果自动选择当前生命最低的敌人，目标死亡后重新选择。"
        : "本页作用于自身或魔法书，不主动选择敌方目标。"),
  };
}

export function enemyBasicPage(enemy, mode = "pve") {
  return {
    id: mode === "pvp" ? "MI-ATK" : "NPC-ATK",
    name: mode === "pvp" ? "镜像基础术式" : "普通攻击",
    school: mode === "pvp" ? "arcane" : "dark",
    cost: { type: "any", amount: 0 },
    tags: mode === "pvp" ? "镜像魔法书·基础结算页" : "无魔法书·无附加卡牌效果",
    full: `造成${enemy.attackPct}%法术攻击的直接伤害；本攻击页不附带额外卡牌效果`,
    echo: "无残响",
    targeting: "攻击自动作用于对方当前生命最低的战斗单位。",
  };
}

function passiveSet(level, boss, finalBoss) {
  const common = ["shell", "windHeal", "shieldBreaker", "lightMirror", "cleanse"];
  const amount = finalBoss ? 3 : boss || level >= 2 ? 2 : 1;
  const result = shuffle(common).slice(0, amount);
  if ((finalBoss || level >= 3) && !result.includes("windHeal") && Math.random() < .5) result[result.length - 1] = "reverseWater";
  return [...new Set(result)];
}

export function createEnemies(mode, spec = {}) {
  const eventLevel = clamp(Number(spec.eventLevel || 1), 1, 3);
  const eventScale = eventThreatScale(eventLevel);
  if (mode === "pvp") {
    const names = ["灰塔的艾莉亚", "翠风学徒罗伊", "暗月记录者", "赤焰魔导师"];
    const hp = Math.round(maxHp() * eventScale);
    return [{ id: "mirror", name: pick(names), hp, maxHp: hp, shield: 0, atk: attack() * eventScale, def: defense() * eventScale, hit: hit() * eventScale, dodge: dodge() * eventScale, crit: critStat() * eventScale, resist: resist() * eventScale, attackPct: 70, elements: state.startElements.slice(0, poolCap()), book: state.deck.slice(), burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, passives: [], actionCount: 0, mirrorStacks: 0, breakBoost: false, icon: "♙" }];
  }
  const boss = Boolean(spec.boss);
  const names = boss ? ["星辉魔像", "深渊典藏官", "六相元素龙"] : ["灰烬小鬼", "结晶魔犬", "风之鸦", "苔石傀儡", "书页幽灵", "虚空信徒"];
  const scale = boss ? 1 : eventScale;
  const hp = Math.round(maxHp() * (boss ? 1 : .6) * scale);
  return [{ id: "enemy-0", name: spec.name || pick(names), hp, maxHp: hp, shield: 0, atk: attack() * (boss ? 1 : .7) * scale, def: defense() * (boss ? 1 : .5) * scale,
    hit: hit(), dodge: Math.max(0, dodge() - 20), crit: critStat(), resist: resist(), attackPct: 70,
    elements: [], book: [], burn: 0, curse: 0, thunder: 0, erosion: 0, vulnerable: 0, passives: passiveSet(eventLevel, boss, spec.finalBoss),
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
    enemyCursor: 0, action: 0, logs: [], over: false, won: false, currentCard: null, enemyCurrentCard: enemyBasicPage(enemies[0], mode), castType: null,
    statusPanels: { player: false, enemy: false },
    player: { heat: 0, tide: 0, wind: 0, light: 0, star: 0, thorns: 0, rock: 0, waterShield: 0, nextWind: 0, damageBuff: 0, windWeight: 0, bookmark: null, attuned: null, recent: [] },
    enemyFatigue: mode === "pvp" ? state.fatigue : null
  };
  paused = false; battleSpeed = 1; addLog(mode === "pve" ? "你抢占先手，魔法书开始随机翻页。" : `${state.battle.turn === "player" ? "你" : "镜像法师"}获得随机先手。`, "good");
  runtime.currentView = "battle"; saveState(); showView("battle"); renderBattle(); scheduleBattle(650);
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
  const hitChance = options.sureHit ? 1 : 1 - evasionChance(target.dodge, hit());
  if (Math.random() > hitChance) { addLog(`${target.name}闪过了这一击。`); return { damage: 0, crit: false, killed: false }; }
  const critChance = criticalChance(critStat(), target.resist, (options.crit || 0) + Math.min(.25, b.player.heat * .05));
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
  return {
    damage: Math.min(before, damage),
    rolledDamage: damage,
    overkill: Math.max(0, damage - before),
    crit,
    killed: before > 0 && target.hp <= 0,
    target,
    roll,
  };
}

export function adjustedSegmentPct(card, full, basePct, loneAtCast, landedHits = 0, target = null) {
  if (!full || !loneAtCast) return basePct;
  let pct = Number.isFinite(card.lonePct) ? card.lonePct : basePct;
  if (card.loneRamp) pct *= 1 + landedHits * card.loneRamp;
  if (card.loneBonus && (!card.loneThreshold || (target && target.hp / target.maxHp <= card.loneThreshold))) pct *= 1 + card.loneBonus;
  return pct;
}

export function doHits(card, full, hits, pct, options = {}) {
  const startedTargets = state.battle.enemies.filter((enemy) => enemy.hp > 0).length;
  const loneAtCast = startedTargets === 1;
  let total = 0, kills = 0, crits = 0, landedHits = 0, singleTargetBonus = false;
  for (let i = 0; i < hits && targetLowest(); i += 1) {
    const target = targetLowest();
    const segmentPct = adjustedSegmentPct(card, full, pct, loneAtCast, landedHits, target);
    if (segmentPct !== pct) singleTargetBonus = true;
    const result = hitEnemy(segmentPct * levelScale(card.id), card.school, options);
    total += result.damage; kills += result.killed ? 1 : 0; crits += result.crit ? 1 : 0;
    if (result.damage > 0) landedHits += 1;
    if (full && result.killed && result.overkill > 0 && ["HY-12", "CO-20"].includes(card.id)) {
      const nextTarget = targetLowest();
      if (nextTarget) {
        const transfer = Math.min(result.overkill, Math.round(result.rolledDamage * .5), nextTarget.hp);
        if (transfer > 0) {
          nextTarget.hp -= transfer;
          total += transfer;
          if (nextTarget.hp <= 0) kills += 1;
          addLog(`溢出伤害转移至${nextTarget.name}，造成 ${transfer} 伤害。`, "good");
        }
      }
    }
    if (result.target && full) {
      if (["burn", "meteor"].includes(card.kind) && card.burn) result.target.burn += card.burn + (cardLevel(card.id) >= 3 ? 1 : 0);
      if (card.kind === "thunder" && Math.random() < .4) result.target.thunder += 1;
    }
  }
  return { total, kills, crits, landedHits, startedTargets, loneAtCast, singleTargetBonus };
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
      text = `${totalHits}段共造成 ${result.total} 伤害${result.singleTargetBonus ? "，触发单目标聚焦" : ""}`;
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
    } else text = `${hits}段共造成 ${result.total} 伤害${result.crits ? `，${result.crits}段暴击` : ""}${result.singleTargetBonus ? "，触发单目标补偿" : ""}`;
    if (full && card.kind === "meteor" && result.kills && targetLowest()) { addElement("fire", 1); const candidates = b.drawPile.filter((id) => { const c = CARD_BY_ID.get(id); return c?.school === "fire" && c.cost.amount >= 2 && c.pct; }); if (candidates.length) { const next = pick(candidates); b.drawPile.splice(b.drawPile.indexOf(next), 1); b.drawPile.unshift(next); text += `；击杀接续《${CARD_BY_ID.get(next).name}》`; } }
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
  b.enemyCurrentCard = enemyBasicPage(enemy, b.mode);
  enemy.actionCount += 1;
  if (enemy.shellSpent && !enemy.shellReady && enemy.shellCooldown > 0 && (enemy.boss || enemy.shellRefreshes < 1)) { enemy.shellCooldown -= 1; if (enemy.shellCooldown === 0) { enemy.shellReady = true; enemy.shellSpent = false; enemy.shellRefreshes += 1; addLog(`${enemy.name}重新生成符文护壳。`, "bad"); } }
  if (enemy.mirrorStacks > 0) enemy.mirrorStacks -= 1;
  if (enemy.passives.includes("cleanse") && enemy.actionCount % 3 === 0) {
    if (enemy.burn > 0) enemy.burn = 0; else if (enemy.curse > 0) enemy.curse = 0; else if (enemy.erosion > 0) enemy.erosion = 0; else if (enemy.vulnerable > 0) enemy.vulnerable = 0;
  }
  if (enemy.burn > 0) { const burnDamage = Math.round(attack() * .12 * .25 * enemy.burn * variance() * microVariance()); enemy.hp = Math.max(0, enemy.hp - burnDamage); addLog(`${enemy.name}的 ${enemy.burn} 层灼烧造成 ${burnDamage} 伤害。`, "good"); if (enemy.hp <= 0) { if (!targetLowest()) endBattle(true); else b.turn = "player"; return; } }
  const weakened = 1 - Math.min(.35, enemy.curse * .05 + enemy.erosion * .02);
  const enemyHitChance = 1 - evasionChance(dodge(), enemy.hit);
  if (Math.random() > enemyHitChance) { addLog(`${enemy.name}的攻击被你闪避。`, "good"); b.turn = "player"; return; }
  const enemyCrit = Math.random() < criticalChance(enemy.crit, resist());
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
    const { exp, points } = battleRewards(b.mode);
    const levels = gainExp(exp); state.score += points; b.reward = { exp, points, levels };
    addLog(`战斗胜利！获得 ${exp} 经验和 ${points} 积分。`, "good");
  } else addLog("你的生命归零，本次战斗失败。", "bad");
  saveState(); renderRunStats(); renderBattle();
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function combatStatsHtml(actor, opponent, critBonus = 0) {
  const attributes = [
    ["法攻", actor.atk],
    ["法防", actor.def],
    ["命中", actor.hit, `实际 ${percent(1 - evasionChance(opponent.dodge, actor.hit))}`],
    ["闪避", actor.dodge, `实际 ${percent(evasionChance(actor.dodge, opponent.hit))}`],
    ["暴击", actor.crit, `实际 ${percent(criticalChance(actor.crit, opponent.resist, critBonus))}`],
    ["抗暴", actor.resist, `受暴 ${percent(criticalChance(opponent.crit, actor.resist))}`],
  ];
  return `<div class="battle-vitals"><div class="battle-stat"><span>生命</span><div class="mini-bar"><i style="width:${clamp(actor.hp / Math.max(1, actor.maxHp) * 100, 0, 100)}%"></i></div><b>${Math.ceil(actor.hp)}/${Math.ceil(actor.maxHp)}</b></div><div class="battle-stat"><span>护盾</span><div class="mini-bar"><i style="width:${clamp(actor.shield / Math.max(1, actor.maxHp) * 100, 0, 100)}%;background:#68a5cc"></i></div><b>${Math.round(actor.shield)}</b></div></div><div class="combat-attribute-grid">${attributes.map(([label, value, actual]) => `<div class="combat-attribute"><span>${label}</span><b>${Math.round(value)}</b>${actual ? `<small>${actual}</small>` : ""}</div>`).join("")}</div>`;
}

function playerStatusItems(b) {
  const items = Object.entries(PLAYER_STATUS_INFO).flatMap(([key, info]) => {
    const raw = b.player[key];
    if (!raw) return [];
    let value = info.flag ? "生效中" : info.percent ? `${Math.round(raw * 100)}%` : raw;
    if (key === "attuned") value = `${ELEMENTS[raw]?.name || raw}系`;
    if (key === "bookmark" && typeof raw === "string") value = CARD_BY_ID.get(raw)?.name || raw;
    return [{ ...info, value, tone: "buff" }];
  });
  if (b.enemies.some((enemy) => enemy.hp > 0 && (enemy.passives || []).includes("reverseWater"))) items.push({ name: "逆流诅咒", value: "生效中", copy: MONSTER_PASSIVES.reverseWater.copy, tone: "debuff" });
  return items;
}

function enemyStatusItems(enemy) {
  if (!enemy) return [];
  const passives = (enemy.passives || []).map((id) => ({ name: MONSTER_PASSIVES[id].name, value: "被动", copy: MONSTER_PASSIVES[id].copy, tone: "passive" }));
  const states = Object.entries(ENEMY_STATUS_INFO).flatMap(([key, info]) => enemy[key] > 0 ? [{ ...info, value: enemy[key] }] : []);
  return [...passives, ...states];
}

function statusPanelHtml(items, side, open) {
  const chips = items.length ? items.map((item) => `<span class="status-pill ${item.tone}">${esc(item.name)} ${esc(item.value)}</span>`).join("") : '<span class="status-pill">无BUFF/DEBUFF</span>';
  const details = items.length ? items.map((item) => `<article class="status-detail ${item.tone}"><header><b>${esc(item.name)}</b><span>${esc(item.value)}</span></header><p>${esc(item.copy)}</p></article>`).join("") : '<p class="empty-status-copy">当前没有持续状态。</p>';
  return `<div class="status-overview"><span class="combat-side-label">BUFF / DEBUFF</span><div class="status-pills">${chips}</div><button class="status-toggle" data-status-toggle="${side}">${open ? "收起详细信息" : "查看详细信息"}</button></div><div class="status-detail-list" ${open ? "" : "hidden"}>${details}</div>`;
}

function spellPageHtml(card, castType = "full") {
  const effects = expandedCardEffects(card);
  const fullActive = castType === "full";
  const echoActive = castType === "echo";
  return `<span class="card-school">${esc(card.id)} · ${schoolLabel(card.school)} · 消耗 ${costLabel(card)}</span><h2>${esc(card.name)}</h2><p class="spell-tags">${esc(card.tags)}</p><div class="spell-rules"><p class="payment-copy">${esc(effects.payment)}</p><section class="effect-row ${fullActive ? "active" : ""}"><b>完整施法</b><p>${esc(effects.full)}</p></section><section class="effect-row ${echoActive ? "active echo" : ""}"><b>残响</b><p>${esc(effects.echo)}</p></section><section class="effect-row targeting"><b>目标</b><p>${esc(effects.targeting)}</p></section></div><span class="cast-badge ${echoActive ? "echo" : ""}">${fullActive ? "本次：完整施法" : echoActive ? "本次：残响保底" : "攻击页"}</span>`;
}

export function renderBattle() {
  const b = state.battle; if (!b) return;
  $("battleMode").textContent = b.mode === "pve" ? "PVE · 玩家先手 · 怪物不预告" : `PVP 镜像 · 随机先手 · 疲劳 ${b.enemyFatigue}`;
  $("battleTitle").textContent = b.mode === "pve" ? `${state.floor % 10 === 0 ? "首领" : "元素"}试炼` : "镜像法师对决";
  $("battleSpeed").textContent = `速度 ×${battleSpeed}`; $("battlePause").textContent = paused ? "继续" : "暂停"; $("battleStep").hidden = !paused;
  const target = targetLowest();
  const inspectedEnemy = target || b.enemies[0];
  const playerStats = { hp: b.playerHp, maxHp: b.playerMaxHp, shield: b.shield, atk: attack(), def: defense(), hit: hit(), dodge: dodge(), crit: critStat(), resist: resist() };
  $("playerBattleStats").innerHTML = inspectedEnemy ? combatStatsHtml(playerStats, inspectedEnemy, Math.min(.25, b.player.heat * .05)) : "";
  $("battleElements").innerHTML = [...b.elements.map((e) => elementOrb(e)), ...Array.from({ length: Math.max(0, b.poolCap - b.elements.length) }, () => elementOrb(null, true))].join("");
  $("battleStatuses").innerHTML = statusPanelHtml(playerStatusItems(b), "player", b.statusPanels?.player);
  $("turnRune").textContent = b.over ? "战斗结束" : b.turn === "player" ? "魔法书正在翻页" : "敌方行动";
  if (b.currentCard) {
    const card = b.currentCard; $("currentCard").className = `current-card ${card.school} ${b.over ? "" : "casting"}`;
    $("currentCard").innerHTML = spellPageHtml(card, b.castType);
  } else { $("currentCard").className = "current-card empty"; $("currentCard").innerHTML = '<span class="card-school">WAITING</span><h2>等待翻页</h2><p>我方每张书页在本轮只会出现一次；翻出后会在这里同时显示完整施法、残响、支付条件和目标规则。</p>'; }
  $("playerBookCount").textContent = `${state.deck.length}页`;
  $("cycleText").textContent = `第 ${b.cycle} 轮 · ${b.drawnInCycle} / ${state.deck.length}`; $("cycleBar").style.width = `${b.drawnInCycle / Math.max(1, state.deck.length) * 100}%`;
  $("enemyGroupTitle").textContent = inspectedEnemy?.name || "塔中敌人";
  $("enemyPortrait").textContent = inspectedEnemy?.hp > 0 ? inspectedEnemy.icon : "☠";
  $("enemyBattleStats").innerHTML = inspectedEnemy ? combatStatsHtml({ ...inspectedEnemy, shield: inspectedEnemy.shield || 0 }, playerStats) : "";
  $("enemyBattleElements").innerHTML = inspectedEnemy?.elements?.length ? inspectedEnemy.elements.map((e) => elementOrb(e)).join("") : '<span class="no-element-copy">无元素</span>';
  $("enemyBattleStatuses").innerHTML = statusPanelHtml(enemyStatusItems(inspectedEnemy), "enemy", b.statusPanels?.enemy);
  $("enemyList").innerHTML = `<span class="combat-side-label">目标列表 · ${b.enemies.filter((e) => e.hp > 0).length}存活</span>${b.enemies.map((e) => `<article class="enemy-card ${target?.id === e.id ? "target" : ""}"><header><b>${e.hp > 0 ? e.icon : "☠"} ${esc(e.name)}</b><small>${Math.ceil(e.hp)}/${e.maxHp}</small></header><div class="mini-bar"><i style="width:${e.hp / e.maxHp * 100}%"></i></div></article>`).join("")}`;
  const enemyPage = b.enemyCurrentCard || enemyBasicPage(inspectedEnemy, b.mode);
  $("enemyCurrentCard").className = `current-card enemy-current-card ${enemyPage.school} ${b.turn === "enemy" && !b.over ? "casting" : ""}`;
  $("enemyCurrentCard").innerHTML = spellPageHtml(enemyPage, "page");
  const enemyBook = inspectedEnemy?.book || [];
  $("enemyBookCount").textContent = b.mode === "pvp" ? `${enemyBook.length}页快照` : "无魔法书";
  $("enemyBookNote").innerHTML = b.mode === "pvp" ? `<details><summary>查看敌方装订书页</summary><p>${enemyBook.map((id) => esc(CARD_BY_ID.get(id)?.name || id)).join("、") || "没有可识别书页"}</p><small>当前镜像战斗仍使用快照属性与基础术式结算；书页效果将在后续战斗规则中接入。</small></details>` : "该NPC没有战斗魔法书，每次行动使用无附加卡牌效果的普通攻击；怪物被动仍在右侧状态区独立生效。";
  $("battleLog").innerHTML = b.logs.map((log) => `<div class="log-entry ${log.tone}"><b>#${log.n}</b><span>${esc(log.message)}</span></div>`).join("");
  $("battleSummary").hidden = !b.over;
  if (b.over) $("battleSummary").innerHTML = b.won ? `<h2>战斗胜利</h2><p>奖励已直接到账：${b.reward.exp} 经验与 ${b.reward.points} 积分${b.reward.levels ? `，角色提升 ${b.reward.levels} 级` : ""}。</p><button data-battle-finish="win">确认结果并继续</button>` : `<h2>挑战失败</h2><p>本次事件已经结算，不能重新挑战；失败不会获得经验或积分。</p><button data-battle-finish="loss">确认结果并继续</button>`;
}

export function toggleBattleStatusPanel(side) {
  if (!state.battle || !["player", "enemy"].includes(side)) return;
  state.battle.statusPanels ||= { player: false, enemy: false };
  state.battle.statusPanels[side] = !state.battle.statusPanels[side];
  renderBattle();
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
