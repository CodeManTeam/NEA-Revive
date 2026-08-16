import assert from "node:assert/strict";
import test from "node:test";
import { FixedStepPlayerPhysics } from "../../../Frontend/demo-map/src/runtime/physics/fixed-step-physics.mjs";
import { PlayerPhysicsBody } from "../../../Frontend/demo-map/src/runtime/physics/player-body.mjs";
import { VoxelCollisionWorld } from "../../../Frontend/demo-map/src/runtime/physics/voxel-collision-world.mjs";
import { createContactEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

const profile = Object.freeze({
  profileId: "contact-force-conformance",
  origin: "body-center",
  originStatus: "confirmed",
  sizeStatus: "unverified",
  boundsHalfExtents: Object.freeze({ x: 0.3, y: 0.9, z: 0.3 }),
  shapeHalfExtents: Object.freeze({ x: 0.3, y: 0.9, z: 0.3 }),
  evidence: "DAO3 default mass and recovered impulse-per-fixed-step contact force formula",
});

test("voxel contact force equals mass times collision delta velocity over the fixed step", () => {
  const world = new VoxelCollisionWorld({
    voxels: [{ position: [0, 0, 0], blockId: 631 }],
    materials: { "631": { friction: 0, restitution: 0 } },
  });
  const physics = new FixedStepPlayerPhysics(world, { gravity: 0 });
  const body = new PlayerPhysicsBody({ position: [0.5, 2, 0.5], velocity: [0, -10, 0], mass: 2, profile });
  const result = physics.step(body, 0.1);
  const contact = result.entered[0];
  assert.deepEqual(contact.force, { x: 0, y: 200, z: 0 });
  const event = createContactEvent(7, Object.freeze({ id: "player" }), contact);
  assert.deepEqual(event.force.toArray(), [0, 200, 0]);
  assert.deepEqual(event.compatibility, { canonical: "compatible", unresolved: [] });
});

test("ground friction contributes its actual tangential impulse to contact force", () => {
  const world = new VoxelCollisionWorld({
    voxels: [{ position: [0, 0, 0], blockId: 631 }],
    materials: { "631": { friction: 2, restitution: 0 } },
  });
  const physics = new FixedStepPlayerPhysics(world, { gravity: -20 });
  const body = new PlayerPhysicsBody({ position: [0.5, 1.9, 0.5], velocity: [10, 0, 0], mass: 2, profile });
  const result = physics.step(body, 0.1);
  const expectedTangentialForce = (10 * Math.exp(-0.2) - 10) * 2 / 0.1;
  assert.ok(Math.abs(result.collisions[0].force.x - expectedTangentialForce) < 1e-12);
  assert.equal(result.collisions[0].force.y, 40);
  assert.equal(result.collisions[0].force.z, 0);
});
