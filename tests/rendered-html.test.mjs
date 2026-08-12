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

test("server-renders the Merlin multiplayer entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>梅林的魔法书 3\.0 · 多人版<\/title>/);
  assert.match(html, /开启魔法书/);
  assert.match(html, /输入账号开始游戏/);
  assert.match(html, /src="\/game\.html"/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("ships the game and every multiplayer API route", async () => {
  const routes = ["account", "leaderboard", "players", "projection", "reset", "state"];
  await Promise.all([
    access(new URL("../public/game.html", import.meta.url)),
    access(new URL("../app/api/admin/reset-leaderboard/route.ts", import.meta.url)),
    ...routes.map((route) => access(new URL(`../app/api/${route}/route.ts`, import.meta.url))),
  ]);
  const shell = await readFile(new URL("../app/game-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /api\/leaderboard/);
  assert.match(shell, /api\/projection/);
  assert.match(shell, /api\/reset/);
  assert.match(shell, /投影机会已激活/);
  assert.match(shell, /setProjectionOpen\(true\)/);
  assert.doesNotMatch(shell, /setTab\("projection"\)/);
  assert.match(shell, /积分性价比/);
  assert.match(shell, /重置排行榜/);
  assert.match(shell, /对方完整棋盘（含预览行）/);
  assert.match(shell, /pendingGameLoad/);
  assert.match(shell, /merlin:modal/);
  assert.match(shell, /game-modal-open/);
  const game = await readFile(new URL("../public/game.html", import.meta.url), "utf8");
  assert.match(game, /id="logToggle"/);
  assert.match(game, /恶魔 50/);
  assert.match(game, /comboPenaltyRate/);
  assert.match(game, /healing-orb/);
  assert.match(game, /准备攻击/);
  assert.match(game, /if\(e\.countdown===0\)/);
  assert.match(game, /notifyParentModal/);
  assert.match(game, /modal:"help"/);
  assert.match(game, /function drawCard\(excludeName,forcedFaction\)/);
  assert.match(game, /targetFaction=old\.faction==="angel"\?"demon":"angel"/);
  assert.match(game, /drawCard\(null,targetFaction\)/);
  assert.match(game, /普通70%／稀有30%/);
  assert.doesNotMatch(game, /用1张，按概率摸1张/);
});

test("serves hydration assets and the standalone game directly on Cloudflare Pages", async () => {
  const prepareScript = await readFile(
    new URL("../scripts/prepare-pages-deploy.mjs", import.meta.url),
    "utf8",
  );
  assert.match(prepareScript, /"\/_next\/static\/\*"/);
  assert.match(prepareScript, /"\/game"/);
  assert.match(prepareScript, /"\/game\.html"/);
});
