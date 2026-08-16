import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("player entities use an attached component instead of class inheritance", async () => {
  const model = await readJson("abi/server-object-model.json");
  assert.equal(model.playerComposition.representation, "intersection-and-component");
  assert.equal(model.playerComposition.classicalInheritance, false);
  assert.equal(model.playerComposition.entityDiscriminator, "server.GameEntity.isPlayer");
  assert.equal(model.playerComposition.componentAccessor, "server.GameEntity.player");
  assert.equal(model.playerComposition.originComponentClass, "GamePlayer");
  assert.equal(model.playerComposition.status, "confirmed");
});

test("server object model retains shared value-object dependencies", async () => {
  const model = await readJson("abi/server-object-model.json");
  assert.deepEqual(model.sharedTypes.map(entry => entry.documentedOwner), [
    "GameVector3",
    "GameQuaternion",
    "GameBounds3",
    "GameRGBColor",
    "GameRGBAColor",
    "GameAnimation",
    "GameEventHandlerToken",
    "Sound",
  ]);
  assert.ok(model.entities.GameEntity.dependencies.includes("GameVector3"));
  assert.ok(model.entities.GamePlayerEntity.dependencies.includes("GameBounds3"));
});

test("RuntimeEntity adapter covers every local member without false implements", async () => {
  const map = await readJson("abi/runtime-entity-adapter-map.json");
  const local = await readJson("generated/local-server-runtime-analysis.json");
  const localIds = local.entries.filter(entry => entry.owner === "RuntimeEntity").map(entry => entry.id).sort();
  assert.deepEqual(map.members.map(entry => entry.local.id).sort(), localIds);
  assert.equal(map.summary.memberCount, map.members.length);
  assert.equal(map.summary.compatible, map.members.filter(entry => entry.status === "compatible").length);
  assert.equal(map.summary.partial, map.members.filter(entry => entry.status === "partial").length);
  assert.equal(map.summary.extensions, map.members.filter(entry => entry.status === "extension").length);
  assert.ok(map.members.every(entry => entry.implements.every(id => entry.canonicalTargets.some(target => target.id === id))));
  const mesh = map.members.find(entry => entry.local.id === "server.RuntimeEntity.mesh");
  assert.equal(mesh.status, "partial");
  assert.deepEqual(mesh.canonicalTargets.map(entry => entry.id), ["server.GameEntity.mesh"]);
  assert.match(mesh.gaps.effect[0], /later writes remain script-local/);
  const interactHint = map.members.find(entry => entry.local.id === "server.RuntimeEntity.interactHint");
  assert.equal(interactHint.status, "partial");
  assert.match(interactHint.gaps.effect[0], /hint text is not projected/);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
