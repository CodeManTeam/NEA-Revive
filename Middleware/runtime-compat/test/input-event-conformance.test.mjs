import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeInputEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { createInputEventFixture } from "../conformance/input-event.mjs";

test("RuntimeInputEvent preserves the recovered six-field event shape", () => {
  const event = createInputEventFixture();
  assert.ok(event instanceof RuntimeInputEvent);
  assert.ok(event.raycast instanceof RuntimeRaycastResult);
  assert.deepEqual(
    { tick: event.tick, entity: event.entity.id, position: event.position.toArray(), button: event.button, pressed: event.pressed },
    { tick: 13, entity: "player", position: [1, 2, 3], button: "jump", pressed: true },
  );
});

test("Capability Manifest propagates input event and nested owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onPress(event => {
        event.tick; event.position; event.button; event.pressed; event.raycast;
        const player = event.entity;
        const raycast = event.raycast;
        player.name; raycast.hit; raycast.distance;
      });
      const released = event => event.pressed;
      world.nextRelease(released);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events", "server.world.entities", "server.player.write"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.position", "event.button", "event.pressed", "event.raycast"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameInputEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "player.name" && item.owner === "GamePlayerEntity"));
  assert.ok(manifest.requirements.some(item => item.usage === "raycast.hit" && item.owner === "GameRaycastResult"));
});
