import assert from "node:assert/strict";
import test from "node:test";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

function makeRuntime() {
  return new ScriptRuntime({
    projectRoot: process.cwd(),
    projectName: "damage-semantics-test",
    entry: null,
    modules: {},
    tickRate: 20,
    runtimeApiVersion: "test",
    serverContract: "test",
    compatibilityLevel: "test",
    capabilities: ["server.world.events", "server.player.write"],
    physics: {
      gravity: -20,
      playerBody: {
        origin: "body-center",
        boundsHalfExtents: [0.45, 1.1, 0.45],
        shapeHalfExtents: [0.45, 1.1, 0.45],
      },
    },
    shape: [16, 16, 16],
    blockCatalog: [{ id: 1, name: "air" }],
    voxels: [],
    validatedSkinIds: {},
  });
}

test("damage follows historical hp<0 death and non-negative respawn semantics", () => {
  const runtime = makeRuntime();
  const player = runtime.addPlayer({ id: "p1", name: "Tester" });
  player.maxHp = 20;
  player.hp = 20;

  player.damage(20);
  assert.equal(player.hp, 0);
  assert.equal(player.dead, false);

  player.damage(1);
  assert.equal(player.hp, -1);
  assert.equal(player.dead, true);

  player.damage(-1);
  assert.equal(player.hp, 0);
  assert.equal(player.dead, false);
});

test("dead players do not take additional damage until healed", () => {
  const runtime = makeRuntime();
  const player = runtime.addPlayer({ id: "p1" });
  player.hp = -1;
  player.damage(10);
  assert.equal(player.hp, -1);
});

test("particle properties are available on players and preserved in snapshots", () => {
  const runtime = makeRuntime();
  const player = runtime.addPlayer({ id: "p1" });
  player.particleRate = 30;
  player.particleLifetime = 1;
  player.particleVelocity = [0, 0.5, 0];
  player.particleSize = [2, 4, 8, 4, 10];
  const snapshot = runtime.snapshot().players[0];
  assert.equal(player.particleRate, 30);
  assert.deepEqual(snapshot.particles.velocity, [0, 0.5, 0]);
  assert.deepEqual(snapshot.particles.size, [2, 4, 8, 4, 10]);
});
