import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeFluidContactEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createFluidContactEventFixture } from "../conformance/fluid-contact-event.mjs";

test("RuntimeFluidContactEvent preserves the recovered three-field event shape", () => {
  const event = createFluidContactEventFixture();
  assert.ok(event instanceof RuntimeFluidContactEvent);
  assert.deepEqual({ tick: event.tick, entity: event.entity.id, voxel: event.voxel }, { tick: 9, entity: "fluid-entity", voxel: 21 });
});

test("Capability Manifest propagates inline and named fluid-contact event parameters", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onFluidEnter(event => { event.tick; event.entity.destroyed; event.voxel; });
      const left = contact => { contact.tick; contact.voxel; };
      world.nextFluidLeave(left);
      const entity = world.querySelector("entity");
      entity.onFluidEnter(fluid => { fluid.voxel; });
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.voxel", "contact.tick", "contact.voxel", "fluid.voxel"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameFluidContactEvent" && item.state === "partial"), usage);
  }
});
