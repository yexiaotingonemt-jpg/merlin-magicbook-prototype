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
  assert.match(game, /function eventAttack\(event\) \{ return Math\.floor\(event\.maxHp\*\.8\); \}/);
  assert.match(game, /攻击 "\+eventAttack\(event\)/);
  assert.match(game, /var damage=eventAttack\(e\);state\.health=Math\.max\(0,state\.health-damage\)/);
  assert.match(game, /if\(e\.countdown===0\)/);
  assert.match(game, /notifyParentModal/);
  assert.match(game, /modal:"help"/);
  assert.match(game, /function drawCard\(excludeName,forcedFaction\)/);
  assert.match(game, /targetFaction=old\.faction==="angel"\?"demon":"angel"/);
  assert.match(game, /drawCard\(null,targetFaction\)/);
  assert.match(game, /普通70%／稀有30%/);
  assert.match(game, /HAND_DAMAGE_MULTIPLIER=1\.3/);
  assert.match(game, /\{tier:"中级",weight:3,hpRate:\.60/);
  assert.match(game, /\{tier:"高级",weight:2,hpRate:\.80/);
  assert.match(game, /attack:\{hpRate:\.30/);
  assert.match(game, /trapped:\{hpRate:1\.00/);
  assert.match(game, /convert:\{hpRate:1\.20/);
  assert.match(game, /EVENT_HEALTH_VERSION=2/);
  assert.match(game, /state\.permanentAttack\+=3/);
  assert.match(game, /攻击成长固定\+3/);
  assert.doesNotMatch(game, /state\.permanentAttack\+=1/);
  assert.match(game, /state\.board=state\.board\.map\(migrateLegacyEventHealth\)/);
  assert.doesNotMatch(game, /name:"处决"/);
  assert.doesNotMatch(game, /name:"吞噬"/);
  assert.match(game, /name:"深渊坍塌",faction:"demon",rarity:"normal"/);
  assert.match(game, /name:"深渊灭界"[\s\S]{0,180}coeff:5\/12/);
  assert.match(game, /总倍率500%/);
  assert.doesNotMatch(game, /name:"深渊灭界"[\s\S]{0,180}coeff:2\.5\/12/);
  assert.doesNotMatch(game, /card\.range==="execute"/);
  assert.doesNotMatch(game, /card\.range==="devour"/);
  assert.doesNotMatch(game, /exploded=new Set/);
  assert.doesNotMatch(game, /overflowed=new Set/);
  assert.match(game, /var poolSize=cards\.filter/);
  assert.match(game, /migrated\.name==="处决"\|\|migrated\.name==="吞噬"/);
  assert.match(game, /将任意1个目标转化为"\+meta\[card\.element\]\.label\+"。"/);
  assert.match(game, /将第一排全部目标转化为"\+meta\[card\.element\]\.label\+"。"/);
  assert.doesNotMatch(game, /card\.mode==="purify"[\s\S]{0,300}共鸣时每格造成/);
  assert.doesNotMatch(game, /三格共鸣时每格造成/);
  assert.doesNotMatch(game, /四格共鸣时，每格造成/);
  assert.match(game, /baseHealth:300,maxHealth:base\.maxHealth\|\|300,health:base\.maxHealth\|\|300/);
  assert.match(game, /Number\(incoming\.baseHealth\)!==300/);
  assert.match(game, /state\.maxHealth=previousMax\+200/);
  assert.match(game, /simulatedPurificationLines/);
  assert.match(game, /purificationPreviewDamage/);
  assert.match(game, /function resonanceDamage\(attack\) \{ return Math\.floor\(attack\); \}/);
  assert.match(game, /每次共鸣命中均造成触发时攻击力100%的伤害/);
  assert.doesNotMatch(game, /function resonanceDamage\(attack\) \{ return Math\.floor\(attack\*\.5\); \}/);
  assert.match(game, /candidateDamage\+=resonanceDamage\(attack\)/);
  assert.match(game, /damageByIndex\[i\]=\(damageByIndex\[i\]\|\|0\)\+lineDamage/);
  assert.match(game, /function resolveFallResonance\(attackSnapshot,moved\)/);
  assert.match(game, /连锁次数不设上限/);
  assert.match(game, /applyResonance\(moved\.indices/);
  assert.match(game, /while\(moved&&moved\.indices&&moved\.indices\.length\)/);
  assert.doesNotMatch(game, /round\s*[<]=?\s*5/);
  assert.match(game, /await resolveFallResonance\(resonanceAttack,purifyMoved\)/);
  assert.match(game, /await resolveFallResonance\(attackSnapshot,moved\)/);
  assert.doesNotMatch(game, /resolveDemonFalls/);
  assert.match(game, /applyResonance\(changed,"净化共鸣",resonanceDamage\(resonanceAttack\)\)/);
  assert.match(game, /var damage=resonanceDamage\(attackSnapshot\)/);
  assert.doesNotMatch(game, /var coefficients=\[\.20,\.15,\.10,\.05\]/);
  assert.doesNotMatch(game, /standardPerCellCoefficient/);
  assert.match(game, /resonanceResolving:false/);
  assert.match(game, /if\(state\.resonanceResolving\)return false;\s*state\.turn\+=1/);
  assert.match(game, /共鸣伤害、事件消除、下落补位及后续连锁全部完成前/);
  const resonanceUnlock = game.indexOf("state.resonanceResolving=false;\n      state.hand[handIndex]");
  const enemyTurn = game.indexOf("await advanceTurn();", resonanceUnlock);
  assert.ok(resonanceUnlock >= 0 && enemyTurn > resonanceUnlock, "enemy turn must start after the resonance lock is released");
  assert.doesNotMatch(game, /function mergeLines/);
  assert.match(game, /state\.boosted\?2:1\.5/);
  assert.match(game, /state\.boosted\?1\.4:1\.2/);
  const adminReset = await readFile(new URL("../app/api/admin/reset-leaderboard/route.ts", import.meta.url), "utf8");
  assert.match(adminReset, /db\.delete\(projections\)/);
  assert.match(adminReset, /db\.delete\(accounts\)/);
  assert.doesNotMatch(adminReset, /db\.update\(accounts\)/);
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
  assert.match(prepareScript, /vinext-client-entry-manifest\.json/);
  assert.match(prepareScript, /workerAssetsManifest\.includes\(clientEntry\)/);
  assert.match(prepareScript, /Worker references a stale client entry/);
});
