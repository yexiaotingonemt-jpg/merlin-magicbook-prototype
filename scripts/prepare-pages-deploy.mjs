import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const serverDir = resolve(root, "dist/server");
const clientDir = resolve(root, "dist/client");
const workerDir = resolve(clientDir, "_worker.js");
const deployRedirect = resolve(root, ".wrangler/deploy/config.json");

await rm(workerDir, { recursive: true, force: true });
await mkdir(workerDir, { recursive: true });
await cp(serverDir, workerDir, { recursive: true });
// The Cloudflare Vite plugin writes a local Worker redirect for `vinext start`.
// Pages must instead read the root Wrangler config so production D1 bindings
// are attached to the deployment.
await rm(deployRedirect, { force: true });

await writeFile(
  resolve(clientDir, "_routes.json"),
  JSON.stringify({ version: 1, include: ["/*"], exclude: ["/merlin-assets/*", "/favicon.svg"] }, null, 2) + "\n",
);

console.log(`Prepared Cloudflare Pages output at ${clientDir}`);
