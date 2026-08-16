import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedIds = [
  "client.object.Coord2",
  "client.Coord2.create",
  "client.Coord2.offset",
  "client.Coord2.scale",
  "client.object.Vec2",
  "client.Vec2.copy",
  "client.Vec2.create",
  "client.Vec2.x",
  "client.Vec2.y",
  "client.object.Vec3",
  "client.Vec3.b",
  "client.Vec3.copy",
  "client.Vec3.create",
  "client.Vec3.g",
  "client.Vec3.r",
  "client.Vec3.x",
  "client.Vec3.y",
  "client.Vec3.z",
];

test("archived Player confirms the client UI vector wrappers", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of expectedIds) {
    const entry = entries.get(id);
    assert.ok(entry, `${id} missing from client runtime analysis`);
    assert.equal(entry.side, "client");
    assert.equal(entry.availability, "confirmed");
    assert.equal(entry.compatibility, "native");
    assert.equal(entry.capability, "client.ui");
    assert.ok(entry.evidence.some(item => item.symbol === "module 21050 Coord2 / Vec2 / Vec3 wrappers"));
  }
});

test("client vector aliases preserve the documented writable surface", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of ["client.Vec2.x", "client.Vec2.y", "client.Vec3.x", "client.Vec3.y", "client.Vec3.z", "client.Vec3.r", "client.Vec3.g", "client.Vec3.b"]) {
    assert.equal(entries.get(id)?.signature.readonly, false, `${id} should remain writable`);
  }
  assert.equal(entries.get("client.Coord2.offset")?.signature.readonly, true);
  assert.equal(entries.get("client.Coord2.scale")?.signature.readonly, true);
});

test("client vector ABI never leaks into the server runtime side", async () => {
  const current = await readJson("abi/current-runtime.json");
  for (const id of expectedIds) {
    const entry = current.entries.find(item => item.id === id);
    assert.ok(entry, `${id} missing from composed current runtime`);
    assert.equal(entry.side, "client");
  }
  assert.equal(current.entries.some(entry => entry.side === "server" && /(?:Coord2|Vec2|Vec3)/.test(entry.id)), false);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
