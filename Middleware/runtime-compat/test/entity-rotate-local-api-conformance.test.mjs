import assert from "node:assert/strict";
import test from "node:test";
import { applyHistoricalEntityTransform, rotateEntityLocal } from "../../../Frontend/demo-map/src/runtime/entity-look-at.mjs";
import { GameQuaternion } from "../../../Frontend/demo-map/src/runtime/quaternion.mjs";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityRotateLocalApiConformance } from "../conformance/entity-rotate-local-api.mjs";

test("rotateLocal preserves the recovered local pivot invariant", () => {
  const entity = createRuntimeEntity({ id: "rotate-local", position: [10, 2, -3], meshScale: [2, 3, 4] });
  const pivot = { x: 1, y: 0, z: 0 };
  const before = entity.position.add(applyHistoricalEntityTransform(pivot, entity.meshScale, entity.meshOrientation));
  entity.rotateLocal(pivot, "Z", Math.PI / 2);
  const after = entity.position.add(applyHistoricalEntityTransform(pivot, entity.meshScale, entity.meshOrientation));
  assert.ok(before.equals(after));
  assert.ok(Math.abs(entity.meshOrientation.mag() - 1) < 1e-12);
  assert.equal(entityRotateLocalApiConformance.status, "partial");
});

test("rotateLocal preserves axis validation and finite-radian boundaries", () => {
  const orientation = new GameQuaternion(0, 0, 0, 1);
  assert.throws(() => rotateEntityLocal([0, 0, 0], [1, 1, 1], orientation, [0, 0, 0], "Q", 1), /axis must be X, Y, or Z/);
  assert.throws(() => rotateEntityLocal([0, 0, 0], [1, 1, 1], orientation, [0, 0, 0], "X", Infinity), /radians must be finite/);
});
