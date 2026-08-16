import assert from "node:assert/strict";
import test from "node:test";
import { FixedStepPlayerPhysics } from "../../../Frontend/demo-map/src/runtime/physics/fixed-step-physics.mjs";
import { PlayerPhysicsBody } from "../../../Frontend/demo-map/src/runtime/physics/player-body.mjs";
import { VoxelCollisionWorld } from "../../../Frontend/demo-map/src/runtime/physics/voxel-collision-world.mjs";
import { fluidContactContract } from "../conformance/fluid-contact.mjs";

const profile = Object.freeze({ profileId: "fluid-test", origin: "body-center", originStatus: "confirmed", sizeStatus: "confirmed", boundsHalfExtents: [0.4, 0.9, 0.4], shapeHalfExtents: [0.4, 0.9, 0.4] });

test("fluid contact state uses BlockInfo ids and per-body overlap transitions", () => {
  const world = new VoxelCollisionWorld({ voxels: [{ position: [0, 0, 0], blockId: 7 }], fluidIds: [7] });
  const physics = new FixedStepPlayerPhysics(world, { gravity: 0 });
  const body = new PlayerPhysicsBody({ profile, position: [0.5, 0.5, 0.5] });
  const entered = physics.observe(body);
  assert.equal(entered.fluidEntered[0].voxel, 7);
  assert.equal(entered.fluids[0].volume > 0 && entered.fluids[0].volume <= 1, true);
  assert.deepEqual(fluidContactContract.eventFields, ["tick", "entity", "voxel"]);
  body.position.set(4, 4, 4);
  assert.equal(physics.observe(body).fluidLeft[0].voxel, 7);
});
