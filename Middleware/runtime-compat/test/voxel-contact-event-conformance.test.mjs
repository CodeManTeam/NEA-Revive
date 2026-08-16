import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { createRuntimeEntity, RuntimeVoxelContactEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createVoxelContactEventFixture } from "../conformance/voxel-contact-event.mjs";

test("RuntimeVoxelContactEvent preserves the recovered eight-field event shape", () => {
  const event = createVoxelContactEventFixture();
  assert.ok(event instanceof RuntimeVoxelContactEvent);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, x: event.x, y: event.y, z: event.z, voxel: event.voxel, axis: event.axis.toArray(), force: event.force.toArray() },
    { tick: 7, entity: "entity", x: 1, y: 2, z: 3, voxel: 631, axis: [0, 1, 0], force: [0, 20, 0] },
  );
});

test("RuntimeEntity voxel contact futures resolve the typed event", async () => {
  const entity = createRuntimeEntity({ id: "contact-target", position: [0, 0, 0] });
  const expected = createVoxelContactEventFixture({ entity });
  const next = entity.nextVoxelContact(event => event.voxel === 631);
  entity._signals.voxelContact.emit(expected);
  assert.equal(await next, expected);
});

test("Capability Manifest propagates inline and named voxel-contact event parameters", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onVoxelContact(event => { event.voxel; event.axis; event.force; event.entity.destroyed; });
      const separated = event => { event.x; event.y; event.z; };
      world.nextVoxelSeparate(separated);
      const entity = world.querySelector("entity");
      entity.onVoxelContact(contact => { contact.tick; });
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.voxel", "event.axis", "event.force", "event.x", "event.y", "event.z"]) {
    const requirements = manifest.requirements.filter(item => item.usage === usage);
    assert.ok(requirements.some(item => item.owner === "GameVoxelContactEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "contact.tick" && item.owner === "GameVoxelContactEvent" && item.state === "partial"));
});
