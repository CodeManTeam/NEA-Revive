import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityAnchorOffsetEvidence } from "../conformance/entity-anchor-offset-evidence.mjs";

const manifestSource = await readFile(new URL("../../../Frontend/demo-map/src/capability-manifest.mjs", import.meta.url), "utf8");

test("RuntimeEntity does not expose a fabricated zero anchorOffset", () => {
  const entity = createRuntimeEntity({ id: "anchor-offset" });
  assert.equal(Object.hasOwn(entity, "anchorOffset"), false);
  assert.equal(entityAnchorOffsetEvidence.localRuntimeValue, null);
  assert.equal(entityAnchorOffsetEvidence.status, "recovered-only");
});

test("Capability Manifest blocks anchorOffset with the direct evidence gap", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Anchor Offset Conformance" },
    worldConfig: { entityLimit: 3400 },
    serverModules: [{ name: "server.js", source: 'const entity = world.querySelector(".target"); entity.anchorOffset;' }],
    clientModules: [],
    serverCapabilities: ["server.world.entities"],
    clientCapabilities: [],
    assets: [],
    entities: [],
  });
  const requirement = manifest.requirements.find(item => item.canonicalId === "server.GameEntity.anchorOffset");
  assert.equal(requirement?.state, "blocked");
  assert.ok(requirement?.reasons.some(reason => reason.includes("which offset, sign, scaling, or update lifecycle")));
  assert.match(manifestSource, /constant zero value would fabricate geometry metadata/);
});
