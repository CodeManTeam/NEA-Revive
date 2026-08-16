import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { worldCollisionFilterApiConformance } from "../conformance/world-collision-filter-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");

test("world collision filter registry exposes the complete canonical management surface", () => {
  for (const marker of ["addCollisionFilter:", "removeCollisionFilter:", "clearCollisionFilters:", "collisionFilters:"]) assert.match(runtimeSource, new RegExp(marker));
  assert.deepEqual(worldCollisionFilterApiConformance.canonicalApis, [
    "GameWorld.addCollisionFilter",
    "GameWorld.removeCollisionFilter",
    "GameWorld.clearCollisionFilters",
    "GameWorld.collisionFilters",
  ]);
  assert.equal(worldCollisionFilterApiConformance.compatibility, "partial");
  assert.match(worldCollisionFilterApiConformance.remainingGap, /does not consume/);
});

test("collisionFilters returns copied pair arrays rather than the mutable registry values", () => {
  assert.match(runtimeSource, /collisionFilters: \(\) => \[\.\.\.this\.#collisionFilters\.values\(\)\]\.map\(pair => \[\.\.\.pair\]\)/);
});
