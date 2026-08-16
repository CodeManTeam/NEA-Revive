import assert from "node:assert/strict";
import test from "node:test";

import { VoxelCollisionWorld } from "../src/runtime/physics/voxel-collision-world.mjs";
import { diagnoseSpawnCollision } from "../src/spawn-collision-diagnostic.mjs";

const profile = Object.freeze({ origin: "body-center", shapeHalfExtents: [0.45, 1.1, 0.45] });

test("spawn collision diagnostic reports solid overlap without changing runtime state", () => {
  const world = new VoxelCollisionWorld({ voxels: [{ position: [0, 0, 0], blockId: 5 }] });
  const result = diagnoseSpawnCollision(world, [0.5, 0.5, 0.5], profile);
  assert.deepEqual(result, {
    status: "partial",
    origin: "body-center",
    solidOverlap: true,
    contactCount: 1,
    contactIds: ["0,0,0"],
  });
  assert.equal(world.getVoxelId(0, 0, 0) & 0x3fff, 5);
});

test("spawn collision diagnostic ignores non-solid and non-overlapping voxels", () => {
  const world = new VoxelCollisionWorld({
    voxels: [{ position: [0, 0, 0], blockId: 5 }, { position: [4, 0, 0], blockId: 6 }],
    materials: { 5: { solid: false } },
  });
  const result = diagnoseSpawnCollision(world, [0.5, 0.5, 0.5], profile);
  assert.equal(result.solidOverlap, false);
  assert.deepEqual(result.contactIds, []);
});
