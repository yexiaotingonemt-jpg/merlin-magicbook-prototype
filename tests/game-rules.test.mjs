import assert from "node:assert/strict";
import test from "node:test";

import { CARDS, CARD_BY_ID, PASSIVES, STARTER_DECK } from "../public/merlin-assets/game/cards.js";
import { createEnemies } from "../public/merlin-assets/game/battle.js";
import { EVENTS } from "../public/merlin-assets/game/content.js";
import { variance } from "../public/merlin-assets/game/core.js";
import { ELEMENT_SLOT_UNLOCK_LEVELS, freshState, freshTowerRun, hydrate, poolCap, RUN_RULES_VERSION, slotCap } from "../public/merlin-assets/game/state.js";
import { setState, state } from "../public/merlin-assets/game/store.js";

test("card catalog and starter deck remain internally consistent", () => {
  assert.equal(CARDS.length, 85);
  assert.equal(CARD_BY_ID.size, 85);
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 85);
  assert.equal(PASSIVES.length, 8);
  assert.deepEqual(STARTER_DECK, ["FI-01", "FI-02", "FI-03"]);
  assert.ok(STARTER_DECK.every((id) => CARD_BY_ID.has(id)));
  assert.ok(CARDS.every((card) => card.cost.amount >= 0));
  assert.ok(CARDS.every((card) => card.echo && card.full && card.tags));
});

test("tower exposes all nine exploration event families", () => {
  assert.deepEqual(
    Object.keys(EVENTS).sort(),
    ["element", "experience", "library", "monster", "organize", "player", "rest", "transmute", "upgrade"],
  );
});

test("new mages begin with three pages and two fire elements", () => {
  const state = freshState();
  assert.deepEqual(state.deck, ["FI-01", "FI-02", "FI-03"]);
  assert.deepEqual(state.startElements, ["fire", "fire"]);
});

test("legacy starters migrate without deleting learned pages", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19"];
  legacy.startElements = ["fire", "fire", "fire"];
  legacy.collection["FI-04"] = 2;
  assert.equal(hydrate(legacy), true);
  assert.deepEqual(state.deck, ["FI-01", "FI-02", "FI-03"]);
  assert.deepEqual(state.startElements, ["fire", "fire"]);
  assert.equal(state.collection["FI-04"], 2);
});

test("customized old saves migrate once from eleven bound pages to three", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19", "WA-01"];
  legacy.startElements = ["fire", "fire", "water"];
  legacy.collection["WA-01"] = 4;
  assert.equal(hydrate(legacy), true);
  assert.equal(state.runRulesVersion, RUN_RULES_VERSION);
  assert.deepEqual(state.deck, ["FI-01", "FI-02", "FI-03"]);
  assert.deepEqual(state.startElements, ["fire", "fire"]);
  assert.equal(state.collection["WA-01"], 4);

  state.deck.push("WA-01");
  assert.equal(hydrate(JSON.parse(JSON.stringify(state))), true);
  assert.deepEqual(state.deck, ["FI-01", "FI-02", "FI-03", "WA-01"]);
});

test("every tower run resets binding and elements but keeps the learned collection", () => {
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
  assert.deepEqual(next.deck, ["FI-01", "FI-02", "FI-03"]);
  assert.deepEqual(next.startElements, ["fire", "fire"]);
  assert.equal(next.level, 1);
  assert.equal(next.exp, 0);
  assert.equal(next.score, 777);
  assert.equal(next.collection["WA-02"], 4);
  assert.equal(next.collection["FI-01"], 3);
  assert.equal(next.collection["FI-02"], 1);
});

test("level curve expands initial elements from two toward eight", () => {
  const state = setState(freshState());
  assert.deepEqual(ELEMENT_SLOT_UNLOCK_LEVELS, [3, 5, 8, 12, 16, 20]);
  assert.equal(slotCap(), 2);
  assert.equal(poolCap(), 4);
  state.level = 3;
  assert.equal(slotCap(), 3);
  assert.equal(poolCap(), 5);
  state.level = 16;
  assert.equal(slotCap(), 7);
  assert.equal(poolCap(), 9);
  state.level = 20;
  assert.equal(slotCap(), 8);
  assert.equal(poolCap(), 10);
});

test("early PVE enemies use the two-element opening baseline", () => {
  const current = setState(freshState());
  const floorOne = createEnemies("pve");
  assert.equal(floorOne.length, 1);
  assert.equal(floorOne[0].maxHp, 146);
  assert.equal(floorOne[0].atk, 28.89);
  assert.equal(floorOne[0].def, 40);
  current.floor = 10;
  const boss = createEnemies("pve");
  assert.equal(boss.length, 1);
  assert.equal(boss[0].maxHp, 924);
  assert.ok(Math.abs(boss[0].atk - 85) < Number.EPSILON * 100);
  assert.equal(boss[0].def, 85);
});

test("combat variance always stays within the configured 40%-300% range", () => {
  const samples = Array.from({ length: 2_000 }, variance);
  assert.ok(samples.every((value) => value >= 0.4 && value <= 3));
  assert.ok(samples.some((value) => value < 0.6));
  assert.ok(samples.some((value) => value > 1.5));
});
