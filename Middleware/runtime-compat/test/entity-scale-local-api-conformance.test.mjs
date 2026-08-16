import assert from "node:assert/strict";
import test from "node:test";
import { applyHistoricalEntityTransform } from "../../../Frontend/demo-map/src/runtime/entity-look-at.mjs";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityScaleLocalApiConformance } from "../conformance/entity-scale-local-api.mjs";

test("scaleLocal replaces scale while preserving the recovered local pivot invariant", () => {
  const entity = createRuntimeEntity({ id: "scale-local", position: [4, 5, 6], meshScale: [1, 2, 3] });
  const pivot = { x: 1, y: -2, z: 0.5 };
  const before = entity.position.add(applyHistoricalEntityTransform(pivot, entity.meshScale, entity.meshOrientation));
  entity.scaleLocal(pivot, [2, 4, 1]);
  const after = entity.position.add(applyHistoricalEntityTransform(pivot, entity.meshScale, entity.meshOrientation));
  assert.ok(before.equals(after));
  assert.deepEqual(entity.meshScale.toArray(), [2, 4, 1]);
  assert.equal(entityScaleLocalApiConformance.status, "partial");
});

test("scaleLocal rejects non-vector scale input", () => {
  const entity = createRuntimeEntity({ id: "scale-local-invalid" });
  assert.throws(() => entity.scaleLocal([0, 0, 0], 2), /Vector3-compatible/);
});
