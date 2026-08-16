import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { raycastWorld } from "../src/runtime/game-raycast.mjs";
import { GameVoxelsRuntime } from "../src/runtime/game-voxels.mjs";
import { VoxelCollisionWorld } from "../src/runtime/physics/voxel-collision-world.mjs";
import { Vector3 } from "../src/runtime/vector3.mjs";

const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const catalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");
const water = catalog.find(entry => entry.name === "water");
const solid = catalog.find(entry => entry.id !== 0 && entry.fluid !== true);

test("BlockInfo fluid records drive raycast ignoreFluid behavior", () => {
  assert.equal(water?.fluid, true);
  const voxels = createVoxels();
  voxels.setVoxelId(2, 2, 2, water.id);
  voxels.setVoxelId(2, 1, 2, solid.id);

  const fluidHit = raycastWorld({
    origin: [2.5, 4.5, 2.5],
    direction: [0, -2, 0],
    options: { maxDistance: 8 },
    voxels,
  });
  assert.equal(fluidHit.hit, true);
  assert.equal(fluidHit.hitVoxel, water.id);
  assert.equal(fluidHit.voxel, water.id);
  assert.deepEqual(fluidHit.voxelIndex.toArray(), [2, 2, 2]);
  assert.deepEqual(fluidHit.normal.toArray(), [0, 1, 0]);
  assert.equal(fluidHit.distance, 1.5);

  const solidHit = raycastWorld({
    origin: [2.5, 4.5, 2.5],
    direction: [0, -1, 0],
    options: { maxDistance: 8, ignoreFluid: true },
    voxels,
  });
  assert.equal(solidHit.hitVoxel, solid.id);
  assert.deepEqual(solidHit.voxelIndex.toArray(), [2, 1, 2]);
  assert.equal(solidHit.distance, 2.5);
});

test("raycast returns the nearest entity and honors ignoreEntities and ignoreSelector", () => {
  const voxels = createVoxels();
  voxels.setVoxelId(6, 1, 1, solid.id);
  const target = entity("target", [3, 1.5, 1.5], [1, 2, 1], ["target"]);
  const ignored = entity("ignored", [2, 1.5, 1.5], [1, 2, 1], ["ignore"]);
  const matchesSelector = (candidate, selector) => selector === ".ignore" && candidate.tags.has("ignore");

  const entityHit = raycastWorld({
    origin: [0, 1.5, 1.5],
    direction: [5, 0, 0],
    options: { maxDistance: 10, ignoreSelector: ".ignore" },
    voxels,
    entities: [ignored, target],
    matchesSelector,
  });
  assert.equal(entityHit.hitEntity, target);
  assert.equal(entityHit.hitVoxel, 0);
  assert.equal(entityHit.distance, 2);
  assert.deepEqual(entityHit.normal.toArray(), [-1, 0, 0]);

  const voxelHit = raycastWorld({
    origin: [0, 1.5, 1.5],
    direction: [1, 0, 0],
    options: { maxDistance: 10, ignoreEntities: true },
    voxels,
    entities: [ignored, target],
  });
  assert.equal(voxelHit.hitEntity, null);
  assert.equal(voxelHit.hitVoxel, solid.id);
  assert.deepEqual(voxelHit.voxelIndex.toArray(), [6, 1, 1]);
});

test("raycast skips an entity containing the origin and preserves the native no-hit result fields", () => {
  const voxels = createVoxels();
  const self = entity("self", [0, 1, 0], [2, 2, 2]);
  const result = raycastWorld({
    origin: [0, 1, 0],
    direction: [2, 0, 0],
    options: { maxDistance: 4 },
    voxels,
    entities: [self],
  });
  assert.equal(result.hit, false);
  assert.equal(result.hitEntity, null);
  assert.equal(result.hitVoxel, 0);
  assert.equal(result.distance, 4);
  assert.deepEqual(result.origin.toArray(), [0, 1, 0]);
  assert.deepEqual(result.direction.toArray(), [1, 0, 0]);
  assert.deepEqual(result.hitPosition.toArray(), [0, 0, 0]);
  assert.deepEqual(result.normal.toArray(), [0, 0, 0]);
  assert.deepEqual(result.voxelIndex.toArray(), [0, 0, 0]);
});

test("raycast uses the recovered Infinity default and preserves zero direction", () => {
  const voxels = createVoxels();
  voxels.setVoxelId(7, 1, 1, solid.id);

  const omittedOptions = raycastWorld({
    origin: [0.5, 1.5, 1.5],
    direction: [4, 0, 0],
    voxels,
  });
  assert.equal(omittedOptions.hit, true);
  assert.equal(omittedOptions.hitVoxel, solid.id);
  assert.equal(omittedOptions.distance, 6.5);
  assert.deepEqual(omittedOptions.direction.toArray(), [1, 0, 0]);

  const zeroDirection = raycastWorld({
    origin: [0.5, 0.5, 0.5],
    direction: [0, 0, 0],
    options: { maxDistance: 4, ignoreVoxel: true },
    voxels,
  });
  assert.equal(zeroDirection.hit, false);
  assert.equal(zeroDirection.distance, 4);
  assert.deepEqual(zeroDirection.direction.toArray(), [0, 0, 0]);
  assert.deepEqual(zeroDirection.hitPosition.toArray(), [0, 0, 0]);
});

test("raycast accepts explicit Infinity and rejects invalid maxDistance values", () => {
  const voxels = createVoxels();
  const result = raycastWorld({
    origin: [0.5, 0.5, 0.5],
    direction: [1, 0, 0],
    options: { maxDistance: Infinity },
    voxels,
  });
  assert.equal(result.hit, false);
  assert.equal(result.distance, Infinity);
  assert.deepEqual(result.hitPosition.toArray(), [0, 0, 0]);
  assert.throws(() => raycastWorld({ origin: [0, 0, 0], direction: [1, 0, 0], options: { maxDistance: -1 }, voxels }), /maxDistance/);
  assert.throws(() => raycastWorld({ origin: [0, 0, 0], direction: [1, 0, 0], options: { maxDistance: Number.NaN }, voxels }), /maxDistance/);
});

function createVoxels() {
  return new GameVoxelsRuntime({ shape: [9, 9, 9], catalog, collisionWorld: new VoxelCollisionWorld() });
}

function entity(id, position, bounds, tags = []) {
  return {
    id,
    isPlayer: false,
    position: Vector3.from(position),
    bounds: Vector3.from(bounds),
    tags: new Set(tags),
  };
}
