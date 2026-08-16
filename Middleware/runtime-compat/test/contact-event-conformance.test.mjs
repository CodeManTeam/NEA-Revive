import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const model = JSON.parse(await readFile(new URL("../abi/contact-event-model.json", import.meta.url), "utf8"));

test("canonical contact event fields are evidence-backed", () => {
  const entity = model.canonicalEvents.find(event => event.id === "GameEntityContactEvent");
  const voxel = model.canonicalEvents.find(event => event.id === "GameVoxelContactEvent");
  assert.deepEqual(entity.fields, ["tick", "entity", "other", "axis", "force"]);
  assert.deepEqual(voxel.fields, ["tick", "entity", "x", "y", "z", "voxel", "axis", "force"]);
  assert.equal(entity.localStatus, "partial");
  assert.equal(voxel.localStatus, "compatible");
});

test("per-contact force production is locally compatible while aggregate contactForce remains unresolved", () => {
  assert.equal(model.force.status, "confirmed-historical-production-local-compatible");
  assert.match(model.force.local, /mass \* deltaVelocity \/ deltaTime/);
  assert.match(model.force.schema, /MuFloat32/);
  assert.equal(model.force.solver.status, "confirmed");
  assert.equal(model.force.voxelProjection.cutoff, 0.001);
  assert.equal(model.force.aggregateContactForce.status, "unresolved");
  assert.match(model.force.policy, /do not invent GameEntity\.contactForce/);
});

test("packed voxel axes and authoritative contact records are recovered", () => {
  assert.equal(model.axis.status, "confirmed");
  assert.deepEqual(model.axis.packedMapping, {
    0: [1, 0, 0],
    1: [-1, 0, 0],
    2: [0, 1, 0],
    3: [0, -1, 0],
    4: [0, 0, 1],
    5: [0, 0, -1],
  });
  assert.deepEqual(model.authoritativeState.records.BodyContact, ["otherId", "nx", "ny", "nz", "fx", "fy", "fz"]);
  assert.deepEqual(model.authoritativeState.records.VoxelContact, ["x", "y", "z", "b", "axis", "fx", "fy", "fz"]);
  assert.match(model.authoritativeState.synchronization, /ContactBinding/);
});
