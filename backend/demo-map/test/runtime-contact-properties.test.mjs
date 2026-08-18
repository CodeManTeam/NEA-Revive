import assert from "node:assert/strict";
import test from "node:test";
import { activeVoxelContacts, sumContactForce } from "../src/runtime/script-runtime.mjs";

test("active contact properties project voxel fields and accumulated force", () => {
  const body = {
    contacts: new Map([
      ["floor", {
        collider: { kind: "voxel", x: 8, y: 5, z: 8, blockId: 631 },
        normal: { x: 0, y: 1, z: 0 },
        force: { x: 2, y: 20, z: 0 },
      }],
      ["wall", {
        collider: { kind: "voxel", x: 9, y: 6, z: 8, blockId: 177 },
        normal: { x: -1, y: 0, z: 0 },
        force: { x: -5, y: 0, z: 1 },
      }],
    ]),
  };

  const contacts = activeVoxelContacts(body);
  assert.equal(contacts.length, 2);
  assert.deepEqual({ ...contacts[0], axis: contacts[0].axis.toArray(), force: contacts[0].force.toArray() }, {
    x: 8, y: 5, z: 8, voxel: 631, axis: [0, 1, 0], force: [2, 20, 0],
  });
  assert.deepEqual(sumContactForce(body).toArray(), [-3, 20, 1]);
  assert.equal(Object.isFrozen(contacts), true);
});
