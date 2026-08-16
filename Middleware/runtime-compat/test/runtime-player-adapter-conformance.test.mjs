import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("RuntimePlayer canonical map covers every public local member", async () => {
  const map = await readJson("abi/runtime-player-adapter-map.json");
  const local = await readJson("generated/local-server-runtime-analysis.json");
  const localIds = local.entries.filter(entry => entry.owner === "RuntimePlayer").map(entry => entry.id).sort();
  const mappedIds = map.members.map(entry => entry.local.id).sort();
  assert.deepEqual(mappedIds, localIds);
  assert.equal(map.summary.memberCount, mappedIds.length);
  assert.equal(map.summary.compatible, map.members.filter(entry => entry.status === "compatible").length);
  assert.equal(map.summary.partial, map.members.filter(entry => entry.status === "partial").length);
  assert.equal(map.summary.extensions, map.members.filter(entry => entry.status === "extension").length);
  assert.ok(map.summary.partial >= 13);
  assert.equal(map.summary.extensions, 4);
  assert.ok(map.members.filter(entry => entry.status !== "compatible").every(entry => entry.implements.length === 0));
});

test("RuntimePlayer remains a composite instead of claiming GamePlayerEntity", async () => {
  const map = await readJson("abi/runtime-player-adapter-map.json");
  assert.equal(map.localObject.status, "extension");
  assert.deepEqual(map.localObject.composition, ["server.GameEntity", "server.GamePlayerEntity"]);
  assert.deepEqual(member(map, "server.RuntimePlayer.name").canonicalTargets.map(entry => entry.id), ["server.GamePlayerEntity.name"]);
  assert.deepEqual(member(map, "server.RuntimePlayer.userId").canonicalTargets.map(entry => entry.id), ["server.GamePlayerEntity.userId"]);
  assert.equal(member(map, "server.RuntimePlayer.userId").status, "partial");
  assert.match(member(map, "server.RuntimePlayer.userId").gaps.effect[0], /historical account identity ingress remains unavailable/);
  assert.match(member(map, "server.RuntimePlayer.userKey").gaps.effect[0], /historical account key ingress remains unavailable/);
  for (const name of ["spectator", "cameraYaw", "cameraPitch", "cameraMode", "cameraFovY", "moveState", "canFly"]) {
    const stateMember = member(map, `server.RuntimePlayer.${name}`);
    assert.equal(stateMember.status, "partial");
    assert.deepEqual(stateMember.canonicalTargets.map(entry => entry.id), [`server.GamePlayerEntity.${name}`]);
    assert.match(stateMember.gaps.effect[0], /preserved Player PUBLIC schema has no recovered field or projection/);
  }
  for (const name of ["invisible", "showName", "showIndicator"]) {
    const stateMember = member(map, `server.RuntimePlayer.${name}`);
    assert.equal(stateMember.status, "partial");
    assert.match(stateMember.gaps.effect[0], /preserved Player PUBLIC schema has no recovered field or projection/);
  }
  assert.match(member(map, "server.RuntimePlayer.walkState").gaps.effect[0], /input producer does not currently update/);
  for (const name of ["wearables", "addWearable", "removeWearable"]) {
    assert.match(member(map, `server.RuntimePlayer.${name}`).gaps.effect.at(-1), /preserved Player avatar rendering projection remains unavailable/);
  }
  assert.deepEqual(member(map, "server.RuntimePlayer.position").canonicalTargets.map(entry => entry.id), ["server.GameEntity.position"]);
  assert.deepEqual(member(map, "server.RuntimePlayer.health").canonicalTargets.map(entry => entry.id), ["server.GameEntity.hp"]);
  assert.equal(member(map, "server.RuntimePlayer.color").canonicalTargets[0].id, "server.GamePlayerEntity.color");
  assert.equal(member(map, "server.RuntimePlayer.forceRespawn").canonicalTargets[0].id, "server.GamePlayerEntity.forceRespawn");
  assert.equal(member(map, "server.RuntimePlayer.kick").canonicalTargets[0].id, "server.GamePlayerEntity.kick");
  assert.match(member(map, "server.RuntimePlayer.kick").gaps.effect[0], /targeted MuDB session closes/);
  assert.equal(member(map, "server.RuntimePlayer.link").canonicalTargets[0].id, "server.GamePlayerEntity.link");
  assert.match(member(map, "server.RuntimePlayer.link").gaps.effect[0], /ref\.openLink packet/);
  assert.equal(member(map, "server.RuntimePlayer.nextRespawn").canonicalTargets.length, 0);
  assert.equal(member(map, "server.RuntimePlayer.onTakeDamage").canonicalTargets[0].id, "server.GameEntity.onTakeDamage");
  assert.equal(member(map, "server.RuntimePlayer.nextTakeDamage").canonicalTargets.length, 0);
  assert.equal(member(map, "server.RuntimePlayer.snapshot").status, "extension");
});

test("GameEntityEvent records canonical fields and isolates the player alias", async () => {
  const map = await readJson("abi/runtime-player-adapter-map.json");
  const entityEvent = map.events.find(event => event.canonicalObject === "server.GameEntityEvent");
  const damageEvent = map.events.find(event => event.canonicalObject === "server.GameDamageEvent");
  assert.deepEqual(entityEvent.canonicalFields, ["tick", "entity"]);
  assert.deepEqual(entityEvent.localAliases, [{ name: "player", target: "entity" }]);
  assert.equal(entityEvent.status, "partial");
  assert.deepEqual(damageEvent.canonicalFields, ["tick", "entity", "attacker", "damage", "damageType"]);
  assert.equal(damageEvent.status, "partial");
});

function member(map, id) {
  const entry = map.members.find(item => item.local.id === id);
  assert.ok(entry, `${id} missing from RuntimePlayer adapter map`);
  return entry;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
