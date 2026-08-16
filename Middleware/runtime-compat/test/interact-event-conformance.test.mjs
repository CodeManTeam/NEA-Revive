import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeInteractEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createInteractEventFixture } from "../conformance/interact-event.mjs";

test("RuntimeInteractEvent preserves the recovered three-field event shape", () => {
  const event = createInteractEventFixture();
  assert.ok(event instanceof RuntimeInteractEvent);
  assert.deepEqual(Object.keys(event), ["tick", "entity", "targetEntity"]);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, targetEntity: event.targetEntity.id },
    { tick: 31, entity: "player", targetEntity: "target" },
  );
});

test("Capability Manifest propagates interact initiator and target owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onInteract(event => {
        event.tick;
        const player = event.entity;
        const target = event.targetEntity;
        player.name; target.destroyed;
      });
      const mapped = event => event.targetEntity.destroyed === false;
      world.nextInteract(mapped);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.player.write", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  assert.ok(manifest.requirements.some(item => item.usage === "event.tick" && item.owner === "GameInteractEvent" && item.state === "partial"));
  assert.ok(manifest.requirements.some(item => item.usage === "player.name" && item.owner === "GamePlayerEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "target.destroyed" && item.owner === "GameEntity"));
});
