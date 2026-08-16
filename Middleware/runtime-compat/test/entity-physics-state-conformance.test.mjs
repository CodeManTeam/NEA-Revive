import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityPhysicsStateContract } from "../conformance/entity-physics-state.mjs";

test("RuntimeEntity physical property writes queue authoritative replica state", () => {
  const writes = [];
  const runtime = { _entityPhysicsChanged(entity) { writes.push({ collides: entity.collides, fixed: entity.fixed, gravity: entity.gravity, mass: entity.mass, friction: entity.friction, restitution: entity.restitution }); } };
  const entity = createRuntimeEntity({ id: "physics-properties", collides: true, fixed: false, gravity: true, mass: 1, friction: 0, restitution: 0 }, runtime);
  entity.collides = false;
  entity.fixed = true;
  entity.gravity = false;
  entity.mass = 2;
  entity.friction = 0.25;
  entity.restitution = 0.5;
  assert.deepEqual(writes, [
    { collides: false, fixed: false, gravity: true, mass: 1, friction: 0, restitution: 0 },
    { collides: false, fixed: true, gravity: true, mass: 1, friction: 0, restitution: 0 },
    { collides: false, fixed: true, gravity: false, mass: 1, friction: 0, restitution: 0 },
    { collides: false, fixed: true, gravity: false, mass: 2, friction: 0, restitution: 0 },
    { collides: false, fixed: true, gravity: false, mass: 2, friction: 0.25, restitution: 0 },
    { collides: false, fixed: true, gravity: false, mass: 2, friction: 0.25, restitution: 0.5 },
  ]);
  assert.deepEqual(entityPhysicsStateContract.properties, ["collides", "fixed", "gravity", "mass", "friction", "restitution"]);
  assert.equal(entityPhysicsStateContract.physicsSolver, "unavailable-for-generic-runtime-entities");
});
