import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRecoveredEntityPlacement } from "../src/recovered-entity-placement.mjs";

test("normalizes only observed finite entity placement vectors", () => {
  assert.deepEqual(normalizeRecoveredEntityPlacement({ x: 1, y: 2, z: 3 }), [1, 2, 3]);
  assert.deepEqual(normalizeRecoveredEntityPlacement([1, 2, 3]), [1, 2, 3]);
});

test("rejects coerced, incomplete, and oversized entity placement vectors", () => {
  assert.throws(() => normalizeRecoveredEntityPlacement({ x: "1", y: 2, z: 3 }), /finite three-dimensional vector/);
  assert.throws(() => normalizeRecoveredEntityPlacement([1, 2]), /finite three-dimensional vector/);
  assert.throws(() => normalizeRecoveredEntityPlacement([1, 2, 3, 4]), /finite three-dimensional vector/);
});
