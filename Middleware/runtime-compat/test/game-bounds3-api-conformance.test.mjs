import assert from "node:assert/strict";
import test from "node:test";
import { GameBounds3 } from "../../../Frontend/demo-map/src/runtime/game-zones.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";
import { gameBounds3ApiConformance } from "../conformance/game-bounds3-api.mjs";

test("GameBounds3 preserves recovered geometry and mutation behavior", () => {
  const bounds = GameBounds3.fromPoints(new Vector3(4, -1, 2), new Vector3(-2, 3, 8));
  assert.deepEqual(bounds.lo.toArray(), [-2, -1, 2]);
  assert.deepEqual(bounds.hi.toArray(), [4, 3, 8]);
  assert.equal(bounds.contains(new Vector3(-2, -1, 2)), true);
  assert.equal(bounds.containsBounds(new GameBounds3([-2, -1, 2], [4, 3, 8])), true);
  assert.equal(bounds.intersects(new GameBounds3([4, -1, 2], [5, 3, 8])), false);
  assert.deepEqual(bounds.intersect(new GameBounds3([0, 0, 0], [10, 10, 10])).lo.toArray(), [0, 0, 2]);
  assert.equal(bounds.copy(new GameBounds3([1, 2, 3], [4, 5, 6])), bounds);
  assert.equal(bounds.set(-1, -2, -3, 1, 2, 3), bounds);
  assert.equal(bounds.toString(), "{ lo:{ x:-1, y:-2, z:-3 }, hi:{ x:1, y:2, z:3 } }");
});

test("GameBounds3 records the constructor reference-identity gap", () => {
  const lo = new Vector3(0, 0, 0);
  const bounds = new GameBounds3(lo, new Vector3(1, 1, 1));
  lo.x = -1;
  assert.equal(bounds.lo.x, -1);
  assert.deepEqual(gameBounds3ApiConformance.partial, []);
});
