import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeRespawnEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createRespawnEventFixture } from "../conformance/respawn-event.mjs";

test("RuntimeRespawnEvent preserves the recovered two-field event shape", () => {
  const event = createRespawnEventFixture();
  assert.ok(event instanceof RuntimeRespawnEvent);
  assert.deepEqual(Object.keys(event), ["tick", "entity"]);
  assert.deepEqual({ tick: event.tick, entity: event.entity.id }, { tick: 29, entity: "player" });
});

test("Capability Manifest propagates respawn event player owner", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onRespawn(event => {
        event.tick;
        const player = event.entity;
        player.name;
      });
      const named = event => event.entity.name === "Player";
      world.nextRespawn(named);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.player.write"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  assert.ok(manifest.requirements.some(item => item.usage === "event.tick" && item.owner === "GameRespawnEvent" && item.state === "partial"));
  assert.ok(manifest.requirements.some(item => item.usage === "player.name" && item.owner === "GamePlayerEntity"));
});
