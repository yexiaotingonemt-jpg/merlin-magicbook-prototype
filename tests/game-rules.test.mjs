import assert from "node:assert/strict";
import test from "node:test";

import { BASE_PAGE_IDS, BASE_PAGES, CARDS, CARD_BY_ID, createStarterLoadout, PASSIVES, STARTER_CARD_POOLS } from "../public/merlin-assets/game/cards.js?v=28";
import { adjustedSegmentPct, battleCardMotionState, createEnemies, doHits, enemyBasicPage, expandedCardEffects, hitEnemy, paymentFor, pvePanelOutcomes, spellPageHtml } from "../public/merlin-assets/game/battle.js?v=28";
import { EVENTS, PASSIVE_LIBRARY_CHANCE } from "../public/merlin-assets/game/content.js?v=28";
import { candidateFitHtml, decisionContextHtml, LIBRARY_SCHOOLS, librarySpellChoices, replacePageWithReward, storeAcquiredPage, transmutationOptions, transmuteLearnedSpell, upgradePageWithReward } from "../public/merlin-assets/game/exploration.js?v=28";
import { microVariance, variance } from "../public/merlin-assets/game/core.js?v=28";
import { glossaryDetailHtml, glossaryTextHtml } from "../public/merlin-assets/game/glossary.js?v=28";
import { CHAPTER_RULES } from "../public/merlin-assets/game/content.js?v=28";
import { advanceChapter, battleRewards, chapterLabel, COMBAT_DECK_CAP, criticalChance, ELEMENT_SLOT_UNLOCK_LEVELS, evasionChance, expectedDeckPerformance, freshState, freshTowerRun, gainExp, generateEvents, hydrate, LEVEL_UP_HEAL, maxHp, missingBuildElements, normalizeCombatDeck, organizeBoundPage, poolCap, resetTowerRun, RUN_RULES_VERSION, serializeState, settleExplorationTurn, slotCap, theoreticalElementBalance } from "../public/merlin-assets/game/state.js?v=28";
import { setState, state } from "../public/merlin-assets/game/store.js?v=28";
import { cardCostHtml, cardMetadataHtml, damageForecastHtml, elementBalanceHtml, eventDecisionFacts, eventThreatLevelLabel, expectedBattleHpLoss, spellRow } from "../public/merlin-assets/game/ui.js?v=28";

function assertStarterLoadout(loadout) {
  assert.equal(loadout.deck.length, 10);
  assert.equal(new Set(loadout.deck).size, 10);
  assert.equal(loadout.starterPages?.length ?? loadout.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).length, 3);
  assert.equal(loadout.deck.filter((id) => CARD_BY_ID.get(id)?.basePage).length, 7);
  assert.equal(loadout.startElements.length, 2);
  assert.equal(new Set(loadout.startElements).size, 2);
  assert.ok(loadout.startElements.every((school) => ["fire", "water", "wind"].includes(school)));
  const schoolCounts = Object.fromEntries(loadout.startElements.map((school) => [school, 0]));
  loadout.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).forEach((id) => {
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
  assert.equal(BASE_PAGES.length, 10);
  assert.equal(BASE_PAGE_IDS.length, 10);
  assert.equal(CARD_BY_ID.size, 101);
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 91);
  assert.equal(PASSIVES.length, 8);
  assert.deepEqual(Object.keys(STARTER_CARD_POOLS), ["fire", "water", "wind"]);
  assert.ok(Object.values(STARTER_CARD_POOLS).flat().every((id) => CARD_BY_ID.has(id)));
  assertStarterLoadout(createStarterLoadout());
  assert.ok(CARDS.every((card) => card.cost.amount >= 0));
  assert.ok(CARDS.every((card) => card.echo && card.full && card.tags));
});

test("battle card lookup expands shorthand into full casting rules", () => {
  const generator = expandedCardEffects(CARD_BY_ID.get("FI-01"));
  assert.equal(generator.payment, "本页消耗0元素，翻到后自动完整施法。");
  assert.match(generator.full, /若当前没有火元素，则增加2个火元素；否则增加1个火元素，并强化下一张火系攻击。/);
  assert.equal(generator.echo, "本页不会发动残响。");

  const attackCard = expandedCardEffects(CARD_BY_ID.get("FI-02"));
  assert.match(attackCard.payment, /完整施法需要1个火元素；满足时系统自动支付这些元素。/);
  assert.match(attackCard.full, /完整施法时，造成70%伤害，施加2层灼烧。/);
  assert.match(attackCard.echo, /元素不足时不消耗任何元素/);
  assert.match(attackCard.targeting, /生命最低/);
});

test("spell presentation hides internal ids and visualizes elemental payment", () => {
  const tempest = CARD_BY_ID.get("WI-03");
  const cost = cardCostHtml(tempest);
  assert.equal((cost.match(/spell-cost-orb wind/g) || []).length, 2);
  assert.doesNotMatch(cost, /WI-03|消耗 2风/);
  assert.match(cardMetadataHtml(tempest), /🌪 风 · 多段·单体递增/);

  const fullPage = spellPageHtml(tempest, "full");
  assert.doesNotMatch(fullPage, /WI-03|本次：完整施法|cast-badge/);
  assert.match(fullPage, /effect-row casting-rules/);
  assert.match(fullPage, /<b>施法规则<\/b>/);
  assert.match(fullPage, /data-spell-term="完整施法"[^>]*>完整施法<\/button>需要2个风元素；满足时系统自动支付这些元素。/);
  assert.match(fullPage, /攻击自动选择当前生命最低的敌人；[\s\S]*data-spell-term="多段攻击"[\s\S]*每段重新检查，击杀后自动更换目标。/);
  assert.doesNotMatch(fullPage, /payment-copy|<b>目标<\/b>/);
  assert.match(fullPage, /echo-effect inactive/);
  assert.doesNotMatch(fullPage, /spell-tags/);

  const echoPage = spellPageHtml(tempest, "echo");
  assert.match(echoPage, /full-effect inactive/);
  assert.match(echoPage, /echo-effect active echo/);
  assert.match(fullPage, /data-spell-term="完整施法"/);
});

test("spell terminology is emphasized and opens contextual explanations", () => {
  setState(freshState());
  const windCopy = glossaryTextHtml("暴击可获得风势");
  assert.match(windCopy, /class="spell-term combat" data-spell-term="暴击"/);
  assert.match(windCopy, /class="spell-term wind" data-spell-term="风势"/);
  assert.match(glossaryDetailHtml("风势"), /风系攻击暴击时积累/);
  assert.match(spellRow(CARD_BY_ID.get("WI-02"), "deck"), /spell-effect-line full[\s\S]*data-spell-term="风势"/);
});

test("enemies without spellbooks expose a plain attack page", () => {
  const page = enemyBasicPage({ attackPct: 70 }, "pve");
  assert.equal(page.name, "普通攻击");
  assert.match(page.tags, /无魔法书/);
  assert.match(page.full, /不附带额外卡牌效果/);
  assert.match(expandedCardEffects(page).targeting, /对方当前生命最低/);
});

test("tower exposes all nine exploration event families", () => {
  assert.deepEqual(
    Object.keys(EVENTS).sort(),
    ["element", "experience", "library", "monster", "organize", "player", "rest", "transmute", "upgrade"],
  );
});

test("new mages begin with ten pages, three elemental replacements, and an empty warehouse", () => {
  const current = freshState();
  assertStarterLoadout(current);
  assert.deepEqual(Object.keys(current.collection).sort(), current.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).sort());
});

test("new pages can replace, upgrade, or enter the warehouse without changing ten slots", () => {
  const current = setState(freshState());
  const incoming = CARDS.find((card) => !current.collection[card.id]);
  const outgoingBase = current.deck.find((id) => CARD_BY_ID.get(id)?.basePage);
  assert.match(replacePageWithReward(incoming, outgoingBase), /替换/);
  assert.equal(current.deck.length, COMBAT_DECK_CAP);
  assert.ok(current.deck.includes(incoming.id));
  assert.equal(current.collection[incoming.id], 1);

  const material = CARDS.find((card) => !current.collection[card.id]);
  const targetId = current.deck.find((id) => !CARD_BY_ID.get(id)?.basePage);
  const beforeLevel = current.collection[targetId];
  assert.match(upgradePageWithReward(material, targetId), /升级材料/);
  assert.equal(current.collection[targetId], beforeLevel + 1);
  assert.equal(current.collection[material.id], undefined);

  const stored = CARDS.find((card) => !current.collection[card.id]);
  assert.match(storeAcquiredPage(stored), /仓库/);
  assert.equal(current.collection[stored.id], 1);
  assert.ok(!current.deck.includes(stored.id));
});

test("loaded decks above the cap keep their first ten unique learned pages", () => {
  const current = setState(freshState());
  const ids = CARDS.slice(0, COMBAT_DECK_CAP + 2).map((card) => card.id);
  current.collection = Object.fromEntries(ids.map((id) => [id, 1]));
  assert.deepEqual(normalizeCombatDeck([...ids, ids[0]]), ids.slice(0, COMBAT_DECK_CAP));
  current.deck = [...ids, ids[0]];
  assert.equal(hydrate(current), true);
  assert.deepEqual(state.deck, ids.slice(0, COMBAT_DECK_CAP));
  assert.ok(state.collection[ids[COMBAT_DECK_CAP]]);
});

test("legacy starters migrate to a clean ten-page book with three learned replacements", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19"];
  legacy.startElements = ["fire", "fire", "fire"];
  legacy.collection["FI-04"] = 2;
  assert.equal(hydrate(legacy), true);
  assertStarterLoadout(state);
  assert.deepEqual(Object.keys(state.collection).sort(), state.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).sort());
});

test("customized old saves migrate once to the fixed ten-page rules", () => {
  const legacy = freshState();
  delete legacy.runRulesVersion;
  legacy.deck = ["FI-01", "FI-02", "FI-03", "FI-04", "FI-06", "FI-07", "FI-08", "CO-08", "CO-18", "CO-19", "WA-01"];
  legacy.startElements = ["fire", "fire", "water"];
  legacy.collection["WA-01"] = 4;
  assert.equal(hydrate(legacy), true);
  assert.equal(state.runRulesVersion, RUN_RULES_VERSION);
  assertStarterLoadout(state);
  assert.deepEqual(Object.keys(state.collection).sort(), state.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).sort());

  const reboundDeck = [...state.deck, "CO-14"];
  state.collection["CO-14"] = 1;
  state.deck = reboundDeck;
  assert.equal(hydrate(JSON.parse(JSON.stringify(state))), true);
  assert.equal(state.deck.length, COMBAT_DECK_CAP);
  assert.deepEqual(state.deck, reboundDeck.slice(0, COMBAT_DECK_CAP));
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
  assert.deepEqual(Object.keys(next.collection).sort(), next.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).sort());
  next.deck.filter((id) => !CARD_BY_ID.get(id)?.basePage).forEach((id) => assert.equal(next.collection[id], 1));
});

test("organizing a learned page restores a foundation page and keeps ten slots", () => {
  const current = setState(freshState());
  const learnedId = current.deck.find((id) => !CARD_BY_ID.get(id)?.basePage);
  assert.equal(organizeBoundPage(learnedId), "organized");
  assert.equal(current.deck.length, COMBAT_DECK_CAP);
  assert.ok(!current.deck.includes(learnedId));
  assert.equal(current.collection[learnedId], 1);
  assert.equal(current.deck.filter((id) => CARD_BY_ID.get(id)?.basePage).length, 8);
});

test("foundation pages only spend elements left over after unflipped fixed costs", () => {
  const current = setState(freshState());
  current.battle = { elements: ["fire"], drawPile: ["FI-02"], player: { attuned: null } };
  assert.equal(paymentFor(BASE_PAGES[0]), null);
  current.battle.elements.push("fire");
  assert.deepEqual(paymentFor(BASE_PAGES[0]), [0]);
  current.battle.drawPile = [];
  current.battle.elements = ["water"];
  assert.deepEqual(paymentFor(BASE_PAGES[0]), [0]);
});

test("level curve starts with two elements and five available starting slots", () => {
  const state = setState(freshState());
  assert.deepEqual(ELEMENT_SLOT_UNLOCK_LEVELS, []);
  assert.equal(state.startElements.length, 2);
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
  state.level = 3;
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
  state.level = 5;
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
  state.level = 20;
  assert.equal(slotCap(), 5);
  assert.equal(poolCap(), 7);
});

test("passive tomes are rare full-run rewards with fivefold per-pick growth", () => {
  assert.equal(PASSIVE_LIBRARY_CHANCE, .16);
  const expected = .16 + [1, 2, 4, 5].reduce((sum, chapter) => (
    sum + CHAPTER_RULES[chapter].count * CHAPTER_RULES[chapter].weights.library / 1000 * PASSIVE_LIBRARY_CHANCE
  ), 0);
  assert.ok(Math.abs(expected - 1.8264) < 1e-10);

  const current = setState(freshState());
  const beforeHp = current.hp;
  PASSIVES.forEach((passive) => passive.apply());
  assert.equal(current.meta.expPct, 10);
  assert.equal(current.meta.hpPct, 5);
  assert.equal(current.meta.attackPct, 5);
  assert.equal(current.meta.defensePct, 5);
  assert.equal(current.meta.hit, 5);
  assert.equal(current.meta.dodge, 5);
  assert.equal(current.meta.crit, 5);
  assert.equal(current.meta.resist, 5);
  assert.ok(current.hp > beforeHp);
});

test("ordinary libraries offer one spell from each of the six elemental schools", () => {
  const unlearned = CARDS.filter((card) => LIBRARY_SCHOOLS.includes(card.school));
  const choices = librarySpellChoices(unlearned, [], () => 0);
  assert.equal(choices.length, 6);
  assert.deepEqual(choices.map((card) => card.school), ["fire", "water", "wind", "earth", "light", "dark"]);
  assert.ok(choices.every((card) => !["hybrid", "arcane"].includes(card.school)));

  const withoutFire = unlearned.filter((card) => card.school !== "fire");
  const fallback = [CARD_BY_ID.get("FI-02")];
  assert.deepEqual(librarySpellChoices(withoutFire, fallback, () => 0).map((card) => card.school), LIBRARY_SCHOOLS);
});

test("normal chapters keep total weight 1000 and the prologue raises element events to five per tower", () => {
  const normalChapters = [1, 2, 4, 5];
  normalChapters.forEach((chapter) => {
    assert.equal(Object.values(CHAPTER_RULES[chapter].weights).reduce((sum, weight) => sum + weight, 0), 1000);
  });
  assert.deepEqual(normalChapters.map((chapter) => CHAPTER_RULES[chapter].weights.element), [80, 70, 40, 20]);
  const expectedElementEvents = normalChapters.reduce((sum, chapter) => (
    sum + CHAPTER_RULES[chapter].count * CHAPTER_RULES[chapter].weights.element / 1000
  ), 0);
  assert.equal(expectedElementEvents, 4);
  assert.deepEqual(CHAPTER_RULES[0].fixedEvents, ["element", "library", "monster"]);
  assert.equal(expectedElementEvents + CHAPTER_RULES[0].fixedEvents.filter((type) => type === "element").length, 5);
});

test("early PVE enemies use the two-element opening baseline", () => {
  const current = setState(freshState());
  const floorOne = createEnemies("pve");
  assert.equal(floorOne.length, 1);
  assert.equal(floorOne[0].maxHp, 150);
  assert.equal(floorOne[0].atk, 70);
  assert.equal(floorOne[0].def, 25);
  assert.deepEqual(floorOne[0].elements, []);
  assert.deepEqual(floorOne[0].book, []);
  current.chapter = 3;
  const boss = createEnemies("pve", { boss: true, name: "星辉魔像" });
  assert.equal(boss.length, 1);
  assert.equal(boss[0].maxHp, 250);
  assert.equal(boss[0].atk, 100);
  assert.equal(boss[0].def, 50);
});

test("PVE event levels do not multiply percentage-point combat attributes", () => {
  setState(freshState());
  const enemies = [1, 2, 3].map((eventLevel) => createEnemies("pve", { eventLevel })[0]);
  assert.deepEqual(enemies.map((enemy) => enemy.dodge), [60, 60, 60]);
  assert.deepEqual(enemies.map((enemy) => enemy.hit), [50, 50, 50]);
  assert.deepEqual(enemies.map((enemy) => enemy.crit), [100, 100, 100]);
  assert.deepEqual(enemies.map((enemy) => enemy.resist), [50, 50, 50]);
  assert.deepEqual(enemies.map((enemy) => evasionChance(enemy.dodge, 50)), [.1, .1, .1]);
  assert.equal(criticalChance(100, 50), .5);
});

test("threat upgrades use ten-percent steps and level-ups restore sixty life", () => {
  const current = setState(freshState());
  const enemies = [1, 2, 3].map((eventLevel) => createEnemies("pve", { eventLevel })[0]);
  assert.deepEqual(enemies.map((enemy) => enemy.maxHp), [150, 165, 180]);
  assert.deepEqual(enemies.map((enemy) => enemy.atk), [70, 77, 84]);
  assert.deepEqual(enemies.map((enemy) => Math.round(enemy.def * 10) / 10), [25, 27.5, 30]);
  current.hp = 100;
  current.exp = 79;
  assert.equal(gainExp(1), 1);
  assert.equal(LEVEL_UP_HEAL, 60);
  assert.equal(current.level, 2);
  assert.equal(current.hp, 160);
});

test("event previews disclose exact rewards, risk, timer outcome, and reduced PVE evasion", () => {
  setState(freshState());
  const monster = eventDecisionFacts({ type: "monster", level: 2, countdown: 2 });
  assert.match(monster.reward, /36经验 \+ 24积分/);
  assert.match(monster.risk, /Lv\.2.*生命66%.*攻77%.*防55%/);
  assert.match(monster.combat, /预计掉血约\d+.*实际闪避10%/);
  assert.match(monster.warning, /极端方差与特殊被动/);
  assert.equal(monster.timer, "2回合后升级");
  const maxMonster = eventDecisionFacts({ type: "monster", level: 3, countdown: 1 });
  assert.equal(eventThreatLevelLabel(3), "Max");
  assert.match(maxMonster.risk, /^Max ·/);
  assert.equal(maxMonster.timer, "1回合后重置");
  const library = eventDecisionFacts({ type: "library", countdown: 2 });
  assert.equal(library.reward, "六系6选1奖励");
  assert.match(library.risk, /16%改为被动秘典三选一/);
  assert.ok(expectedBattleHpLoss({ type: "monster", level: 1 }) > 0);
  state.hp = 1;
  const lethalMonster = eventDecisionFacts({ type: "monster", level: 1, countdown: 2 });
  assert.equal(lethalMonster.lethal, true);
  assert.match(lethalMonster.warning, /高风险.*预计可能阵亡/);
  assert.deepEqual(battleRewards("pve", 0), { exp: 36, points: 24 });
  assert.deepEqual(battleRewards("pvp", 1), { exp: 43, points: 84 });
});

test("choice events expose the current elements, bound pages, levels, and candidate fit", () => {
  const current = setState(freshState());
  current.startElements = ["fire", "water"];
  current.collection = { "FI-01": 2, "WA-02": 1 };
  current.deck = ["FI-01", "WA-02"];
  const context = decisionContextHtml();
  assert.match(context, /当前构筑/);
  assert.match(context, /起始元素 <b>2 \/ 5<\/b>/);
  assert.match(context, /余烬召来[\s\S]*Lv\.2/);
  assert.match(context, /水刃术[\s\S]*Lv\.1/);
  const monoFit = candidateFitHtml(CARD_BY_ID.get("FI-02"));
  assert.match(monoFit, /尚未学习/);
  assert.match(monoFit, /开局匹配：火1\/1/);
  const hybridFit = candidateFitHtml(CARD_BY_ID.get("HY-01"));
  assert.match(hybridFit, /火1\/1 · 水1\/1/);
});

test("grimoire element balance shows fixed deficits and best-to-worst ranges", () => {
  const current = setState(freshState());
  current.startElements = [];
  current.deck = ["FI-02"];
  current.collection = { "FI-02": 1 };
  assert.deepEqual(theoreticalElementBalance(), [{ element: "fire", best: -1, worst: -1 }]);

  current.startElements = ["fire", "water"];
  current.deck = ["FI-01", "CO-20"];
  current.collection = { "FI-01": 1, "CO-20": 1 };
  const balance = theoreticalElementBalance();
  assert.deepEqual(balance.find((entry) => entry.element === "water"), { element: "water", best: 1, worst: -2 });
  assert.match(elementBalanceHtml(), /水元素<\/b><strong>\+1~-2/);
});

test("expected deck damage is stable, element-aware, and responds to upgrades", () => {
  const current = setState(freshState());
  current.deck = [...BASE_PAGE_IDS];
  current.collection = {};
  current.startElements = [];
  assert.deepEqual(expectedDeckPerformance(), { damagePct: 300, fullCastRate: 0, samples: 180 });
  assert.deepEqual(expectedDeckPerformance(), expectedDeckPerformance());

  current.startElements = ["fire", "water"];
  assert.equal(expectedDeckPerformance().damagePct, 360);
  assert.equal(expectedDeckPerformance().fullCastRate, 20);

  current.deck = [...BASE_PAGE_IDS.slice(0, 9), "CO-18"];
  current.collection = { "CO-18": 1 };
  const before = expectedDeckPerformance();
  const after = expectedDeckPerformance(current.deck, current.startElements, { "CO-18": 2 });
  assert.ok(after.damagePct > before.damagePct);
  assert.match(damageForecastHtml(current.deck, { "CO-18": 2 }, "升级后"), /升级后 \d+%[\s\S]*较当前 \+\d+%/);
});

test("binding warns only when a card introduces a completely absent element school", () => {
  const current = setState(freshState());
  current.startElements = ["fire"];
  current.deck = ["FI-02"];
  current.collection = { "FI-02": 1, "EA-02": 1, "HY-01": 1, "CO-18": 1 };
  assert.deepEqual(missingBuildElements(CARD_BY_ID.get("EA-02")), ["earth"]);
  assert.deepEqual(missingBuildElements(CARD_BY_ID.get("HY-01")), ["water"]);
  assert.deepEqual(missingBuildElements(CARD_BY_ID.get("CO-18")), []);
});

test("boiling laboratory only transforms into current-element mono spells with the same cost", () => {
  const current = setState(freshState());
  const oldCard = CARD_BY_ID.get("FI-02");
  current.startElements = ["fire", "water", "water"];
  current.collection = { [oldCard.id]: 3 };
  current.deck = [...BASE_PAGE_IDS];
  current.deck[4] = oldCard.id;

  const options = transmutationOptions(oldCard);
  assert.ok(options.length > 0);
  assert.ok(options.every((card) => card.school === "water"));
  assert.ok(options.every((card) => card.cost.type === oldCard.cost.type && card.cost.amount === oldCard.cost.amount));
  assert.ok(options.every((card) => !card.id.startsWith("HY-") && !card.id.startsWith("CO-")));

  const replacement = options[0];
  assert.deepEqual(transmuteLearnedSpell(oldCard, replacement), { level: 3, deckIndex: 4, bound: true });
  assert.equal(current.collection[oldCard.id], undefined);
  assert.equal(current.collection[replacement.id], 3);
  assert.equal(current.deck[4], replacement.id);

  current.startElements = [replacement.school];
  assert.deepEqual(transmutationOptions(replacement), []);
});

test("completed battles remain persisted until their result is confirmed", () => {
  const current = setState(freshState());
  current.hp = 0;
  current.battle = { mode: "pve", over: true, won: false };
  assert.equal(serializeState().battle.over, true);
  assert.equal(serializeState().battle.won, false);

  const persisted = serializeState();
  assert.equal(hydrate(persisted), true);
  assert.equal(state.hp, 0);
  assert.equal(state.battle.won, false);
});

test("PVE results mark one combatant as winner and the other as loser", () => {
  assert.equal(pvePanelOutcomes({ mode: "pve", over: false, won: false }), null);
  assert.equal(pvePanelOutcomes({ mode: "pvp", over: true, won: false }), null);
  assert.deepEqual(pvePanelOutcomes({ mode: "pve", over: true, won: true }), { player: "winner", enemy: "loser" });
  assert.deepEqual(pvePanelOutcomes({ mode: "pve", over: true, won: false }), { player: "loser", enemy: "winner" });
});

test("player and enemy spell pages alternate their motion state and settle upright", () => {
  assert.deepEqual(battleCardMotionState({ turn: "player", over: false }), { player: true, enemy: false });
  assert.deepEqual(battleCardMotionState({ turn: "enemy", over: false }), { player: false, enemy: true });
  assert.deepEqual(battleCardMotionState({ turn: "player", over: true }), { player: false, enemy: false });
  assert.deepEqual(battleCardMotionState(null), { player: false, enemy: false });
});

test("confirming a PVE defeat resets the tower while preserving permanent progress", () => {
  const current = setState(freshState());
  current.chapter = 4;
  current.floor = 4;
  current.level = 5;
  current.exp = 120;
  current.hp = 0;
  current.score = 777;
  current.meta.attack = 12;
  current.battle = { mode: "pve", over: true, won: false };
  const next = resetTowerRun();
  assert.equal(next, state);
  assert.equal(state.chapter, 0);
  assert.equal(state.floor, 0);
  assert.equal(state.level, 1);
  assert.equal(state.exp, 0);
  assert.equal(state.hp, 250);
  assert.equal(state.score, 777);
  assert.equal(state.meta.attack, 12);
  assert.equal(state.battle, null);
  assert.equal(state.deck.length, 10);
  assert.equal(state.startElements.length, 2);
  assert.equal(state.events.length, 3);
  assert.deepEqual(state.events.map((event) => event.type), ["element", "library", "monster"]);
});

test("PVP mirror exposes its snapshot spellbook and starting elements", () => {
  const current = setState(freshState());
  const mirror = createEnemies("pvp")[0];
  assert.deepEqual(mirror.book, current.deck);
  assert.deepEqual(mirror.elements, current.startElements);
  assert.equal(enemyBasicPage(mirror, "pvp").name, "镜像基础术式");
});

test("the prologue always opens with element, library, and monster events", () => {
  const current = setState(freshState());
  generateEvents();
  assert.equal(current.chapter, 0);
  assert.equal(current.floor, 0);
  assert.equal(chapterLabel(), "序章");
  assert.deepEqual(current.events.map((event) => event.type), ["element", "library", "monster"]);
  assert.deepEqual(current.events.map((event) => event.slot), [0, 1, 2]);
  assert.deepEqual(current.events.map((event) => event.countdown), [4, 2, 2]);
  assert.equal(current.eventPool.length, 0);
});

test("chapter one creates a finite weighted pool and advances countdowns after an event", () => {
  const current = setState(freshState());
  current.chapter = 1;
  generateEvents();
  assert.equal(CHAPTER_RULES[1].count, 15);
  assert.equal(current.events.length, 3);
  assert.equal(current.eventPool.length, 12);
  const selected = current.events[0];
  const selectedSlot = selected.slot;
  const retainedSlots = new Map(current.events.slice(1).map((event) => [event.id, event.slot]));
  const finiteBefore = current.events.slice(1).filter((event) => event.countdown != null).map((event) => [event.id, event.countdown]);
  settleExplorationTurn(selected.id);
  assert.equal(current.events.length, 3);
  assert.equal(current.eventPool.length, 11);
  const replacement = current.events.find((event) => event.slot === selectedSlot);
  assert.ok(replacement);
  assert.notEqual(replacement.id, selected.id);
  retainedSlots.forEach((slot, id) => {
    const retained = current.events.find((event) => event.id === id);
    if (retained) assert.equal(retained.slot, slot);
  });
  finiteBefore.forEach(([id, countdown]) => {
    const event = current.events.find((item) => item.id === id);
    if (event && !["monster", "player"].includes(event.type)) assert.equal(event.countdown, countdown - 1);
  });
});

test("legacy event result pages resume exploration without another confirmation", () => {
  const current = setState(freshState());
  generateEvents();
  const selectedId = current.events[0].id;
  settleExplorationTurn(selectedId);
  current.eventResult = { title: "课程完成", copy: "获得经验。" };
  const remainingPool = current.eventPool.length;
  const remainingEvents = current.events.length;
  assert.equal(hydrate(serializeState()), true);
  assert.equal(state.eventResult, null);
  assert.equal(state.activeEventId, null);
  assert.equal(state.events.length, remainingEvents);
  assert.equal(state.eventPool.length, remainingPool);
});

test("legacy saves assign stable event slots before the next exploration turn", () => {
  const current = setState(freshState());
  generateEvents();
  current.events.forEach((event) => { delete event.slot; });
  assert.equal(hydrate(serializeState()), true);
  assert.deepEqual(state.events.map((event) => event.slot), [0, 1, 2]);
  const retained = state.events[2];
  settleExplorationTurn(state.events[1].id);
  assert.equal(state.events.find((event) => event.id === retained.id)?.slot, 2);
});

test("legacy chapter result pages advance to the next chapter immediately", () => {
  const current = setState(freshState());
  current.chapter = 1;
  current.events = [];
  current.eventPool = [];
  current.chapterComplete = true;
  current.eventResult = { title: "本章完成", copy: "继续探索。" };
  assert.equal(hydrate(serializeState()), true);
  assert.equal(state.chapter, 2);
  assert.equal(state.eventResult, null);
  assert.equal(state.chapterComplete, false);
  assert.equal(state.events.length, 3);
  assert.equal(state.hp, maxHp());
});

test("the prologue and all six chapters terminate with two fixed boss encounters", () => {
  const current = setState(freshState());
  generateEvents();
  for (let chapter = 0; chapter <= 6; chapter += 1) {
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
