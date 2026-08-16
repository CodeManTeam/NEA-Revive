import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeChatEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createChatEventFixture } from "../conformance/chat-event.mjs";

test("RuntimeChatEvent preserves the recovered three-field shape without player alias", () => {
  const event = createChatEventFixture();
  assert.ok(event instanceof RuntimeChatEvent);
  assert.deepEqual(Object.keys(event), ["tick", "entity", "message"]);
  assert.equal("player" in event, false);
});

test("Capability Manifest types chat payloads while retaining the ingress blocker", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onChat(event => { event.tick; event.message; const speaker = event.entity; speaker.destroyed; });
      const command = event => event.message.startsWith("/");
      world.nextChat(command);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.chat", "server.world.entities"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.status, "blocked");
  assert.ok(manifest.requirements.some(item => item.usage === "event.message" && item.owner === "GameChatEvent" && item.state === "partial"));
  assert.ok(manifest.requirements.some(item => item.usage === "speaker.destroyed" && item.owner === "GameEntity"));
  assert.ok(manifest.diagnostics.some(item => item.code === "chat-ingress-unavailable" && item.state === "blocked"));
});
