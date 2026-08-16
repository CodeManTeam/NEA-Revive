import assert from "node:assert/strict";
import test from "node:test";
import { GameBounds3, GameZoneSystem, RuntimeGameZone } from "../../../Frontend/demo-map/src/runtime/game-zones.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";
import { gameZoneContract } from "../conformance/game-zone.mjs";

test("GameZone preserves recovered selector, bounds, event, and removal lifecycle", async () => {
  const system = new GameZoneSystem();
  const zone = system.add({ bounds: new GameBounds3([0, 0, 0], [2, 2, 2]), selector: ".runner" });
  assert.ok(zone instanceof RuntimeGameZone);
  const entity = { id: "runner", position: new Vector3(2.5, 1, 1), bounds: new Vector3(0.5, 0.5, 0.5), hasTag: tag => tag === "runner" };
  const entered = zone.nextEnter();
  system.poll(7, [entity]);
  assert.deepEqual(Object.keys(await entered).sort(), [...gameZoneContract.eventFields].sort());
  assert.deepEqual(zone.entities(), [entity]);
  const left = zone.nextLeave();
  system.remove(zone);
  assert.equal((await left).entity, entity);
  assert.deepEqual(system.list(), []);
});

test("GameZone re-normalizes selector mutations and rejects collides false", () => {
  const system = new GameZoneSystem();
  const zone = system.add({ bounds: new GameBounds3([0, 0, 0], [2, 2, 2]), selector: " player, .runner " });
  const player = { id: "player-a", isPlayer: true, collides: true, position: new Vector3(1, 1, 1), bounds: new Vector3(0.5, 0.5, 0.5), hasTag: () => false };
  const ghost = { id: "ghost", collides: false, position: new Vector3(1, 1, 1), bounds: new Vector3(0.5, 0.5, 0.5), hasTag: tag => tag === "runner" };
  assert.equal(zone.selector, ".runner,player");
  system.poll(1, [player, ghost]);
  assert.deepEqual(zone.entities(), [player]);
  zone.selector = " #ghost ";
  system.poll(2, [player, ghost]);
  assert.equal(zone.selector, "#ghost");
  assert.deepEqual(zone.entities(), []);
  assert.equal(gameZoneContract.matchRules.collides, "false-excluded");
});
