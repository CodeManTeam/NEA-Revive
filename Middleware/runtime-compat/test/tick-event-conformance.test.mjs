import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeTickEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createTickEventFixture } from "../conformance/tick-event.mjs";

test("RuntimeTickEvent separates canonical fields from deltaTime extension", () => {
  const event = createTickEventFixture();
  assert.ok(event instanceof RuntimeTickEvent);
  assert.deepEqual(Object.keys(event), ["tick", "prevTick", "skip", "elapsedTimeMS", "deltaTime"]);
  assert.deepEqual(
    { tick: event.tick, prevTick: event.prevTick, skip: event.skip, elapsedTimeMS: event.elapsedTimeMS, deltaTime: event.deltaTime },
    { tick: 35, prevTick: 33, skip: true, elapsedTimeMS: 128, deltaTime: 0.128 },
  );
});

test("Capability Manifest resolves canonical and local tick fields", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onTick(event => { event.tick; event.prevTick; event.skip; event.elapsedTimeMS; event.deltaTime; });
      const delayed = event => event.skip;
      world.nextTick(delayed);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const usage of ["event.tick", "event.prevTick", "event.skip", "event.elapsedTimeMS"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GameTickEvent" && item.state === "partial"), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "event.deltaTime" && item.owner === "GameTickEvent" && item.localExtensionId === "server.RuntimeTickEvent.deltaTime"));
});
