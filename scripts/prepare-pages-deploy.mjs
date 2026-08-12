import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const serverDir = resolve(root, "dist/server");
const clientDir = resolve(root, "dist/client");
const workerDir = resolve(clientDir, "_worker.js");
const deployRedirect = resolve(root, ".wrangler/deploy/config.json");

await rm(workerDir, { recursive: true, force: true });
await mkdir(workerDir, { recursive: true });
await cp(serverDir, workerDir, { recursive: true });

// A mixed build (for example, two Vinext builds writing dist concurrently)
// leaves the Worker pointing at a client entry that no longer exists. The page
// still renders, but React never hydrates and the login button stays disabled.
// Fail the publish preparation instead of shipping that broken combination.
const clientEntryManifest = JSON.parse(
  await readFile(resolve(clientDir, "vinext-client-entry-manifest.json"), "utf8"),
);
const clientEntry = clientEntryManifest.appBrowserEntry;
if (typeof clientEntry !== "string" || clientEntry.length === 0) {
  throw new Error("Cloudflare Pages build is missing its Vinext client entry");
}
await access(resolve(clientDir, clientEntry));
const workerAssetsManifest = await readFile(
  resolve(workerDir, "__vite_rsc_assets_manifest.js"),
  "utf8",
);
if (!workerAssetsManifest.includes(clientEntry)) {
  throw new Error(`Cloudflare Pages Worker references a stale client entry: ${clientEntry}`);
}
// The Cloudflare Vite plugin writes a local Worker redirect for `vinext start`.
// Pages must instead read the root Wrangler config so production D1 bindings
// are attached to the deployment.
await rm(deployRedirect, { force: true });

await writeFile(
  resolve(clientDir, "_routes.json"),
  JSON.stringify(
    {
      version: 1,
      include: ["/*"],
      // Cloudflare Pages redirects `/game.html` to the clean `/game` URL.
      // Both paths must bypass the Vinext worker so the standalone game stays static.
      exclude: ["/_next/static/*", "/merlin-assets/*", "/game", "/game.html", "/*.svg"],
    },
    null,
    2,
  ) + "\n",
);

console.log(`Prepared Cloudflare Pages output at ${clientDir}`);
