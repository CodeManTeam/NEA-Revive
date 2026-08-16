import test from "node:test";
import assert from "node:assert/strict";
import { worldPhysicsWriteContract } from "../conformance/world-physics-write.mjs";

test("world physics write contract records recovered bindings, formulas, and partial scope", () => {
  assert.deepEqual(worldPhysicsWriteContract.api, ["server.GameWorld.gravity", "server.GameWorld.airFriction"]);
  assert.deepEqual(worldPhysicsWriteContract.binding, { gravity: "physics.gravity", airFriction: "physics.velocityDamping" });
  assert.equal(worldPhysicsWriteContract.velocityScale, "exp(-velocityDamping * deltaTicks)");
  assert.equal(worldPhysicsWriteContract.scope, "runtime-owned-player-fixed-step");
  assert.deepEqual(worldPhysicsWriteContract.unresolved, [
    "Player game-net public physics is unused and has no recovered mutable channel",
    "generic RuntimeEntity rigid-body integration",
  ]);
});
