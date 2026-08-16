import assert from "node:assert/strict";
import test from "node:test";
import { FixedStepPlayerPhysics } from "../src/runtime/physics/fixed-step-physics.mjs";
import { playerAabb } from "../src/runtime/physics/aabb.mjs";
import { PlayerPhysicsBody } from "../src/runtime/physics/player-body.mjs";
import { VoxelCollisionWorld } from "../src/runtime/physics/voxel-collision-world.mjs";

test("high-speed falling stops on a one-voxel floor", () => {
  const physics = physicsWith([{ position: [0, 0, 0], blockId: 129 }], { maxFallSpeed: 1_000 });
  const body = playerBody({ position: [0.5, 10, 0.5], velocity: [0, -500, 0] });
  const result = physics.step(body, 0.05);
  assert.ok(Math.abs(body.position.y - 1.9) < 1e-9);
  assert.equal(body.velocity.y, 0);
  assert.equal(body.grounded, true);
  assert.equal(result.entered[0].normal.y, 1);
});

test("player AABB uses body center and exact profile half extents without hidden expansion", () => {
  const body = playerBody({ position: [10, 20, 30] });
  assert.deepEqual(playerAabb(body.position, body.halfExtents), {
    minX: 9.7,
    maxX: 10.3,
    minY: 19.1,
    maxY: 20.9,
    minZ: 29.7,
    maxZ: 30.3,
  });
  assert.deepEqual(body.collisionSnapshot(), {
    profileId: "physics-test-center-box",
    origin: "body-center",
    originStatus: "confirmed",
    sizeStatus: "unverified",
    shapeSource: "player-body-profile",
    boundsHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
    shapeHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
    halfExtents: { x: 0.3, y: 0.9, z: 0.3 },
    dimensions: { width: 0.6, height: 1.8, depth: 0.6 },
    aabb: {
      minX: 9.7,
      maxX: 10.3,
      minY: 19.1,
      maxY: 20.9,
      minZ: 29.7,
      maxZ: 30.3,
    },
    shapeAabb: {
      minX: 9.7,
      maxX: 10.3,
      minY: 19.1,
      maxY: 20.9,
      minZ: 29.7,
      maxZ: 30.3,
    },
  });
});

test("unknown authoritative posture shapes preserve the current collider", () => {
  const body = playerBody();
  const before = body.collisionSnapshot();
  assert.equal(body.applyAuthoritativePostureShape(null), false);
  assert.deepEqual(body.collisionSnapshot(), before);
});

test("authoritative posture shapes must be complete and may update the collider", () => {
  const body = playerBody();
  assert.throws(
    () => body.applyAuthoritativePostureShape({ boundsHalfExtents: [0.4, 0.7, 0.4] }),
    /requires complete/,
  );
  assert.equal(body.applyAuthoritativePostureShape({
    boundsHalfExtents: [0.4, 0.7, 0.4],
    shapeHalfExtents: [0.35, 0.65, 0.35],
  }), true);
  const collision = body.collisionSnapshot();
  assert.equal(collision.shapeSource, "authoritative-state");
  assert.deepEqual(collision.boundsHalfExtents, { x: 0.4, y: 0.7, z: 0.4 });
  assert.deepEqual(collision.shapeHalfExtents, { x: 0.35, y: 0.65, z: 0.35 });
  assert.deepEqual(collision.dimensions, { width: 0.7, height: 1.3, depth: 0.7 });
});

test("broadphase bounds do not enlarge the contact shape", () => {
  const world = new VoxelCollisionWorld({ voxels: [{ position: [2, 1, 0], blockId: 95 }] });
  const physics = new FixedStepPlayerPhysics(world, { gravity: 0 });
  const body = new PlayerPhysicsBody({
    position: [0.5, 1, 0.5],
    velocity: [100, 0, 0],
    profile: {
      profileId: "split-bounds-shape",
      origin: "body-center",
      originStatus: "confirmed",
      sizeStatus: "partial",
      boundsHalfExtents: { x: 0.5, y: 0.9, z: 0.5 },
      shapeHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
    },
  });
  physics.step(body, 0.05);
  assert.equal(body.position.x, 1.7);
  assert.equal(body.velocity.x, 0);
});

test("fluid voxels produce stable enter active and leave transitions", () => {
  const world = new VoxelCollisionWorld({ voxels: [{ position: [0, 0, 0], blockId: 7 }], fluidIds: [7] });
  const physics = new FixedStepPlayerPhysics(world, { gravity: 0 });
  const body = playerBody({ position: [0.5, 0.5, 0.5] });
  const entered = physics.observe(body);
  assert.equal(entered.fluidEntered[0].voxel, 7);
  assert.equal(entered.fluids[0].volume > 0, true);
  assert.equal(physics.observe(body).fluidEntered.length, 0);
  body.position.set(3, 3, 3);
  const left = physics.observe(body);
  assert.equal(left.fluidLeft[0].voxel, 7);
});

test("horizontal movement stops at a voxel wall", () => {
  const physics = physicsWith([{ position: [2, 1, 0], blockId: 95 }], { gravity: 0 });
  const body = playerBody({ position: [0.5, 1, 0.5], velocity: [100, 0, 0] });
  physics.step(body, 0.05);
  assert.equal(body.position.x, 1.7);
  assert.equal(body.velocity.x, 0);
});

test("DAO world gravity and air friction use the recovered exponential fixed-tick integration", () => {
  const physics = physicsWith([], { gravity: 0, maxFallSpeed: 1_000 });
  const body = playerBody({ position: [0, 10, 0], velocity: [20, 10, -5] });
  physics.setDaoWorldPhysics(-0.1, 0.01, 20);
  physics.step(body, 0.05);
  const velocityScale = Math.exp(-0.01);
  const accelerationFactor = (1 - velocityScale) / 0.01;
  assert.ok(Math.abs(body.velocity.x - 20 * velocityScale) < 1e-12);
  assert.ok(Math.abs(body.velocity.y - (10 * velocityScale + 20 * accelerationFactor * -0.1)) < 1e-12);
  assert.ok(Math.abs(body.velocity.z - -5 * velocityScale) < 1e-12);
});

test("ground contacts enter once and separate after takeoff", () => {
  const physics = physicsWith([{ position: [0, 0, 0], blockId: 631 }]);
  const body = playerBody({ position: [0.5, 1.9, 0.5] });
  const first = physics.step(body, 0.05);
  const second = physics.step(body, 0.05);
  body.velocity.y = 10;
  const third = physics.step(body, 0.05);
  assert.equal(first.entered.length, 1);
  assert.deepEqual(first.entered[0].force, { x: 0, y: 20, z: 0 });
  assert.equal(second.entered.length, 0);
  assert.equal(second.collisions.length, 1);
  assert.equal(third.separated.length, 1);
  assert.equal(body.grounded, false);
});

test("surface materials apply restitution and different friction", () => {
  const bounce = physicsWith(
    [{ position: [0, 0, 0], blockId: 631 }],
    { gravity: 0, materials: { "631": { restitution: 0.8, friction: 1 } } },
  );
  const bouncingBody = playerBody({ position: [0.5, 2, 0.5], velocity: [0, -10, 0] });
  bounce.step(bouncingBody, 0.1);
  assert.equal(bouncingBody.position.y, 1.9);
  assert.equal(bouncingBody.velocity.y, 8);
  assert.equal(bouncingBody.grounded, true);
  assert.deepEqual(bounce.step(playerBody({ position: [0.5, 2, 0.5], velocity: [0, -10, 0] }), 0.1).collisions[0].force, { x: 0, y: 180, z: 0 });

  const stone = physicsWith([{ position: [0, 0, 0], blockId: 129 }], {
    materials: { "129": { friction: 10 } },
  });
  const ice = physicsWith([{ position: [0, 0, 0], blockId: 147 }], {
    materials: { "147": { friction: 0.25 } },
  });
  const stoneBody = playerBody({ position: [0.5, 1.9, 0.5], velocity: [8, 0, 0] });
  const iceBody = playerBody({ position: [0.5, 1.9, 0.5], velocity: [8, 0, 0] });
  stone.step(stoneBody, 0.05);
  ice.step(iceBody, 0.05);
  assert.ok(stoneBody.velocity.x < iceBody.velocity.x);
});

test("grounded players step onto a half-height static collider", () => {
  const physics = physicsWith([], {
    gravity: 0,
    stepHeight: 0.6,
    colliders: [{ id: "step", min: [1, 1, 0], max: [2, 1.5, 1], tags: ["step"] }],
  });
  const body = playerBody({ position: [0.5, 1.9, 0.5], velocity: [10, 0, 0] });
  body.grounded = true;
  physics.step(body, 0.1);
  assert.equal(body.position.y, 2.4);
  assert.ok(body.position.x > 1);
  assert.equal(body.grounded, true);
});

test("the recovered default step height is 1.25 voxels", () => {
  const physics = physicsWith([], {
    gravity: 0,
    stepHeight: 1.25,
    colliders: [{ id: "historical-step", min: [1, 1, 0], max: [2, 2.25, 1], tags: ["step"] }],
  });
  const body = playerBody({ position: [0.5, 1.9, 0.5], velocity: [10, 0, 0] });
  body.grounded = true;
  physics.step(body, 0.1);
  assert.ok(Math.abs(body.position.y - 3.15) < 1e-9);
  assert.ok(body.position.x > 1);
  assert.equal(body.grounded, true);
});

test("collider and trigger chunk index skips volumes far from the swept region", () => {
  const farColliders = Array.from({ length: 500 }, (_, index) => ({
    id: `far-collider-${index}`,
    min: [2000 + index, 2000, 0],
    max: [2001 + index, 2001, 1],
  }));
  const farTriggers = Array.from({ length: 500 }, (_, index) => ({
    id: `far-trigger-${index}`,
    min: [2000 + index, 2000, 0],
    max: [2001 + index, 2001, 1],
  }));
  const world = new VoxelCollisionWorld({
    voxels: [],
    colliders: [{ id: "near", min: [1, 1, 0], max: [2, 2, 1] }, ...farColliders],
    triggers: [{ id: "near-trigger", min: [0, 0, 0], max: [1, 2, 1] }, ...farTriggers],
  });
  const physics = new FixedStepPlayerPhysics(world, { gravity: 0 });
  const body = playerBody({ position: [0.5, 1.9, 0.5], velocity: [10, 0, 0] });
  const stepResult = physics.step(body, 0.1);
  assert.equal(body.position.x, 0.7, "still stops at the near collider");
  assert.deepEqual(stepResult.triggerEntered.map(trigger => trigger.id), ["near-trigger"]);
  const diagnostics = world.diagnostics();
  assert.ok(diagnostics.candidates < 50, `expected the swept region to skip the 500 far colliders, scanned ${diagnostics.candidates} candidates`);
  assert.ok(diagnostics.triggerCandidates < 50, `expected the query region to skip the 500 far triggers, scanned ${diagnostics.triggerCandidates} trigger candidates`);
});

test("trigger volumes emit enter and leave once", () => {
  const physics = physicsWith([], {
    gravity: 0,
    triggers: [{ id: "checkpoint", min: [1, 0, 0], max: [2, 3, 1], tags: ["checkpoint"] }],
  });
  const body = playerBody({ position: [0.5, 0, 0.5], velocity: [10, 0, 0] });
  const entered = physics.step(body, 0.1);
  body.velocity.x = 0;
  const stayed = physics.step(body, 0.1);
  body.velocity.x = 20;
  const left = physics.step(body, 0.1);
  assert.deepEqual(entered.triggerEntered.map(trigger => trigger.id), ["checkpoint"]);
  assert.equal(stayed.triggerEntered.length, 0);
  assert.deepEqual(left.triggerLeft.map(trigger => trigger.id), ["checkpoint"]);
});

function physicsWith(voxels, options = {}) {
  const world = new VoxelCollisionWorld({
    voxels,
    materials: options.materials,
    colliders: options.colliders,
    triggers: options.triggers,
  });
  return new FixedStepPlayerPhysics(world, options);
}

function playerBody(options = {}) {
  return new PlayerPhysicsBody({
    ...options,
    profile: {
      profileId: "physics-test-center-box",
      origin: "body-center",
      originStatus: "confirmed",
      sizeStatus: "unverified",
      boundsHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
      shapeHalfExtents: { x: 0.3, y: 0.9, z: 0.3 },
      evidence: "center-origin conformance fixture",
    },
  });
}

