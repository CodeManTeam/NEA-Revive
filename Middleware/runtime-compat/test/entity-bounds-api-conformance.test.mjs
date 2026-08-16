import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityBoundsApiConformance } from "../conformance/entity-bounds-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");
const backendSource = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

test("RuntimeEntity bounds preserves positive readonly half-extents", () => {
  const entity = createRuntimeEntity({ id: "bounds-api", bounds: [1, 2, 3] });
  assert.deepEqual(entity.bounds.toArray(), [1, 2, 3]);
  entity.bounds.x = 99;
  assert.deepEqual(entity.bounds.toArray(), [1, 2, 3]);
  assert.throws(() => createRuntimeEntity({ id: "invalid-bounds", bounds: [1, 0, 1] }), /positive finite numbers/);
  assert.deepEqual(entityBoundsApiConformance.historicalDefault, [1, 1, 1]);
});

test("bounds is projected at creation while Player bounds remains readonly", () => {
  assert.match(runtimeSource, /bounds: entity\.bounds\.toArray\(\)/);
  assert.match(backendSource, /bounds: entity\.bounds \?\? mesh\.bounds/);
  assert.match(backendSource, /requirePositiveVector2\(body\.bounds, "runtime entity body bounds"\)/);
  assert.doesNotMatch(backendSource, /transform\.bounds/);
  assert.match(runtimeSource, /get bounds\(\) \{ return this\._body\.boundsHalfExtents\.clone\(\); \}/);
  assert.equal(entityBoundsApiConformance.status, "partial");
  assert.equal(entityBoundsApiConformance.runtimeEntity.write, false);
  assert.equal(entityBoundsApiConformance.runtimePlayer.write, false);
});
