import assert from "node:assert/strict";
import test from "node:test";
import { entityLookAtQuaternion } from "../../../Frontend/demo-map/src/runtime/entity-look-at.mjs";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityLookAtApiConformance } from "../conformance/entity-look-at-api.mjs";

test("lookAt preserves the recovered quaternion component order", () => {
  const entity = createRuntimeEntity({ id: "look-at", position: [0, 0, 0] });
  entity.lookAt([0, 0, 1]);
  assert.deepEqual([entity.meshOrientation.w, entity.meshOrientation.x, entity.meshOrientation.y, entity.meshOrientation.z], [0, 0, 0, 1]);
  entity.lookAt([0, 0, 1], "X");
  assert.ok(Math.abs(entity.meshOrientation.x + Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(entity.meshOrientation.z - Math.SQRT1_2) < 1e-12);
  assert.equal(entityLookAtApiConformance.status, "partial");
});

test("lookAt preserves invalid-facing and degenerate-vector fallbacks", () => {
  const warnings = [];
  const fallback = entityLookAtQuaternion([0, 0, 0], [0, 0, 1], "invalid", [0, 1, 0], message => warnings.push(message));
  assert.deepEqual([fallback.w, fallback.x, fallback.y, fallback.z], [0, 0, 0, 1]);
  assert.equal(warnings.length, 1);
  const parallel = entityLookAtQuaternion([0, 0, 0], [0, 1, 0], "Z", [0, 1, 0]);
  assert.ok([parallel.w, parallel.x, parallel.y, parallel.z].every(Number.isFinite));
  assert.ok(Math.abs(parallel.mag() - 1) < 1e-12);
});
