import assert from "node:assert/strict";
import test from "node:test";

import { CARDS, CARD_BY_ID, PASSIVES, STARTER_DECK } from "../public/merlin-assets/game/cards.js";
import { EVENTS } from "../public/merlin-assets/game/content.js";
import { variance } from "../public/merlin-assets/game/core.js";
import { freshState, poolCap, slotCap } from "../public/merlin-assets/game/state.js";
import { setState } from "../public/merlin-assets/game/store.js";

test("card catalog and starter deck remain internally consistent", () => {
  assert.equal(CARDS.length, 85);
  assert.equal(CARD_BY_ID.size, 85);
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 85);
  assert.equal(PASSIVES.length, 8);
  assert.equal(STARTER_DECK.length, 10);
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

test("level curve expands initial elements from three toward eight", () => {
  const state = setState(freshState());
  assert.equal(slotCap(), 3);
  assert.equal(poolCap(), 6);
  state.level = 3;
  assert.equal(slotCap(), 4);
  state.level = 16;
  assert.equal(slotCap(), 8);
  assert.equal(poolCap(), 11);
});

test("combat variance always stays within the configured 40%-300% range", () => {
  const samples = Array.from({ length: 2_000 }, variance);
  assert.ok(samples.every((value) => value >= 0.4 && value <= 3));
  assert.ok(samples.some((value) => value < 0.6));
  assert.ok(samples.some((value) => value > 1.5));
});
