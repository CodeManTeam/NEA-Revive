import assert from "node:assert/strict";
import test from "node:test";
import {
  compactVoxelContactForces,
  projectBodyContactPair,
  reconstructActiveContacts,
  reconstructSolverContactForce,
  unpackCubeAxis,
} from "../conformance/contact-state.mjs";

test("cube axis indices reconstruct the recovered six normals", () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, axis) => unpackCubeAxis(axis)), [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]);
  assert.deepEqual(unpackCubeAxis(8), [0, 0, 0]);
});

test("ContactRecord fields reconstruct active script contact objects", () => {
  const other = Object.freeze({ id: "other-entity" });
  const contacts = reconstructActiveContacts({
    id: 7,
    body: [{ otherId: 9, nx: 0, ny: 1, nz: 0, fx: 1.5, fy: 8, fz: -2 }],
    voxel: [{ x: 4, y: 5, z: 6, b: 631, axis: 2, fx: 0, fy: 12, fz: 0 }],
    fluidVoxels: [300, 301],
    fluidVolumeFraction: [0.25, 0.75],
  }, new Map([[9, other]]));
  assert.deepEqual(contacts.entityContacts, [{ other, axis: [0, 1, 0], force: [1.5, 8, -2] }]);
  assert.deepEqual(contacts.voxelContacts, [{ x: 4, y: 5, z: 6, voxel: 631, axis: [0, 1, 0], force: [0, 12, 0] }]);
  assert.deepEqual(contacts.fluidContacts, [{ voxel: 300, volume: 0.25 }, { voxel: 301, volume: 0.75 }]);
  assert.equal(contacts.contactForce, null);
  assert.deepEqual(contacts.compatibility.unresolved, ["contactForce aggregation"]);
});

test("missing body entities are dropped like origin event reconstruction", () => {
  const contacts = reconstructActiveContacts({
    id: 7,
    body: [{ otherId: 404, nx: 1, ny: 0, nz: 0, fx: 1, fy: 0, fz: 0 }],
    voxel: [],
    fluidVoxels: [],
    fluidVolumeFraction: [],
  });
  assert.deepEqual(contacts.entityContacts, []);
});

test("solver contact force combines normal and friction impulses per fixed step", () => {
  assert.deepEqual(reconstructSolverContactForce([{
    normal: [0, 1, 0],
    tangent: [1, 0, 0],
    binormal: [0, 0, 1],
    normalImpulse: 0.5,
    tangentImpulse: -0.125,
    binormalImpulse: 0.25,
  }], 20), [-2.5, 10, 5]);
});

test("body contact records mirror axis and force for the second body", () => {
  assert.deepEqual(projectBodyContactPair(3, 8, [0, 1, 0], [2, 10, -4]), [
    { otherId: 8, axis: [0, -1, 0], force: [2, 10, -4] },
    { otherId: 3, axis: [0, 1, 0], force: [-2, -10, 4] },
  ]);
});

test("voxel contact compaction averages retained axis-coordinate groups", () => {
  const compacted = compactVoxelContactForces([
    { x: 1, y: 4, z: 2, axis: 2, fx: 0, fy: 6, fz: 0 },
    { x: 2, y: 4, z: 2, axis: 2, fx: 0, fy: 2, fz: 0 },
    { x: 1, y: 5, z: 2, axis: 2, fx: 0, fy: 0.0004, fz: 0 },
  ]);
  assert.deepEqual(compacted, [
    { x: 1, y: 4, z: 2, axis: 2, fx: 0, fy: 4, fz: 0 },
    { x: 2, y: 4, z: 2, axis: 2, fx: 0, fy: 4, fz: 0 },
  ]);
});
