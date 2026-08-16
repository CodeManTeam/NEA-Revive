import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { GameVoxelsRuntime, VOXEL_ROTATION_SHIFT } from "../src/runtime/game-voxels.mjs";
import { FixedStepPlayerPhysics } from "../src/runtime/physics/fixed-step-physics.mjs";
import { PlayerPhysicsBody } from "../src/runtime/physics/player-body.mjs";
import { VoxelCollisionWorld } from "../src/runtime/physics/voxel-collision-world.mjs";

const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const catalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");
const nonAir = catalog.find(entry => entry.id !== 0);
const missingId = Array.from({ length: 4096 }, (_, id) => id).find(id => !catalog.some(entry => entry.id === id));

test("preserved BlockInfo catalog decodes the authoritative name/id mapping", () => {
  assert.equal(catalog.length, 384);
  const air = catalog.find(entry => entry.id === 0);
  assert.equal(air.id, 0);
  assert.equal(air.name, "air");
  // block-info.mjs now emits the recovered 6-channel texture palette alongside
  // id/name; assert the identity fields and the palette shape without pinning
  // the whole entry.
  assert.ok(Array.isArray(air.textures));
  assert.ok(nonAir);
});

test("GameVoxels id and full-id reads follow historical ScriptVoxelSync semantics", () => {
  const { voxels } = createVoxels();
  assert.equal(voxels.id(nonAir.name), nonAir.id);
  assert.equal(voxels.id(nonAir.name.toUpperCase()), 0);
  assert.equal(voxels.id(42), 0);
  const fullId = nonAir.id | (3 << VOXEL_ROTATION_SHIFT);
  assert.equal(voxels.setVoxelId(2.9, 3.8, 4.7, fullId), fullId);
  assert.equal(voxels.getVoxelId(2.1, 3.1, 4.1), fullId);
  assert.equal(voxels.getVoxelId(-0.1, 3, 4), 0);
  assert.equal(voxels.getVoxelId(7, 3, 4), 0);
});

test("GameVoxels name, getVoxel, and getVoxelRotation preserve the historical bit operations", () => {
  const { voxels } = createVoxels();
  const fullId = nonAir.id | (3 << VOXEL_ROTATION_SHIFT);
  voxels.setVoxelId(2, 3, 4, fullId);
  assert.equal(voxels.name(fullId), nonAir.name);
  assert.equal(voxels.name("${nonAir.id}"), "");
  assert.equal(voxels.name(missingId), "");
  assert.equal(voxels.name(Number.NaN), "air");
  assert.equal(voxels.getVoxel(2, 3, 4), nonAir.id);
  assert.equal(voxels.getVoxelRotation(2, 3, 4), 3);
  assert.equal(voxels.getVoxelRotation(-1, 3, 4), 0);
});

test("GameVoxels shape and VoxelTypes come directly from world dimensions and BlockInfo", () => {
  const { voxels } = createVoxels();
  assert.deepEqual(voxels.shape, { x: 7, y: 7, z: 7 });
  assert.deepEqual(voxels.VoxelTypes, catalog.map(entry => entry.name).filter(Boolean).sort());
  assert.equal(voxels.VoxelTypes.includes(nonAir.name), true);
});

test("GameVoxels rejects unknown base ids and applies explicit setVoxel rotation", () => {
  const { voxels } = createVoxels();
  assert.notEqual(missingId, undefined);
  assert.equal(voxels.setVoxelId(1, 1, 1, missingId), 0);
  assert.equal(voxels.getVoxelId(1, 1, 1), 0);
  const eastId = nonAir.id | (2 << VOXEL_ROTATION_SHIFT);
  assert.equal(voxels.setVoxel(1.9, 2.9, 3.9, nonAir.name, "east"), eastId);
  assert.equal(voxels.getVoxelId(1, 2, 3), eastId);
  assert.equal(voxels.setVoxel(2, 2, 2, nonAir.id | (3 << VOXEL_ROTATION_SHIFT)), nonAir.id);
});

test("voxel writes update collision candidates instead of only the script-visible store", () => {
  const { world, voxels } = createVoxels();
  const physics = new FixedStepPlayerPhysics(world, physicsConfig());
  const body = new PlayerPhysicsBody({
    id: "voxel-runtime-test",
    position: [1.5, 3, 1.5],
    velocity: [0, -20, 0],
    profile: physicsConfig().playerBody,
  });
  voxels.setVoxelId(1, 0, 1, nonAir.id);
  physics.step(body, 0.1);
  assert.equal(body.grounded, true);
  voxels.setVoxelId(1, 0, 1, 0);
  body.position = { x: 1.5, y: 3, z: 1.5 };
  body.velocity = { x: 0, y: -20, z: 0 };
  body.grounded = false;
  physics.step(body, 0.1);
  assert.equal(body.grounded, false);
});

function createVoxels() {
  const world = new VoxelCollisionWorld();
  return {
    world,
    voxels: new GameVoxelsRuntime({ shape: [8, 8, 8], catalog, collisionWorld: world }),
  };
}

function physicsConfig() {
  return {
    tickRate: 20,
    gravity: -32,
    maxFallSpeed: 100,
    playerBody: {
      profileId: "voxel-runtime-test",
      origin: "body-center",
      originStatus: "confirmed",
      sizeStatus: "unverified",
      boundsHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
      shapeHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
    },
  };
}
