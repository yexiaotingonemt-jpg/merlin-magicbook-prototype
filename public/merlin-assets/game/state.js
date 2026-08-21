import { clamp, ELEMENTS, SAVE_KEY, VERSION } from "./core.js?v=16";
import { CARD_BY_ID, createStarterLoadout } from "./cards.js?v=16";
import { CHAPTER_RULES, EVENT_COUNTDOWNS, EVENTS, weightedEventType } from "./content.js?v=16";
import { setState, state } from "./store.js?v=16";

export const RUN_RULES_VERSION = 6;
export const COMBAT_DECK_CAP = 10;
export const COMBAT_ELEMENTS = ["fire", "water", "wind", "earth", "light", "dark"];
export const EVENT_THREAT_UPGRADE_STEP = .1;
export const LEVEL_UP_HEAL = 60;

export function freshState(legacy = {}) {
  const starter = createStarterLoadout();
  const collection = Object.fromEntries(starter.deck.map((id) => [id, 1]));
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
export function cardLevel(id) { return state.collection[id] || 0; }
export function normalizeCombatDeck(deck = state.deck) {
  const seen = new Set();
  return deck.filter((id) => {
    if (!state.collection[id] || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, COMBAT_DECK_CAP);
}
export function bindCard(id) {
  if (!state.collection[id]) return "unknown";
  if (state.deck.includes(id)) return "already";
  if (state.deck.length >= COMBAT_DECK_CAP) return "full";
  state.deck.push(id);
  return "bound";
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
  state.hp = clamp(state.hp, 1, maxHp());
  return true;
}
export function loadLocal() {
  try { return hydrate(JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem("merlin-grimoire-v4"))); } catch { return false; }
}
