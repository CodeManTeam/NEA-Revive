import assert from "node:assert/strict";
import test from "node:test";

import { normalizeWorldSpawn, normalizeWorldSpawnWithinShape } from "../src/world-spawn.mjs";

test("normalizes recovered object spawn coordinates without coercion", () => {
  assert.deepEqual(normalizeWorldSpawn({ x: 1, y: 2, z: 3 }), [1, 2, 3]);
  assert.throws(() => normalizeWorldSpawn({ x: "1", y: 2, z: 3 }), /finite three-dimensional vector/);
});

test("rejects recovered spawn coordinates outside the declared voxel shape", () => {
  assert.deepEqual(normalizeWorldSpawnWithinShape([0, 1, 2], [32, 32, 32]), [0, 1, 2]);
  assert.throws(() => normalizeWorldSpawnWithinShape([32, 1, 2], [32, 32, 32]), /outside world shape/);
});
