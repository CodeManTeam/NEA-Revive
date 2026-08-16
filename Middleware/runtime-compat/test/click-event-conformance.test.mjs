import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeClickEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { createClickEventFixture } from "../conformance/click-event.mjs";

test("RuntimeClickEvent preserves the recovered seven-field event shape", () => {
  const event = createClickEventFixture();
  assert.ok(event instanceof RuntimeClickEvent);
  assert.ok(event.raycast instanceof RuntimeRaycastResult);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, clicker: event.clicker.id, button: event.button, distance: event.distance, clickerPosition: event.clickerPosition.toArray() },
    { tick: 11, entity: "clicked", clicker: "clicker", button: "action0", distance: 3, clickerPosition: [0, 0, 0] },
  );
});

test("Capability Manifest propagates click event and nested result owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onClick(event => {
        event.tick; event.button; event.distance; event.clickerPosition; event.raycast;
        const target = event.entity;
        const clicker = event.clicker;
        const raycast = event.raycast;
        target.destroyed; clicker.name; raycast.hit; raycast.distance;
      });
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities", "server.player", "server.player.write"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.button", "event.distance", "event.clickerPosition", "event.raycast"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameClickEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "target.destroyed" && item.owner === "GameEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "clicker.name" && item.owner === "GamePlayerEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "raycast.hit" && item.owner === "GameRaycastResult"));
});
