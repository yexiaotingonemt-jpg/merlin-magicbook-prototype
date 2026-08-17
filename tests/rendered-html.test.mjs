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
  await Promise.all([
    access(new URL("../public/game.html", import.meta.url)),
    access(new URL("../public/merlin-assets/grimoire-game.css", import.meta.url)),
    access(new URL("../public/merlin-assets/grimoire-game.js", import.meta.url)),
    access(new URL("../app/api/admin/reset-leaderboard/route.ts", import.meta.url)),
    ...routes.map((route) => access(new URL(`../app/api/${route}/route.ts`, import.meta.url))),
  ]);
  const game = await readFile(new URL("../public/game.html", import.meta.url), "utf8");
  const engine = await readFile(new URL("../public/merlin-assets/grimoire-game.js", import.meta.url), "utf8");
  for (const id of ["exploreView", "battleView", "grimoireView", "archiveView", "shopView", "battleRestart"]) assert.match(game, new RegExp(`id="${id}"`));
  const cardIds = new Set([...engine.matchAll(/"((?:FI|WA|WI|EA|LI|DA|HY|CO)-\d{2})"/g)].map((match) => match[1]));
  assert.equal(cardIds.size, 85);
  assert.match(engine, /function generateEvents\(\)/);
  assert.match(engine, /function resolveEvent\(type\)/);
  assert.match(engine, /function drawCard\(\)/);
  assert.match(engine, /function paymentFor\(card\)/);
  assert.match(engine, /function startBattle\(mode/);
  assert.match(engine, /function targetLowest\(\)/);
  assert.match(engine, /function variance\(\)/);
  assert.match(engine, /\.4 \+ 2\.6 \* Math\.pow\(Math\.random\(\), 10 \/ 3\)/);
  assert.match(engine, /b\.drawPile = shuffle\(state\.deck\)/);
  assert.match(engine, /元素不足发动残响，不消耗元素/);
  assert.match(engine, /mode === "pve" \? "player"/);
  assert.match(engine, /b\.enemyFatigue = target\.hp <= 0 \? 0/);
  assert.match(engine, /localStorage\.setItem\(SAVE_KEY/);
  assert.match(engine, /type: "merlin:state"/);
});

test("serves hydration assets and the standalone game directly on Cloudflare Pages", async () => {
  const prepareScript = await readFile(new URL("../scripts/prepare-pages-deploy.mjs", import.meta.url), "utf8");
  assert.match(prepareScript, /"\/_next\/static\/\*"/);
  assert.match(prepareScript, /"\/game"/);
  assert.match(prepareScript, /"\/game\.html"/);
  assert.match(prepareScript, /vinext-client-entry-manifest\.json/);
});
