import { clamp, ELEMENTS, SAVE_KEY, VERSION } from "./core.js?v=21";
import { BASE_PAGE_IDS, CARD_BY_ID, createStarterLoadout } from "./cards.js?v=21";
import { CHAPTER_RULES, EVENT_COUNTDOWNS, EVENTS, weightedEventType } from "./content.js?v=21";
import { setState, state } from "./store.js?v=21";

export const RUN_RULES_VERSION = 7;
export const COMBAT_DECK_CAP = 10;
export const COMBAT_ELEMENTS = ["fire", "water", "wind", "earth", "light", "dark"];
export const EVENT_THREAT_UPGRADE_STEP = .1;
export const LEVEL_UP_HEAL = 60;

export function freshState(legacy = {}) {
  const starter = createStarterLoadout();
  const collection = Object.fromEntries(starter.starterPages.map((id) => [id, 1]));
  const meta = legacy.meta || {};
  return {
    gameVersion: VERSION, runRulesVersion: RUN_RULES_VERSION, board: [], preview: [], chapter: 1, projection: 0,
    score: Number(legacy.score || 0), floor: 1, level: 1, exp: 0,
    hp: 250 + (meta.maxHp || 0), startElements: starter.startElements,
    collection, deck: starter.deck, organizeTokens: 0, fatigue: 100,
    meta: {
      attack: Number(meta.attack || 0), defense: Number(meta.defense || 0), maxHp: Number(meta.maxHp || 0),
      attackPct: Number(meta.attackPct || 0), defensePct: Number(meta.defensePct || 0), hpPct: Number(meta.hpPct || 0),
      hit: Number(meta.hit || 0), dodge: Number(meta.dodge || 0), crit: Number(meta.crit || 0), resist: Number(meta.resist || 0),
      expPct: Number(meta.expPct || 0), poolBonus: Number(meta.poolBonus || 0), passiveLevels: { ...(meta.passiveLevels || {}) },
    },
    events: [], eventPool: [], eventSerial: 0, activeEventId: null, eventResult: null, chapterComplete: false, runComplete: false, battle: null
  };
}

export function freshTowerRun(current = state) {
  const permanentMeta = {
    attack: current.meta.attack, defense: current.meta.defense, maxHp: current.meta.maxHp,
    poolBonus: current.meta.poolBonus, passiveLevels: Object.fromEntries(Object.entries(current.meta.passiveLevels || {}).filter(([id]) => ["attack", "defense", "maxHp"].includes(id))),
  };
  return freshState({ score: current.score, meta: permanentMeta });
}

export function resetTowerRun(current = state) {
  const next = freshTowerRun(current);
  setState(next);
  generateEvents();
  return next;
}

export function maxHp(level = state.level) { return Math.round((250 + (level - 1) * 20 + state.meta.maxHp) * (1 + state.meta.hpPct / 100)); }
export function attack(level = state.level) { return Math.round((100 + (level - 1) * 8 + state.meta.attack) * (1 + state.meta.attackPct / 100)); }
export function defense(level = state.level) { return Math.round((50 + (level - 1) * 4 + state.meta.defense) * (1 + state.meta.defensePct / 100)); }
export function hit() { return 50 + state.meta.hit; }
export function dodge() { return 80 + state.meta.dodge; }
export function crit() { return 100 + state.meta.crit; }
export function resist() { return 50 + state.meta.resist; }
export function evasionChance(defenderDodge, attackerHit) { return clamp((defenderDodge - attackerHit) / 100, 0, .8); }
export function criticalChance(attackerCrit, defenderResist, bonus = 0) { return clamp((attackerCrit - defenderResist) / 100 + bonus, 0, .75); }
export function battleRewards(mode, floor = state.floor) {
  return { exp: Math.round(36 + floor * 7 + (floor % 10 === 0 ? 80 : 0)), points: Math.round(24 + floor * 5 + (mode === "pvp" ? 55 : 0)) };
}
export function expNeed(level = state.level) { return 80 + (level - 1) * 40; }
export const ELEMENT_SLOT_UNLOCK_LEVELS = [3, 5];
export function slotCap(level = state.level) { return Math.min(5, 3 + ELEMENT_SLOT_UNLOCK_LEVELS.filter((unlockLevel) => level >= unlockLevel).length); }
export function poolCap(level = state.level) { return Math.min(16, slotCap(level) + 2 + (state.meta.poolBonus || 0)); }
export function mainElement() {
  const counts = {};
  state.startElements.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "fire";
}
function configuredMainElement(elements) {
  const counts = {};
  elements.forEach((element) => { counts[element] = (counts[element] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "fire";
}
export function cardBuildElements(card) {
  if (!card) return [];
  const fixedElements = Object.keys(card.cost.parts || {}).filter((element) => COMBAT_ELEMENTS.includes(element));
  if (fixedElements.length) return fixedElements;
  return COMBAT_ELEMENTS.includes(card.school) ? [card.school] : [];
}
export function buildElementCoverage(deck = state.deck, startElements = state.startElements) {
  const covered = new Set(startElements.filter((element) => COMBAT_ELEMENTS.includes(element)));
  deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean).forEach((card) => cardBuildElements(card).forEach((element) => covered.add(element)));
  return covered;
}
export function missingBuildElements(card, deck = state.deck, startElements = state.startElements) {
  const covered = buildElementCoverage(deck, startElements);
  return cardBuildElements(card).filter((element) => !covered.has(element));
}
export function theoreticalElementBalance(deck = state.deck, startElements = state.startElements) {
  const cards = deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean);
  const relevant = buildElementCoverage(deck, startElements);
  const main = configuredMainElement(startElements);
  if (cards.some((card) => ["refill", "index", "replay"].includes(card.kind))) relevant.add(main);
  const ranges = Object.fromEntries([...relevant].map((element) => [element, { supplyMin: 0, supplyMax: 0, demandMin: 0, demandMax: 0 }]));
  const rangeFor = (element) => ranges[element];
  startElements.forEach((element) => { if (rangeFor(element)) { rangeFor(element).supplyMin += 1; rangeFor(element).supplyMax += 1; } });
  cards.forEach((card) => {
    if (card.kind === "generator" && rangeFor(card.school)) { rangeFor(card.school).supplyMin += 1; rangeFor(card.school).supplyMax += 2; }
    if (card.kind === "generator-large" && rangeFor(card.school)) { const amount = card.generatorAmount || 3; rangeFor(card.school).supplyMin += amount; rangeFor(card.school).supplyMax += amount; }
    if (card.kind === "meteor" && rangeFor("fire")) rangeFor("fire").supplyMax += 1;
    if (card.kind === "refill" && rangeFor(main)) rangeFor(main).supplyMax += 2;
    if (["index", "replay"].includes(card.kind) && rangeFor(main)) rangeFor(main).supplyMax += 1;
  });
  cards.forEach((card) => {
    if (card.basePage) return;
    const cost = card.cost;
    if (!cost.amount) return;
    if (cost.type === "fixed") {
      Object.entries(cost.parts || {}).forEach(([element, amount]) => { if (rangeFor(element)) { rangeFor(element).demandMin += amount; rangeFor(element).demandMax += amount; } });
      return;
    }
    if (cost.type === "all" && cost.parts) {
      const allowed = Object.entries(cost.parts).filter(([element]) => rangeFor(element));
      const required = allowed.reduce((sum, [, amount]) => sum + amount, 0);
      const flexible = Math.max(0, cost.amount - required);
      allowed.forEach(([element, amount]) => {
        rangeFor(element).demandMin += amount + (allowed.length === 1 ? flexible : 0);
        rangeFor(element).demandMax += amount + flexible;
      });
      return;
    }
    const possible = [...relevant];
    possible.forEach((element) => {
      rangeFor(element).demandMin += possible.length === 1 ? cost.amount : 0;
      rangeFor(element).demandMax += cost.amount;
    });
  });
  return COMBAT_ELEMENTS.filter((element) => ranges[element]).map((element) => ({
    element,
    best: ranges[element].supplyMax - ranges[element].demandMin,
    worst: ranges[element].supplyMin - ranges[element].demandMax,
  }));
}

const DAMAGE_ESTIMATE_RUNS = 180;
const damageEstimateCache = new Map();

function estimateHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function estimateRandom(seed) {
  let value = seed || 1;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function estimateShuffle(items, randomValue) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(randomValue() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function estimateLevel(id, overrides) {
  return Math.max(1, Number(overrides[id] ?? cardLevel(id) ?? 1));
}

function estimateHits(card, full, level) {
  let hits = typeof card.hits === "number" ? card.hits : Array.isArray(card.hits) ? (card.hits[0] + card.hits[1]) / 2 : 1;
  if (!full && card.echoHits) hits = card.echoHits;
  if (!full && Array.isArray(card.hits)) hits = Math.max(1, card.hits[0] - 1);
  if (full && level >= 3 && hits > 1) hits += 1;
  return hits;
}

function estimateDirectDamage(card, full, paidCount, level) {
  const scale = 1 + Math.max(0, level - 1) * .1;
  if (card.kind?.startsWith("total")) {
    if (["total-earth", "total-light", "total-dark"].includes(card.kind)) return 0;
    const amount = paidCount * 100 * (1 + paidCount / 5);
    return (full ? Math.max(160, amount * (card.school === "hybrid" ? 1.1 : 1)) : (card.echoPct || 150)) * scale;
  }
  const hits = estimateHits(card, full, level);
  let segment = Number(full ? card.pct : card.echoPct) || 0;
  if (!segment) return 0;
  if (full && Number.isFinite(card.lonePct)) segment = card.lonePct;
  let total = 0;
  for (let index = 0; index < hits; index += 1) total += segment * (full && card.loneRamp ? 1 + index * card.loneRamp : 1);
  if (full && card.loneBonus) total *= 1 + card.loneBonus * (card.loneThreshold ? .5 : 1);
  return total * scale;
}

function estimatePayment(card, elements, remaining, attuned, randomValue) {
  const cost = attuned && card.cost.type === "fixed" && card.cost.amount ? { ...card.cost, parts: { [attuned]: card.cost.amount } } : card.cost;
  if (card.basePage) {
    const reserved = {};
    remaining.filter((next) => next && !next.basePage && next.cost.type === "fixed").forEach((next) => {
      Object.entries(next.cost.parts || {}).forEach(([element, amount]) => { reserved[element] = (reserved[element] || 0) + amount; });
    });
    const counts = elements.reduce((result, element) => ({ ...result, [element]: (result[element] || 0) + 1 }), {});
    const index = elements.findIndex((element) => (counts[element] || 0) > (reserved[element] || 0));
    return index >= 0 ? [index] : null;
  }
  if (!cost.amount) return [];
  if (cost.type === "any") return elements.length >= cost.amount ? Array.from({ length: cost.amount }, (_, index) => index) : null;
  if (cost.type === "random") return elements.length >= cost.amount ? estimateShuffle(elements.map((_, index) => index), randomValue).slice(0, cost.amount).sort((a, b) => a - b) : null;
  if (cost.type === "fixed") {
    const indices = [], used = new Set();
    for (const [element, needed] of Object.entries(cost.parts || {})) {
      const found = elements.map((value, index) => value === element && !used.has(index) ? index : -1).filter((index) => index >= 0).slice(0, needed);
      if (found.length < needed) return null;
      found.forEach((index) => { used.add(index); indices.push(index); });
    }
    return indices.sort((a, b) => a - b);
  }
  if (cost.type === "all") {
    const allowed = cost.parts ? Object.keys(cost.parts) : null;
    const counts = elements.reduce((result, element) => ({ ...result, [element]: (result[element] || 0) + 1 }), {});
    if (cost.parts && Object.keys(cost.parts).some((element) => !counts[element])) return null;
    const indices = elements.map((element, index) => (!allowed || allowed.includes(element)) ? index : -1).filter((index) => index >= 0);
    return indices.length >= cost.amount ? indices : null;
  }
  return null;
}

export function expectedDeckPerformance(deck = state.deck, startElements = state.startElements, levelOverrides = {}) {
  const cards = deck.map((id) => CARD_BY_ID.get(id)).filter(Boolean);
  const levels = Object.fromEntries(cards.map((card) => [card.id, estimateLevel(card.id, levelOverrides)]));
  const signature = JSON.stringify([deck, startElements, levels, state.level, state.meta.poolBonus || 0]);
  if (damageEstimateCache.has(signature)) return damageEstimateCache.get(signature);
  const seed = estimateHash(signature);
  const capacity = poolCap();
  const main = configuredMainElement(startElements);
  let totalDamage = 0, fullPaidCasts = 0, paidCastChecks = 0;
  for (let run = 0; run < DAMAGE_ESTIMATE_RUNS; run += 1) {
    const randomValue = estimateRandom(seed + Math.imul(run + 1, 2654435761));
    const remaining = estimateShuffle(cards, randomValue);
    const elements = startElements.slice(0, capacity);
    let attuned = null;
    while (remaining.length) {
      const counts = elements.reduce((result, element) => ({ ...result, [element]: (result[element] || 0) + 1 }), {});
      const generatorIndex = remaining.findIndex((card) => card.kind === "generator" && !counts[card.school]);
      const drawIndex = generatorIndex >= 0 ? generatorIndex : Math.floor(randomValue() * remaining.length);
      const [card] = remaining.splice(drawIndex, 1);
      const payment = estimatePayment(card, elements, remaining, attuned, randomValue);
      const full = Boolean(payment);
      const paid = full ? payment.map((index) => elements[index]) : [];
      if (card.cost.amount > 0) { paidCastChecks += 1; if (full) fullPaidCasts += 1; }
      if (full) [...payment].sort((a, b) => b - a).forEach((index) => elements.splice(index, 1));
      const level = levels[card.id];
      totalDamage += estimateDirectDamage(card, full, paid.length, level);
      const add = (element, amount) => { while (amount-- > 0 && elements.length < capacity) elements.push(element); };
      if (card.kind === "generator") add(card.school, counts[card.school] ? 1 : 2);
      if (card.kind === "generator-large") add(card.school, card.generatorAmount || 3);
      if (card.kind === "refill") add(main, Math.min(2, Math.max(0, startElements.filter((element) => element === main).length - elements.filter((element) => element === main).length)));
      if (card.kind === "attune") attuned = main;
      if (full && level >= 6 && paid[0] && randomValue() < .2) add(paid[0], 1);
    }
  }
  const result = {
    damagePct: Math.round(totalDamage / DAMAGE_ESTIMATE_RUNS),
    fullCastRate: paidCastChecks ? Math.round(fullPaidCasts / paidCastChecks * 100) : 100,
    samples: DAMAGE_ESTIMATE_RUNS,
  };
  if (damageEstimateCache.size > 120) damageEstimateCache.clear();
  damageEstimateCache.set(signature, result);
  return result;
}
export function cardLevel(id) { return CARD_BY_ID.get(id)?.basePage ? 1 : state.collection[id] || 0; }
export function normalizeCombatDeck(deck = state.deck) {
  const seen = new Set();
  const normalized = deck.filter((id) => {
    const card = CARD_BY_ID.get(id);
    if (!card || (!card.basePage && !state.collection[id]) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, COMBAT_DECK_CAP);
  for (const id of BASE_PAGE_IDS) {
    if (normalized.length >= COMBAT_DECK_CAP) break;
    if (!seen.has(id)) { normalized.push(id); seen.add(id); }
  }
  return normalized;
}
export function replaceBoundPage(incomingId, outgoingId) {
  if (!state.collection[incomingId]) return "unknown";
  if (state.deck.includes(incomingId)) return "already";
  const index = state.deck.indexOf(outgoingId);
  if (index < 0) return "missing";
  state.deck[index] = incomingId;
  return "replaced";
}
export function organizeBoundPage(id) {
  const card = CARD_BY_ID.get(id);
  if (!card || card.basePage) return "base";
  const index = state.deck.indexOf(id);
  if (index < 0) return "missing";
  const replacement = BASE_PAGE_IDS.find((baseId) => !state.deck.includes(baseId));
  if (!replacement) return "missing-base";
  state.deck[index] = replacement;
  return "organized";
}
export function levelScale(id) { return 1 + Math.max(0, cardLevel(id) - 1) * .1; }
export function costLabel(card) {
  const c = card.cost;
  if (c.type === "any") return `${c.amount} 任意`;
  if (c.type === "random") return `随机 ${c.amount}`;
  if (c.type === "all") return `完全消耗 ≥${c.amount}`;
  if (!c.amount) return "0";
  return Object.entries(c.parts).map(([e, n]) => `${n}${ELEMENTS[e].name}`).join("+");
}
export function schoolLabel(school) { return `${ELEMENTS[school].icon} ${ELEMENTS[school].name}`; }

export function gainExp(amount) {
  state.exp += Math.round(amount * (1 + state.meta.expPct / 100));
  let gained = 0;
  while (state.exp >= expNeed()) {
    state.exp -= expNeed(); state.level += 1; gained += 1; state.hp = Math.min(maxHp(), state.hp + LEVEL_UP_HEAL);
  }
  return gained;
}

function createEvent(type, extra = {}) {
  state.eventSerial += 1;
  return { id: `${state.chapter}-${state.eventSerial}-${type}`, type, countdown: EVENT_COUNTDOWNS[type], level: 1, ...extra };
}

export function eventThreatScale(level = 1) {
  return 1 + (clamp(Number(level || 1), 1, 3) - 1) * EVENT_THREAT_UPGRADE_STEP;
}

function normalizeEventSlots() {
  const occupied = new Set();
  state.events = state.events.map((event) => {
    let slot = Number.isInteger(event.slot) && event.slot >= 0 && event.slot < 3 && !occupied.has(event.slot) ? event.slot : null;
    if (slot == null) slot = [0, 1, 2].find((candidate) => !occupied.has(candidate));
    occupied.add(slot);
    return { ...event, slot };
  }).sort((a, b) => a.slot - b.slot);
}

export function fillEventSlots() {
  normalizeEventSlots();
  const occupied = new Set(state.events.map((event) => event.slot));
  for (let slot = 0; slot < 3 && state.eventPool.length; slot += 1) {
    if (occupied.has(slot)) continue;
    state.events.push(createEvent(state.eventPool.shift(), { slot }));
  }
  state.events.sort((a, b) => a.slot - b.slot);
  state.board = state.events.map((event) => ({ id: event.id, kindLabel: EVENTS[event.type].name, hp: event.level, maxHp: 3, element: event.type === "monster" ? "fire" : "light" }));
  state.chapterComplete = !state.events.length && !state.eventPool.length;
}

export function generateEvents() {
  const rule = CHAPTER_RULES[state.chapter];
  state.floor = state.chapter;
  state.events = []; state.eventPool = []; state.eventSerial = 0; state.activeEventId = null; state.chapterComplete = false;
  if (rule?.boss) state.events = [createEvent("monster", { slot: 0, countdown: null, boss: true, finalBoss: Boolean(rule.final), name: rule.boss })];
  else if (rule) state.eventPool = Array.from({ length: rule.count }, () => weightedEventType(rule.weights));
  fillEventSlots();
}

export function settleExplorationTurn(selectedId) {
  state.events = state.events.filter((event) => event.id !== selectedId).flatMap((event) => {
    if (event.countdown == null) return [event];
    const countdown = event.countdown - 1;
    if (countdown > 0) return [{ ...event, countdown }];
    if (["monster", "player"].includes(event.type)) {
      if (event.level >= 3) return [{ ...event, countdown: 2 }];
      return [{ ...event, level: event.level + 1, countdown: 2 }];
    }
    return [];
  });
  fillEventSlots();
  state.activeEventId = null;
}

export function advanceChapter() {
  if (state.chapter >= 6) { state.runComplete = true; return false; }
  state.chapter += 1; state.hp = maxHp(); state.eventResult = null; generateEvents(); return true;
}

export function serializeState() { return JSON.parse(JSON.stringify(state)); }
export function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch { /* storage can be unavailable */ }
  if (window.parent !== window) window.parent.postMessage({ type: "merlin:state", state: serializeState() }, "*");
}
export function hydrate(data) {
  if (!data || ![4, VERSION].includes(Number(data.gameVersion)) || !Array.isArray(data.deck)) return false;
  const migrated = Number(data.runRulesVersion || 0) < RUN_RULES_VERSION ? freshTowerRun(data) : data;
  const normalized = freshState(migrated);
  setState({ ...normalized, ...migrated, gameVersion: VERSION, runRulesVersion: RUN_RULES_VERSION, meta: normalized.meta, board: Array.isArray(migrated.board) ? migrated.board : [] });
  normalizeEventSlots();
  state.deck = normalizeCombatDeck(state.deck);
  if (state.eventResult && !state.runComplete) {
    state.eventResult = null;
    if (state.chapterComplete) advanceChapter();
  }
  if (!state.events?.length && !state.eventResult && !state.runComplete) generateEvents();
  const awaitingPveRestart = state.battle?.mode === "pve" && state.battle.over && !state.battle.won;
  state.hp = awaitingPveRestart ? 0 : clamp(state.hp, 1, maxHp());
  return true;
}
export function loadLocal() {
  try { return hydrate(JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem("merlin-grimoire-v4"))); } catch { return false; }
}
