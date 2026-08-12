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
    ...routes.map((route) => access(new URL(`../app/api/${route}/route.ts`, import.meta.url))),
  ]);
  const shell = await readFile(new URL("../app/game-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /api\/leaderboard/);
  assert.match(shell, /api\/projection/);
  assert.match(shell, /api\/reset/);
});

test("serves hydration assets directly on Cloudflare Pages", async () => {
  const prepareScript = await readFile(
    new URL("../scripts/prepare-pages-deploy.mjs", import.meta.url),
    "utf8",
  );
  assert.match(prepareScript, /"\/_next\/static\/\*"/);
  assert.match(prepareScript, /"\/game\.html"/);
});
