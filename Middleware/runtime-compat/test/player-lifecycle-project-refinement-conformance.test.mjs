import assert from "node:assert/strict";
import test from "node:test";
import { playerLifecycleProjectRefinementConformance, projectLifecycleState } from "../conformance/player-lifecycle-project-refinement.mjs";

const partialJoin = Object.freeze({
  canonicalId: "server.GameWorld.onPlayerJoin",
  state: "partial",
  reasons: Object.freeze(["Event fields now match GameEntityEvent, but RuntimePlayer is still only a subset of GamePlayerEntity."]),
});

test("player lifecycle subscriptions are project-ready without promoting the global player ABI", () => {
  assert.deepEqual(playerLifecycleProjectRefinementConformance.payload, ["tick", "entity"]);
  assert.equal(playerLifecycleProjectRefinementConformance.globalCompatibility, "partial");
  assert.equal(playerLifecycleProjectRefinementConformance.memberPolicy, "independently-gated");
  assert.equal(projectLifecycleState(partialJoin), "ready");
});

test("the refinement does not promote unrelated partial event requirements", () => {
  assert.equal(projectLifecycleState({ ...partialJoin, canonicalId: "server.GameWorld.onVoxelContact" }), "partial");
});
