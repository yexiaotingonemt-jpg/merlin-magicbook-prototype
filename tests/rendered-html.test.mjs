import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Merlin tower entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>梅林的魔法书 · 法师塔<\/title>/);
  assert.match(html, /进入法师塔/);
  assert.match(html, /src="\/game\.html"/);
});

test("ships exploration, deck building, battle and persistence", async () => {
  const routes = ["account", "leaderboard", "players", "projection", "reset", "state"];
  const modules = ["app", "battle", "cards", "content", "core", "exploration", "glossary", "state", "store", "ui"];
  await Promise.all([
    access(new URL("../public/game.html", import.meta.url)),
    access(new URL("../public/merlin-assets/grimoire-game.css", import.meta.url)),
    access(new URL("../public/merlin-assets/level-preview.css", import.meta.url)),
    access(new URL("../public/merlin-assets/battle-redesign.css", import.meta.url)),
    access(new URL("../public/merlin-assets/spell-glossary.css", import.meta.url)),
    access(new URL("../public/merlin-assets/formal-game-ui.css", import.meta.url)),
    access(new URL("../public/merlin-assets/art/wizard-player.webp", import.meta.url)),
    access(new URL("../public/merlin-assets/art/wizard-enemy.webp", import.meta.url)),
    access(new URL("../public/merlin-assets/vendor/fontawesome/css/solid.min.css", import.meta.url)),
    access(new URL("../public/merlin-assets/vendor/fontawesome/css/fontawesome.min.css", import.meta.url)),
    ...modules.map((module) => access(new URL(`../public/merlin-assets/game/${module}.js`, import.meta.url))),
    access(new URL("../app/api/admin/reset-leaderboard/route.ts", import.meta.url)),
    ...routes.map((route) => access(new URL(`../app/api/${route}/route.ts`, import.meta.url))),
  ]);
  const game = await readFile(new URL("../public/game.html", import.meta.url), "utf8");
  const formalUi = await readFile(new URL("../public/merlin-assets/formal-game-ui.css", import.meta.url), "utf8");
  const sources = Object.fromEntries(await Promise.all(modules.map(async (module) => [module, await readFile(new URL(`../public/merlin-assets/game/${module}.js`, import.meta.url), "utf8")])));
  const engine = Object.values(sources).join("\n");
  for (const id of ["exploreView", "battleView", "grimoireView", "archiveView", "shopView", "enemyBattleStats", "enemyBattleElements", "enemyBattleStatuses", "enemyCurrentCard", "playerBookCount", "enemyBookCount", "playerCombatant", "enemyCombatant", "playerResultStamp", "enemyResultStamp", "expectedDamagePct", "expectedFullCastRate"]) assert.match(game, new RegExp(`id="${id}"`));
  assert.doesNotMatch(game, /battleRestart|重新开打/);
  assert.doesNotMatch(game, /continueButton|继续探索/);
  assert.match(game, /id="elementBalance"/);
  assert.match(game, /理论元素余缺/);
  assert.match(game, /type="module" src="\.\/merlin-assets\/game\/app\.js\?v=32"/);
  assert.match(game, /formal-game-ui\.css\?v=44/);
  assert.match(formalUi, /grid-template-rows: auto auto minmax\(0, 1fr\)/);
  assert.match(formalUi, /\.event-facts strong \{ font-size: 12px/);
  assert.match(formalUi, /minmax\(760px, 2\.4fr\)/);
  assert.match(formalUi, /justify-self: center/);
  assert.match(formalUi, /aspect-ratio: 13 \/ 8/);
  assert.match(formalUi, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(formalUi, /padding: 7\.5% 13% 10%/);
  assert.match(formalUi, /\.modal-card \.context-page \{ min-width: 126px/);
  assert.match(formalUi, /scrollbar-color: #806a43 #090b09/);
  assert.match(formalUi, /\.modal-card \.confirm-balance/);
  assert.ok(game.indexOf('class="battle-lower"') > game.indexOf('class="spell-focus"'));
  assert.ok(game.indexOf('class="battle-lower"') < game.indexOf('id="enemyCombatant"'));
  const cardIds = new Set([...engine.matchAll(/"((?:FI|WA|WI|EA|LI|DA|HY|CO)-\d{2})"/g)].map((match) => match[1]));
  assert.equal(cardIds.size, 91);
  assert.match(sources.state, /export function generateEvents\(\)/);
  assert.match(sources.exploration, /export function resolveEvent\(eventId\)/);
  assert.match(sources.battle, /export function drawCard\(\)/);
  assert.match(sources.battle, /export function paymentFor\(card\)/);
  assert.match(sources.battle, /export function startBattle\(mode/);
  assert.match(sources.battle, /export function targetLowest\(\)/);
  assert.match(sources.battle, /export function expandedCardEffects\(card\)/);
  assert.match(sources.battle, /export function spellPageHtml\(card/);
  assert.match(sources.battle, /export function enemyBasicPage\(enemy/);
  assert.match(sources.state, /export const COMBAT_DECK_CAP = 10/);
  assert.match(sources.exploration, /library-workbench/);
  assert.match(sources.exploration, /target\.id !== card\?\.id/);
  assert.match(formalUi, /grid-template-columns: minmax\(470px, \.9fr\) minmax\(650px, 1\.25fr\)/);
  assert.match(formalUi, /\.workbench-page\.drag-over/);
  for (const label of ["法攻", "法防", "命中", "闪避", "暴击", "抗暴"]) assert.match(sources.battle, new RegExp(`\\["${label}"`));
  assert.match(sources.battle, /实际 \$\{percent\(evasionChance/);
  assert.match(sources.core, /export function variance\(\)/);
  assert.match(sources.core, /\.4 \+ 2\.6 \* Math\.pow\(Math\.random\(\), 10 \/ 3\)/);
  assert.match(sources.battle, /b\.drawPile = shuffle\(state\.deck\)/);
  assert.match(sources.battle, /元素不足发动残响，不消耗元素/);
  assert.match(sources.battle, /mode === "pve" \? "player"/);
  assert.match(sources.battle, /state\.fatigue = b\.enemyFatigue/);
  assert.match(sources.battle, /attack\(\) \/ \(attack\(\) \+ effectiveDef\)/);
  assert.doesNotMatch(sources.battle, /1000 \/ \(1000 \+/);
  assert.match(sources.state, /localStorage\.setItem\(SAVE_KEY/);
  assert.match(sources.state, /type: "merlin:state"/);
  assert.match(sources.app, /from "\.\/battle\.js\?v=28"/);
  assert.match(sources.exploration, /from "\.\/battle\.js\?v=28"/);
  assert.match(sources.ui, /export function eventDecisionFacts\(event\)/);
  assert.match(sources.ui, /export function cardCostHtml\(card/);
  assert.match(sources.ui, /export function cardMetadataHtml\(card/);
  assert.match(sources.glossary, /export function glossaryTextHtml\(text\)/);
  assert.match(sources.app, /data-spell-term/);
  assert.doesNotMatch(sources.ui, /spell-rune.*\$\{card\.id\}/);
  assert.doesNotMatch(sources.exploration, /\$\{card\.id\} · \$\{costLabel\(card\)\}/);
  assert.match(sources.ui, /event-title-level-\$\{threatLevel\}/);
  assert.match(sources.ui, /event-level-label/);
  assert.doesNotMatch(sources.ui, /<span>回合/);
  assert.match(sources.ui, /dataset\.locked/);
  assert.match(sources.ui, /document\.body\.classList\.add\("modal-open"\)/);
  assert.match(sources.exploration, /showModal\([\s\S]*false\)/);
  assert.match(sources.exploration, /export function decisionContextHtml\(\)/);
  assert.match(sources.exploration, /export function candidateFitHtml\(card\)/);
  assert.match(sources.exploration, /if \(state\.chapterComplete\)[\s\S]*advanceChapter\(\)/);
  assert.doesNotMatch(sources.exploration, /export function continueExplore\(\)/);
  assert.doesNotMatch(sources.app, /continueExplore|continueButton/);
  assert.match(sources.state, /export function theoreticalElementBalance\(/);
  assert.match(sources.state, /export function missingBuildElements\(/);
  assert.match(sources.exploration, /data-workbench-action="replace"/);
  assert.match(sources.exploration, /data-workbench-action="upgrade"/);
  assert.match(sources.exploration, /data-workbench-action="store"/);
  assert.match(sources.exploration, /ondragstart/);
  assert.match(sources.exploration, /ondrop/);
  assert.doesNotMatch(sources.battle, /data-battle-retry|export function restartBattle/);
  assert.doesNotMatch(sources.app, /data-battle-retry|\brestartBattle\b/);
  assert.match(sources.battle, /确认结算并重新开始/);
  assert.match(sources.battle, /本轮已经完成结算/);
  assert.match(sources.app, /mode === "pve" && !won[\s\S]*restartAfterPveDefeat/);
  assert.doesNotMatch(sources.app, /生命降至1点并继续探索/);
  assert.match(sources.state, /awaitingPveRestart \? 0/);
  assert.match(sources.battle, /export function pvePanelOutcomes/);
  assert.match(sources.battle, /battle-result-winner/);
  assert.match(sources.battle, /battle-result-loser/);
  assert.match(sources.state, /export function expectedDeckPerformance/);
  assert.match(sources.ui, /export function damageForecastHtml/);
  assert.match(sources.exploration, /data-workbench-page/);
  assert.match(sources.exploration, /只有拖到已装订的同名书页上才能升级/);
});

test("renders the next-level preview and its responsive styling", async () => {
  const gameHtml = await readFile(new URL("../public/game.html", import.meta.url), "utf8");
  const levelCss = await readFile(new URL("../public/merlin-assets/level-preview.css", import.meta.url), "utf8");
  assert.match(gameHtml, /id="levelPreview"/);
  assert.match(gameHtml, /查看下一级效果/);
  assert.match(gameHtml, /level-preview\.css/);
  assert.match(levelCss, /event-title-level-2[\s\S]*#e8c45f/);
  assert.match(levelCss, /event-title-level-3[\s\S]*#f06f67/);
});

test("serves hydration assets and the standalone game directly on Cloudflare Pages", async () => {
  const prepareScript = await readFile(new URL("../scripts/prepare-pages-deploy.mjs", import.meta.url), "utf8");
  assert.match(prepareScript, /"\/_next\/static\/\*"/);
  assert.match(prepareScript, /"\/game"/);
  assert.match(prepareScript, /"\/game\.html"/);
  assert.match(prepareScript, /vinext-client-entry-manifest\.json/);
});
