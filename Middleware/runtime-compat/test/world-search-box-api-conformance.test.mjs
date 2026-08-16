import assert from "node:assert/strict";
import test from "node:test";
import { GameBounds3 } from "../../../Frontend/demo-map/src/runtime/game-zones.mjs";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { runtimeEntityBounds, searchRuntimeEntities } from "../../../Frontend/demo-map/src/runtime/entity-bounds.mjs";
import { worldSearchBoxApiConformance } from "../conformance/world-search-box-api.mjs";

test("searchBox uses the recovered body-center half-extents convention", () => {
  const inside = createRuntimeEntity({ id: "inside", position: [3, 0, 0], bounds: [2, 1, 1] });
  const outside = createRuntimeEntity({ id: "outside", position: [8, 0, 0], bounds: [1, 1, 1] });
  assert.deepEqual(runtimeEntityBounds(inside).lo.toArray(), [1, -1, -1]);
  assert.deepEqual(runtimeEntityBounds(inside).hi.toArray(), [5, 1, 1]);
  assert.deepEqual(searchRuntimeEntities(new GameBounds3([0, -2, -2], [2, 2, 2]), [inside, outside]), [inside]);
  assert.equal(worldSearchBoxApiConformance.status, "partial");
});

test("searchBox excludes touching non-overlapping AABBs and accepts bounds-like input", () => {
  const entity = createRuntimeEntity({ id: "touching", position: [3, 0, 0], bounds: [1, 1, 1] });
  assert.deepEqual(searchRuntimeEntities({ lo: [0, -1, -1], hi: [2, 1, 1] }, [entity]), []);
  assert.deepEqual(searchRuntimeEntities({ lo: [0, -1, -1], hi: [2.01, 1, 1] }, [entity]), [entity]);
});
