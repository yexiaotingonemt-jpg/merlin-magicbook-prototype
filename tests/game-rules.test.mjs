import assert from "node:assert/strict";
import test from "node:test";

import { CARDS, CARD_BY_ID, createStarterLoadout, PASSIVES, STARTER_CARD_POOLS } from "../public/merlin-assets/game/cards.js";
import { adjustedSegmentPct, createEnemies, doHits, hitEnemy } from "../public/merlin-assets/game/battle.js";
import { EVENTS } from "../public/merlin-assets/game/content.js";
import { microVariance, variance } from "../public/merlin-assets/game/core.js";
import { CHAPTER_RULES } from "../public/merlin-assets/game/content.js";
import { advanceChapter, ELEMENT_SLOT_UNLOCK_LEVELS, freshState, freshTowerRun, generateEvents, hydrate, poolCap, RUN_RULES_VERSION, settleExplorationTurn, slotCap } from "../public/merlin-assets/game/state.js";
import { setState, state } from "../public/merlin-assets/game/store.js";

function assertStarterLoadout(loadout) {
  assert.equal(loadout.deck.length, 3);
  assert.equal(new Set(loadout.deck).size, 3);
  assert.equal(loadout.startElements.length, 2);
  assert.equal(new Set(loadout.startElements).size, 2);
  assert.ok(loadout.startElements.every((school) => ["fire", "water", "wind"].includes(school)));
  const schoolCounts = Object.fromEntries(loadout.startElements.map((school) => [school, 0]));
  loadout.deck.forEach((id) => {
    const card = CARD_BY_ID.get(id);
    assert.ok(card);
    assert.ok(loadout.startElements.includes(card.school));
    assert.ok(STARTER_CARD_POOLS[card.school].includes(id));
    schoolCounts[card.school] += 1;
  });
  assert.equal(schoolCounts[loadout.startElements[0]], 2);
  assert.equal(schoolCounts[loadout.startElements[1]], 1);
}

test("card catalog and starter pools remain internally consistent", () => {
  assert.equal(CARDS.length, 91);
  assert.equal(CARD_BY_ID.size, 91);
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 91);
  assert.equal(PASSIVES.length, 8);
  assert.deepEqual(Object.keys(STARTER_CARD_POOLS), ["fire", "water", "wind"]);
  assert.ok(Object.values(STARTER_CARD_POOLS).flat().every((id) => CARD_BY_ID.has(id)));
  assertStarterLoadout(createStarterLoadout());
  assert.ok(CARDS.every((card) => card.cost.amount >= 0));
  assert.ok(CARDS.every((card) => card.echo && card.full && card.tags));
});

test("tower exposes all nine exploration event families", () => {
  assert.deepEqual(
    Object.keys(EVENTS).sort(),
    ["element", "experience", "library", "monster", "organize", "player", "rest", "transmute", "upgrade"],
  );
});

test("new mages begin with three pages, two schools, and an empty warehouse", () => {
  const current = freshState();
  assertStarterLoadout(current);
  assert.deepEqual(Object.keys(current.collection).sort(), [...current.deck].sort());
});

test("legacy starters migrate to a clean three-page collection", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19"];
  legacy.startElements = ["fire", "fire", "fire"];
  legacy.collection["FI-04"] = 2;
  assert.equal(hydrate(legacy), true);
  assertStarterLoadout(state);
  assert.deepEqual(Object.keys(state.collection).sort(), [...state.deck].sort());
});

test("customized old saves migrate once from eleven bound pages to three", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19", "WA-01"];
  legacy.startElements = ["fire", "fire", "water"];
  legacy.collection["WA-01"] = 4;
  assert.equal(hydrate(legacy), true);
  assert.equal(state.runRulesVersion, RUN_RULES_VERSION);
  assertStarterLoadout(state);
  assert.deepEqual(Object.keys(state.collection).sort(), [...state.deck].sort());

  const reboundDeck = [...state.deck, "CO-14"];
  state.collection["CO-14"] = 1;
  state.deck = reboundDeck;
  assert.equal(hydrate(JSON.parse(JSON.stringify(state))), true);
  assert.deepEqual(state.deck, reboundDeck);
});

test("every tower run resets binding, elements, collection, and spell levels", () => {
  const previous = freshState();
  previous.score = 777;
  previous.level = 9;
  previous.exp = 321;
  previous.deck = ["WA-02", "WI-03", "CO-14"];
  previous.startElements = ["water", "wind", "light", "dark"];
  previous.collection["WA-02"] = 4;
  previous.collection["FI-01"] = 3;
  delete previous.collection["FI-02"];
  const next = freshTowerRun(previous);
  assertStarterLoadout(next);
  assert.equal(next.level, 1);
  assert.equal(next.exp, 0);
  assert.equal(next.score, 777);
  assert.deepEqual(Object.keys(next.collection).sort(), [...next.deck].sort());
  next.deck.forEach((id) => assert.equal(next.collection[id], 1));
});

test("level curve starts with two elements in three slots and expands toward five", () => {
  const state = setState(freshState());
  assert.deepEqual(ELEMENT_SLOT_UNLOCK_LEVELS, [3, 5]);
  assert.equal(state.startElements.length, 2);
  assert.equal(slotCap(), 3);
  assert.equal(poolCap(), 5);
  state.level = 3;
  assert.equal(slotCap(), 4);
  assert.equal(poolCap(), 6);
  state.level = 5;
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
  state.level = 20;
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
});

test("each normal chapter keeps total weight 1000 and element events average four per tower", () => {
  const normalChapters = [1, 2, 4, 5];
  normalChapters.forEach((chapter) => {
    assert.equal(Object.values(CHAPTER_RULES[chapter].weights).reduce((sum, weight) => sum + weight, 0), 1000);
  });
  assert.deepEqual(normalChapters.map((chapter) => CHAPTER_RULES[chapter].weights.element), [80, 70, 40, 20]);
  const expectedElementEvents = normalChapters.reduce((sum, chapter) => (
    sum + CHAPTER_RULES[chapter].count * CHAPTER_RULES[chapter].weights.element / 1000
  ), 0);
  assert.equal(expectedElementEvents, 4);
});

test("early PVE enemies use the two-element opening baseline", () => {
  const current = setState(freshState());
  const floorOne = createEnemies("pve");
  assert.equal(floorOne.length, 1);
  assert.equal(floorOne[0].maxHp, 150);
  assert.equal(floorOne[0].atk, 70);
  assert.equal(floorOne[0].def, 25);
  current.chapter = 3;
  const boss = createEnemies("pve", { boss: true, name: "星辉魔像" });
  assert.equal(boss.length, 1);
  assert.equal(boss[0].maxHp, 250);
  assert.equal(boss[0].atk, 100);
  assert.equal(boss[0].def, 50);
});

test("chapter one creates a finite weighted pool and advances countdowns after an event", () => {
  const current = setState(freshState());
  generateEvents();
  assert.equal(CHAPTER_RULES[1].count, 15);
  assert.equal(current.events.length, 3);
  assert.equal(current.eventPool.length, 12);
  const selected = current.events[0];
  const finiteBefore = current.events.slice(1).filter((event) => event.countdown != null).map((event) => [event.id, event.countdown]);
  settleExplorationTurn(selected.id);
  assert.equal(current.events.length, 3);
  assert.equal(current.eventPool.length, 11);
  finiteBefore.forEach(([id, countdown]) => {
    const event = current.events.find((item) => item.id === id);
    if (event && !["monster", "player"].includes(event.type)) assert.equal(event.countdown, countdown - 1);
  });
});

test("all six chapters terminate and boss chapters contain exactly one fixed encounter", () => {
  const current = setState(freshState());
  generateEvents();
  for (let chapter = 1; chapter <= 6; chapter += 1) {
    assert.equal(current.chapter, chapter);
    if ([3, 6].includes(chapter)) {
      assert.equal(current.events.length, 1);
      assert.equal(current.events[0].boss, true);
    }
    let safety = 100;
    while (!current.chapterComplete && safety-- > 0) settleExplorationTurn(current.events[0].id);
    assert.ok(safety > 0, `chapter ${chapter} should terminate`);
    assert.equal(current.chapterComplete, true);
    if (chapter < 6) assert.equal(advanceChapter(), true);
  }
  assert.equal(advanceChapter(), false);
  assert.equal(current.runComplete, true);
});

test("combat variance always stays within the configured 40%-300% range", () => {
  const samples = Array.from({ length: 2_000 }, variance);
  assert.ok(samples.every((value) => value >= 0.4 && value <= 3));
  assert.ok(samples.some((value) => value < 0.6));
  assert.ok(samples.some((value) => value > 1.5));
});

test("final damage and healing micro variance remains within 95%-105%", () => {
  const samples = Array.from({ length: 2_000 }, microVariance);
  assert.ok(samples.every((value) => value >= .95 && value <= 1.05));
});

test("a direct spell segment resolves to finite damage under the new combat formula", () => {
  const current = setState(freshState());
  current.battle = {
    mode: "pve", action: 1, logs: [], enemyFatigue: null,
    player: { heat: 0, light: 0, star: 0, damageBuff: 0 },
    enemies: [{ id: "target", name: "测试魔像", hp: 150, maxHp: 150, def: 25, dodge: 80, resist: 50, erosion: 0, vulnerable: 0, passives: [], mirrorStacks: 0 }],
  };
  const originalRandom = Math.random;
  Math.random = () => .5;
  try {
    const result = hitEnemy(100, "fire");
    assert.ok(Number.isFinite(result.damage));
    assert.ok(result.damage > 0);
  } finally { Math.random = originalRandom; }
});

test("retarget cards receive their configured compensation only in full single-target casts", () => {
  const loneTarget = { hp: 50, maxHp: 100 };
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-16"), true, 65, true, 3, loneTarget), 94.25);
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-17"), true, 260, true, 0, loneTarget), 290);
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-20"), true, 440, true, 0, loneTarget), 528);
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-20"), true, 440, true, 0, { hp: 51, maxHp: 100 }), 440);
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-20"), false, 240, true, 0, loneTarget), 240);
  assert.ok(Math.abs(adjustedSegmentPct(CARD_BY_ID.get("HY-12"), true, 440, true, 0, loneTarget) - 506) < Number.EPSILON * 506);
  assert.equal(adjustedSegmentPct(CARD_BY_ID.get("CO-16"), true, 65, false, 3, loneTarget), 65);
});

test("multi-hit spells automatically retarget after killing the lowest-health enemy", () => {
  const current = setState(freshState());
  const enemy = (id, hp) => ({
    id, name: id, hp, maxHp: hp, def: 25, dodge: 80, resist: 50, erosion: 0, vulnerable: 0,
    burn: 0, curse: 0, thunder: 0, passives: [], mirrorStacks: 0, hitSegments: 0,
  });
  current.battle = {
    mode: "pve", action: 1, logs: [], enemyFatigue: null,
    player: { heat: 0, light: 0, star: 0, damageBuff: 0 },
    enemies: [enemy("first", 1), enemy("second", 150)],
  };
  const originalRandom = Math.random;
  Math.random = () => .5;
  try {
    const result = doHits(CARD_BY_ID.get("CO-21"), true, 2, 125);
    assert.equal(result.startedTargets, 2);
    assert.equal(result.kills, 1);
    assert.equal(current.battle.enemies[0].hp, 0);
    assert.ok(current.battle.enemies[1].hp < 150);
    assert.equal(result.singleTargetBonus, false);
  } finally { Math.random = originalRandom; }
});
