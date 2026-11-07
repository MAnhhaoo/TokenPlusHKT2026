import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = join(packageRoot, "dist");
const indexPath = join(distDirectory, "index.html");

assert.ok(existsSync(indexPath), "User build must emit dist/index.html");

const html = readFileSync(indexPath, "utf8");
const assets = [...html.matchAll(/(?:src|href)="([^\"]*\/assets\/[^\"]+)"/g)].map(
  (match) => match[1],
);

assert.ok(assets.length > 0, "built index must reference bundled assets");

for (const asset of assets) {
  const assetPath = join(distDirectory, asset.replace(/^\/+/, ""));
  assert.ok(existsSync(assetPath), `missing built asset: ${asset}`);
  assert.ok(statSync(assetPath).size > 0, `built asset is empty: ${asset}`);
}

console.log(`User build smoke check passed (${assets.length} assets)`);
