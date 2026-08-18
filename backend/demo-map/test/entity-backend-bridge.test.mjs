import assert from "node:assert/strict";
import test from "node:test";

import { EntityBackendBridge, runtimeEntityProjectionPayload, runtimeEntityStatePayload } from "../src/runtime/entity-backend-bridge.mjs";

test("projects a validated entity then writes its backend state", async () => {
  const created = [];
  const states = [];
  const projected = [];
  const bridge = new EntityBackendBridge({
    validatedMeshNames: ["verified-mesh"],
    createEntity: payload => { created.push(payload); return { entityId: 41 }; },
    writeEntityState: (entityId, state) => states.push({ entityId, state }),
    destroyEntity: () => {},
    reportError: error => { throw error; },
  });
  const entity = createEntity();

  bridge.project(entity, value => projected.push(value));
  await flushAsyncWork();

  assert.equal(entity._backendEntityId, 41);
  assert.deepEqual(created, [runtimeEntityProjectionPayload(entity)]);
  assert.deepEqual(states, [{ entityId: 41, state: runtimeEntityStatePayload(entity) }]);
  assert.deepEqual(states[0].state.particles, {
    rate: 12,
    rateSpread: 3,
    limit: 80,
    lifetime: 2,
    lifetimeSpread: 1,
    size: [1, 2, 0],
    sizeSpread: 0.5,
    color: [[1, 0.5, 0]],
    velocity: [0, 1, 0],
    velocitySpread: [0.2, 0.3, 0.4],
    damping: 0.25,
  });
  assert.deepEqual(projected, [entity]);
});

test("destroys a backend entity when local destruction wins the projection race", async () => {
  let resolveCreate;
  const destroyed = [];
  const bridge = new EntityBackendBridge({
    validatedMeshNames: ["verified-mesh"],
    createEntity: () => new Promise(resolve => { resolveCreate = resolve; }),
    writeEntityState: () => assert.fail("destroyed entity must not write state"),
    destroyEntity: entityId => destroyed.push(entityId),
    reportError: error => { throw error; },
  });
  const entity = createEntity();

  bridge.project(entity);
  entity.destroyed = true;
  resolveCreate({ entityId: 42 });
  await flushAsyncWork();

  assert.equal(entity._backendEntityId, 42);
  assert.deepEqual(destroyed, [42]);
});

test("does not project entities with an unverified mesh", async () => {
  const bridge = new EntityBackendBridge({
    validatedMeshNames: [],
    createEntity: () => assert.fail("unverified mesh must not create a backend entity"),
    writeEntityState: () => assert.fail("unverified mesh must not write backend state"),
    destroyEntity: () => assert.fail("unverified mesh must not destroy a backend entity"),
    reportError: error => { throw error; },
  });

  bridge.project(createEntity());
  await flushAsyncWork();
});

function createEntity() {
  const vector = values => ({ toArray: () => [...values] });
  return {
    _backendEntityId: undefined,
    destroyed: false,
    position: vector([1, 2, 3]),
    velocity: vector([0, 1, 0]),
    name: "Bridge entity",
    tags: () => ["bridge"],
    mesh: "verified-mesh",
    bounds: vector([1, 1, 1]),
    showEntityName: true,
    customName: "Bridge",
    nameRadius: 24,
    nameColor: { r: 1, g: 0.5, b: 0 },
    collides: true,
    fixed: false,
    gravity: true,
    mass: 1,
    friction: 0.4,
    restitution: 0.2,
    meshScale: vector([1, 1, 1]),
    meshOrientation: { w: 1, x: 0, y: 0, z: 0 },
    meshInvisible: false,
    meshMetalness: 0.1,
    meshEmissive: 0.2,
    meshShininess: 0.3,
    enableInteract: true,
    meshColor: { r: 1, g: 0.5, b: 0, a: 1 },
    meshOffset: vector([0, 0, 0]),
    particleRate: 12,
    particleRateSpread: 3,
    particleLimit: 80,
    particleLifetime: 2,
    particleLifetimeSpread: 1,
    particleSize: [1, 2, 0],
    particleSizeSpread: 0.5,
    particleColor: [[1, 0.5, 0]],
    particleVelocity: vector([0, 1, 0]),
    particleVelocitySpread: vector([0.2, 0.3, 0.4]),
    particleDamping: 0.25,
  };
}

async function flushAsyncWork() {
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}
