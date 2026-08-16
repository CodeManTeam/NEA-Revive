import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("local shared runtime represents every documented GameVector3 member", async () => {
  const analysis = await readJson("generated/local-shared-runtime-analysis.json");
  const docs = await readJson("generated/docs-api-index.json");
  const documentedIds = docs.entries.filter(entry => entry.owner === "GameVector3").map(entry => entry.id).sort();
  const implementedIds = analysis.entries.filter(entry => entry.id.startsWith("shared.GameVector3.")).map(entry => entry.id).sort();
  assert.deepEqual(implementedIds, documentedIds);
  assert.equal(analysis.summary.gameVector3.entries, 31);
  assert.equal(analysis.summary.gameVector3.confirmed, 30);
  assert.equal(analysis.summary.gameVector3.partial, 1);
});

test("GameVector3 equals remains explicitly partial", async () => {
  const analysis = await readJson("generated/local-shared-runtime-analysis.json");
  const equals = analysis.entries.find(entry => entry.id === "shared.GameVector3.equals");
  assert.equal(equals?.availability, "partial");
  assert.ok(equals?.notes.some(note => note.includes("EPSILON$2")));
  assert.ok(equals?.evidence.some(item => item.symbol === "module 48388 EPSILON = 1e-6"));
});

test("shared runtime catalog remains separate from client and server catalogs", async () => {
  const shared = await readJson("abi/shared-runtime.json");
  const current = await readJson("abi/current-runtime.json");
  assert.equal(shared.side, "shared");
  assert.ok(shared.entries.some(entry => entry.id === "shared.GameVector3.cross"));
  assert.ok(current.entries.some(entry => entry.id === "shared.GameVector3.cross"));
  assert.equal(shared.entries.some(entry => entry.side !== "shared"), false);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
