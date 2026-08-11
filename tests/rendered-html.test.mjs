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

test("renders the playable game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /梅林的魔法书/);
  assert.match(html, /iframe/);
  assert.match(html, /prototype\/index\.html\?hand=paired/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the game and social preview assets", async () => {
  const [gameHtml] = await Promise.all([
    readFile(new URL("../dist/client/prototype/index.html", import.meta.url), "utf8"),
    access(new URL("../dist/client/og.png", import.meta.url)),
  ]);
  assert.match(gameHtml, /assets\/index-/);
});
