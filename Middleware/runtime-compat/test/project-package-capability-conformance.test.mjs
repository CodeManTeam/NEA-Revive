import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";

const capturedPackageBuilder = await readFile(new URL("../../../Evidence/preservation-dump/build-editor-runtime-package.mjs", import.meta.url), "utf8");

test("all tracked project package builders publish the shared capability manifest", () => {
  for (const marker of [
    "buildRepositoryProjectCapabilityManifest",
    "capabilities/manifest.json",
    "capabilities: \"capabilities/manifest.json\"",
    "runtimeBinding: \"validated-mesh\"",
    "uiState: validatedUiState",
    "clientRuntimeManifest: clientRuntimeManifestName",
    "projectBootstrapManifest: projectBootstrapManifestName",
    "packageCapturedAudioAssets",
    "runtimeBinding: \"player-block-audio\"",
    "unresolvedPictureAssets",
    "runtimeCompatibility",
  ]) assert.ok(capturedPackageBuilder.includes(marker), `captured package builder is missing capability marker: ${marker}`);
});

test("captured audio packaging preserves verified DAO3 block transport", () => {
  assert.match(capturedPackageBuilder, /cidV0\(bytes\) !== hash/);
  assert.match(capturedPackageBuilder, /writeFile\(join\(archiveRoot, "block", hash\), bytes\)/);
  assert.match(capturedPackageBuilder, /mimeType: "audio\/mpeg"/);
  assert.match(capturedPackageBuilder, /publicRuntimeCapabilities\(runtimeCompatibility\.currentRuntime, "client"\)/);
  assert.doesNotMatch(capturedPackageBuilder, /client\.script/);
});

test("captured picture packaging requires metadata and content hash verification", () => {
  assert.match(capturedPackageBuilder, /packageCapturedPictureAssets/);
  assert.match(capturedPackageBuilder, /digest\("base64url"\) !== metadataHash/);
  assert.match(capturedPackageBuilder, /digest\("base64url"\) !== declaredImageHash/);
  assert.match(capturedPackageBuilder, /metadata\.hash !== declaredImageHash/);
  assert.match(capturedPackageBuilder, /runtimeBinding: "player-picture-image"/);
  assert.match(capturedPackageBuilder, /detectImage\(imageBytes\)/);
});

test("captured package builder discovers and relocates generic Player templates", () => {
  assert.match(capturedPackageBuilder, /discoverRuntimeTemplate\(templateArchive/);
  assert.match(capturedPackageBuilder, /join\(archiveProjectRoot, "client-runtime"\)/);
  assert.match(capturedPackageBuilder, /join\(archiveProjectRoot, "bootstrap", "bootstrap\.json"\)/);
  assert.doesNotMatch(capturedPackageBuilder, /project", "bedwars"/);
  assert.doesNotMatch(capturedPackageBuilder, /world-bedwars\.json/);
});

test("captured package capability analysis remains generic and evidence-gated", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: "world.onTick(() => {}); world.createEntity({ mesh: 'captured-mesh' });" }],
    clientModules: [{ name: "client.js", source: "const label = UiText.create(); label.text = 'ready';" }],
    serverCapabilities: ["server.world.events", "server.world.entities"],
    clientCapabilities: ["client.ui"],
    assets: [{ name: "captured-mesh", runtimeBinding: "validated-mesh" }],
    entities: [{ id: "captured-entity", kind: "entity", mesh: "captured-mesh" }],
    environmentEvidence: {
      formatVersion: "nea-recovered-environment/v1",
      compatibility: "partial",
      source: "recovered-project",
      fields: { drawDistance: 128 },
      diagnostics: [{ code: "runtime-consumption-unverified" }],
    },
    featuresEvidence: {
      formatVersion: "nea-recovered-features/v1",
      compatibility: "partial",
      source: "recovered-project",
      fields: { enableTriggerAPI: true },
      diagnostics: [{ code: "runtime-consumption-unverified" }],
    },
    playerEvidence: { initialPosition: { x: 1, y: 2, z: 3 }, cameraType: "first-person" },
    worldSpawnEvidence: [1, 2, 3],
    playerBodyEvidence: { profileId: "demo", origin: "body-center", originStatus: "confirmed", sizeStatus: "confirmed", boundsHalfExtents: [0.45, 1.1, 0.45], shapeHalfExtents: [0.45, 1.1, 0.45] },
    uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  assert.equal(manifest.summary.blockedEntities, 0);
  assert.ok(manifest.entities.every(entity => entity.state !== "blocked"));
  assert.ok(manifest.requirements.every(requirement => requirement.module === "server.js" || requirement.module === "client.js"));
  assert.equal(manifest.inputs.environment.present, true);
  assert.equal(manifest.inputs.environment.bytes > 0, true);
  assert.match(manifest.inputs.environment.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.inputs.features.present, true);
  assert.match(manifest.inputs.features.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.inputs.player.present, true);
  assert.match(manifest.inputs.player.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.inputs.worldSpawn.present, true);
  assert.match(manifest.inputs.worldSpawn.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.inputs.playerBody.present, true);
  assert.match(manifest.inputs.playerBody.sha256, /^[a-f0-9]{64}$/);
});
