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
  const modules = ["app", "battle", "cards", "content", "core", "exploration", "state", "store", "ui"];
  await Promise.all([
    access(new URL("../public/game.html", import.meta.url)),
    access(new URL("../public/merlin-assets/grimoire-game.css", import.meta.url)),
    ...modules.map((module) => access(new URL(`../public/merlin-assets/game/${module}.js`, import.meta.url))),
    access(new URL("../app/api/admin/reset-leaderboard/route.ts", import.meta.url)),
    ...routes.map((route) => access(new URL(`../app/api/${route}/route.ts`, import.meta.url))),
  ]);
  const game = await readFile(new URL("../public/game.html", import.meta.url), "utf8");
  const sources = Object.fromEntries(await Promise.all(modules.map(async (module) => [module, await readFile(new URL(`../public/merlin-assets/game/${module}.js`, import.meta.url), "utf8")])));
  const engine = Object.values(sources).join("\n");
  for (const id of ["exploreView", "battleView", "grimoireView", "archiveView", "shopView", "battleRestart"]) assert.match(game, new RegExp(`id="${id}"`));
  assert.match(game, /type="module" src="\.\/merlin-assets\/game\/app\.js"/);
  const cardIds = new Set([...engine.matchAll(/"((?:FI|WA|WI|EA|LI|DA|HY|CO)-\d{2})"/g)].map((match) => match[1]));
  assert.equal(cardIds.size, 85);
  assert.match(sources.state, /export function generateEvents\(\)/);
  assert.match(sources.exploration, /export function resolveEvent\(type\)/);
  assert.match(sources.battle, /export function drawCard\(\)/);
  assert.match(sources.battle, /export function paymentFor\(card\)/);
  assert.match(sources.battle, /export function startBattle\(mode/);
  assert.match(sources.battle, /export function targetLowest\(\)/);
  assert.match(sources.core, /export function variance\(\)/);
  assert.match(sources.core, /\.4 \+ 2\.6 \* Math\.pow\(Math\.random\(\), 10 \/ 3\)/);
  assert.match(sources.battle, /b\.drawPile = shuffle\(state\.deck\)/);
  assert.match(sources.battle, /元素不足发动残响，不消耗元素/);
  assert.match(sources.battle, /mode === "pve" \? "player"/);
  assert.match(sources.battle, /b\.enemyFatigue = target\.hp <= 0 \? 0/);
  assert.match(sources.state, /localStorage\.setItem\(SAVE_KEY/);
  assert.match(sources.state, /type: "merlin:state"/);
  assert.match(sources.app, /from "\.\/battle\.js"/);
  assert.match(sources.exploration, /from "\.\/battle\.js"/);
});

test("serves hydration assets and the standalone game directly on Cloudflare Pages", async () => {
  const prepareScript = await readFile(new URL("../scripts/prepare-pages-deploy.mjs", import.meta.url), "utf8");
  assert.match(prepareScript, /"\/_next\/static\/\*"/);
  assert.match(prepareScript, /"\/game"/);
  assert.match(prepareScript, /"\/game\.html"/);
  assert.match(prepareScript, /vinext-client-entry-manifest\.json/);
});
