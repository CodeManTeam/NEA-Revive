import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeEntityEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createEntityEventFixture } from "../conformance/entity-event.mjs";

test("RuntimeEntityEvent preserves recovered fields and the local player alias", () => {
  const event = createEntityEventFixture();
  assert.ok(event instanceof RuntimeEntityEvent);
  assert.deepEqual({ tick: event.tick, entity: event.entity.id, player: event.player.id }, { tick: 17, entity: "entity", player: "entity" });
});

test("Capability Manifest propagates shared lifecycle event parameters", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onEntityCreate(event => { event.tick; event.entity; const entity = event.entity; entity.destroyed; });
      const left = event => event.tick;
      world.nextPlayerLeave(left);
      const target = world.querySelector("entity");
      target.onDestroy(event => event.entity.destroyed);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.entity"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameEntityEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "entity.destroyed" && item.owner === "GameEntity"));
});
