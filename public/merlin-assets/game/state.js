import { clamp, ELEMENTS, SAVE_KEY, shuffle, VERSION } from "./core.js";
import { createStarterLoadout } from "./cards.js";
import { EVENTS } from "./content.js";
import { setState, state } from "./store.js";

export const RUN_RULES_VERSION = 4;

export function freshState(legacy = {}) {
  const starter = createStarterLoadout();
  const collection = Object.fromEntries(starter.deck.map((id) => [id, 1]));
  const meta = legacy.meta || { attack: 0, defense: 0, maxHp: 0, startBonus: 0, passiveLevels: {} };
  return {
    gameVersion: VERSION, runRulesVersion: RUN_RULES_VERSION, board: [], preview: [], chapter: 1, projection: 0,
    score: Number(legacy.score || 0), floor: 1, level: 1, exp: 0,
    hp: 280 + (meta.maxHp || 0), startElements: starter.startElements,
    collection, deck: starter.deck, organizeTokens: 0, fatigue: 100,
    meta, events: [], eventResult: null, battle: null
  };
}

export function freshTowerRun(current = state) {
  return freshState({ score: current.score, meta: current.meta });
}

export function maxHp() { return 280 + (state.level - 1) * 18 + state.meta.maxHp; }
export function attack() { return 100 + (state.level - 1) * 7 + state.meta.attack; }
export function defense() { return 55 + (state.level - 1) * 4 + state.meta.defense; }
export function expNeed(level = state.level) { return 80 + (level - 1) * 40; }
export const ELEMENT_SLOT_UNLOCK_LEVELS = [3, 5, 8, 12, 16, 20];
export function slotCap() { return Math.min(8, 2 + ELEMENT_SLOT_UNLOCK_LEVELS.filter((level) => state.level >= level).length + (state.meta.startBonus || 0)); }
export function poolCap() { return Math.min(16, slotCap() + 2 + (state.meta.poolBonus || 0)); }
export function mainElement() {
  const counts = {};
  state.startElements.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "fire";
}
export function cardLevel(id) { return state.collection[id] || 0; }
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
  state.exp += amount;
  let gained = 0;
  while (state.exp >= expNeed()) {
    state.exp -= expNeed(); state.level += 1; gained += 1; state.hp = Math.min(maxHp(), state.hp + 38);
  }
  return gained;
}

export function generateEvents() {
  const types = Object.keys(EVENTS);
  let chosen;
  if (state.floor % 10 === 0) chosen = ["monster", ...shuffle(types.filter((x) => !["monster", "rest"].includes(x))).slice(0, 2)];
  else chosen = shuffle(types).slice(0, 3);
  state.events = chosen.map((type, index) => ({ id: `${state.floor}-${index}-${type}`, type }));
  state.board = state.events.map((event) => ({ id: event.id, kindLabel: EVENTS[event.type].name, hp: 1, maxHp: 1, element: "light" }));
}

export function serializeState() {
  return JSON.parse(JSON.stringify({ ...state, battle: state.battle && !state.battle.over ? state.battle : null }));
}
export function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch { /* storage can be unavailable */ }
  if (window.parent !== window) window.parent.postMessage({ type: "merlin:state", state: serializeState() }, "*");
}
export function hydrate(data) {
  if (!data || data.gameVersion !== VERSION || !Array.isArray(data.deck)) return false;
  const migrated = Number(data.runRulesVersion || 0) < RUN_RULES_VERSION ? freshTowerRun(data) : data;
  setState({ ...freshState(migrated), ...migrated, board: Array.isArray(migrated.board) ? migrated.board : [] });
  state.meta = { ...freshState().meta, ...(data.meta || {}) };
  if (!state.events?.length) generateEvents();
  state.hp = clamp(state.hp, 1, maxHp());
  return true;
}
export function loadLocal() {
  try { return hydrate(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return false; }
}
