import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { entityContactGateSource } from "../conformance/entity-contact-gate.mjs";

test("Capability Manifest blocks canonical entity contact without treating generic colliders as equivalent", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: entityContactGateSource }],
    clientModules: [],
    serverCapabilities: ["server.world.events"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.status, "blocked");
  for (const usage of ["world.onEntityContact", "world.nextEntityContact"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.state === "blocked" && item.reasons.some(reason => reason.includes("no bodyContact producer"))), usage);
  }
  assert.ok(manifest.requirements.some(item => item.usage === "world.onContact" && item.state === "partial"));
  assert.ok(manifest.requirements.some(item => item.usage === "world.onContactSeparate" && item.state === "partial"));
});
