import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeKeyBoardEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createKeyBoardEventFixture } from "../conformance/keyboard-event.mjs";

test("RuntimeKeyBoardEvent preserves the recovered two-field shape", () => {
  const event = createKeyBoardEventFixture();
  assert.ok(event instanceof RuntimeKeyBoardEvent);
  assert.deepEqual(Object.keys(event), ["tick", "keyCode"]);
  assert.deepEqual({ tick: event.tick, keyCode: event.keyCode }, { tick: 43, keyCode: 65 });
});

test("Capability Manifest types keyboard payloads with recovered Player ingress", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onPlayerJoin(({ player }) => {
        player.onKeyDown(event => { event.tick; event.keyCode; });
        player.onKeyUp(event => event.keyCode);
      });
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.status, "partial");
  assert.ok(manifest.requirements.some(item => item.usage === "event.keyCode" && item.owner === "GameKeyBoardEvent" && item.state === "partial"));
  for (const usage of ["player.onKeyDown", "player.onKeyUp"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.state === "partial"), usage);
  }
});
