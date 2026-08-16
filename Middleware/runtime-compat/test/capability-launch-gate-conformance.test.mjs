import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { digestCapabilityJson } from "../../../Frontend/demo-map/src/capability-input-digest.mjs";
import { normalizeCapabilityAssets, normalizeCapabilityEntities, normalizeCapabilityProjectIdentity, normalizeCapabilityRuntimeAbi, normalizeCapabilityStorageScope, normalizeCapabilityWorldConfig } from "../../../Frontend/demo-map/src/capability-input-normalize.mjs";
import { capabilityLaunchGateCollections, deriveProjectCapabilitySummary, evaluateProjectCapabilityManifest, verifyProjectCapabilityAssetFiles, verifyProjectCapabilityAssetInput, verifyProjectCapabilityEntityInput, verifyProjectCapabilityGrants, verifyProjectCapabilityModuleInputs, verifyProjectCapabilityProjectIdentityInput, verifyProjectCapabilityRuntimeAbiInput, verifyProjectCapabilityStorageScopeInput, verifyProjectCapabilityUiInput, verifyProjectCapabilityWorldConfigInput } from "../../../Frontend/demo-map/src/capability-launch-gate.mjs";
import { capabilityLaunchGateContract } from "../conformance/capability-launch-gate.mjs";

test("project launch gate covers every manifest evidence collection", () => {
  assert.deepEqual(capabilityLaunchGateCollections, capabilityLaunchGateContract.collections);
});

test("blocked internal evidence dominates a declared ready status", () => {
  const manifest = emptyManifest();
  manifest.dependencies.push({ state: "blocked", side: "cross-runtime", flow: "missing-flow" });
  manifest.summary = deriveProjectCapabilitySummary(manifest);
  assert.equal(evaluateProjectCapabilityManifest(manifest).status, "blocked");
});

test("launch gate state vocabulary is closed", () => {
  const manifest = emptyManifest();
  manifest.resources.push({ state: "script-owned" });
  manifest.summary = deriveProjectCapabilitySummary(manifest);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest), /resources entry state is invalid/);
});

test("launch gate binds manifest ABI identity to the selected project runtime", () => {
  const manifest = emptyManifest();
  manifest.version = 8;
  manifest.summary = deriveProjectCapabilitySummary(manifest);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest), /version is unsupported/);
  manifest.version = capabilityLaunchGateContract.manifestVersion;
  assert.throws(() => evaluateProjectCapabilityManifest(manifest, { apiVersion: "0.2.0" }), /apiVersion mismatch/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest, { contracts: { server: "nea-server-runtime/v2" } }), /server contract mismatch/);
});

test("launch gate recomputes every reported summary count", () => {
  const manifest = emptyManifest();
  manifest.status = "partial";
  manifest.ui.push({ state: "partial" });
  manifest.summary = deriveProjectCapabilitySummary(manifest);
  assert.equal(evaluateProjectCapabilityManifest(manifest).summary.partialUi, 1);
  manifest.summary = { ...manifest.summary, partialUi: 0 };
  assert.throws(() => evaluateProjectCapabilityManifest(manifest), /summary mismatch for partialUi/);
});

test("launch gate binds analyzed server and client module bytes", () => {
  const manifest = emptyManifest();
  const server = Buffer.from("world.say('ok');");
  const client = Buffer.from("ui.log('ok');");
  manifest.inputs.modules = [moduleInput("server", "scripts/server.js", server), moduleInput("client", "clientIndex.js", client)];
  assert.equal(verifyProjectCapabilityModuleInputs(manifest, [{ side: "server", name: "scripts/server.js", bytes: server }, { side: "client", name: "clientIndex.js", bytes: client }]).modules, 2);
  assert.throws(() => verifyProjectCapabilityModuleInputs(manifest, [{ side: "server", name: "scripts/server.js", bytes: Buffer.from("changed") }, { side: "client", name: "clientIndex.js", bytes: client }]), /module hash mismatch/);
});

test("launch gate binds analyzed server and client capability grants", () => {
  const manifest = emptyManifest();
  manifest.inputs.capabilities = { server: ["server.world.events"], client: ["client.core", "client.ui"] };
  assert.deepEqual(verifyProjectCapabilityGrants(manifest, { server: ["server.world.events"], client: ["client.ui", "client.core"] }), { server: 1, client: 2 });
  assert.throws(() => verifyProjectCapabilityGrants(manifest, { server: [], client: ["client.ui", "client.core"] }), /server grants mismatch/);
});

test("launch gate binds analyzed UI state to the Player UI manifest", () => {
  const manifest = emptyManifest();
  const ui = { format: "nea-recovered-client-ui", version: 1, uiTree: { ROOT_ID: { id: "ROOT_ID" } }, pictureAssets: {} };
  manifest.inputs.ui = digestCapabilityJson(ui);
  assert.equal(verifyProjectCapabilityUiInput(manifest, ui).present, true);
  assert.throws(() => verifyProjectCapabilityUiInput(manifest, { ...ui, pictureAssets: { changed: {} } }), /UI input mismatch/);
});

test("launch gate binds asset files and entity mesh projection evidence", () => {
  const manifest = emptyManifest();
  const sourceAssets = [{ name: "mesh-a", packagePath: "assets/files/a.bin", bytes: Buffer.from("mesh"), sha256: "a".repeat(64) }];
  const sourceEntities = [{ id: "entity-a", kind: "prop", mesh: "mesh-a" }];
  manifest.inputs.assets = digestCapabilityJson(normalizeCapabilityAssets(sourceAssets));
  manifest.inputs.entities = digestCapabilityJson(normalizeCapabilityEntities(sourceEntities));
  assert.equal(verifyProjectCapabilityAssetInput(manifest, [{ name: "mesh-a", path: "assets/files/a.bin", bytes: 4, sha256: "a".repeat(64) }]).present, true);
  assert.equal(verifyProjectCapabilityEntityInput(manifest, [{ kind: "prop", tags: ["id-entity-a"], mesh: "mesh-a" }]).present, true);
  assert.throws(() => verifyProjectCapabilityEntityInput(manifest, [{ kind: "prop", tags: ["id-entity-a"], mesh: "mesh-b" }]), /entity input mismatch/);
});

test("launch gate verifies package asset bodies against their index", async () => {
  const bytes = Buffer.from("asset-body");
  const asset = { logicalPath: "asset-a", source: "assets/a.bin", bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
  assert.equal((await verifyProjectCapabilityAssetFiles([asset], async () => bytes)).assets, 1);
  await assert.rejects(() => verifyProjectCapabilityAssetFiles([asset], async () => Buffer.from("tampered")), /asset file mismatch/);
});

test("launch gate binds semantic Runtime ABI artifacts while ignoring generated timestamps", () => {
  const manifest = emptyManifest();
  const runtimeCompatibility = emptyRuntimeCompatibility();
  manifest.inputs.runtimeAbi = digestCapabilityJson(normalizeCapabilityRuntimeAbi(runtimeCompatibility));
  const regenerated = structuredClone(runtimeCompatibility);
  regenerated.currentRuntime.generatedAt = "2099-01-01T00:00:00.000Z";
  regenerated.compatibilityMatrix.generatedAt = "2099-01-01T00:00:00.000Z";
  regenerated.runtimeContracts.generatedAt = "2099-01-01T00:00:00.000Z";
  assert.equal(verifyProjectCapabilityRuntimeAbiInput(manifest, regenerated).present, true);
  regenerated.currentRuntime.entries.push({ id: "world.changed", side: "server" });
  assert.throws(() => verifyProjectCapabilityRuntimeAbiInput(manifest, regenerated), /Runtime ABI input mismatch/);
});

test("launch gate binds the project name used by world.projectName", () => {
  const manifest = emptyManifest();
  manifest.inputs.projectIdentity = digestCapabilityJson(normalizeCapabilityProjectIdentity({ projectName: "Project A" }));
  assert.equal(verifyProjectCapabilityProjectIdentityInput(manifest, { projectName: "Project A" }).present, true);
  assert.throws(() => verifyProjectCapabilityProjectIdentityInput(manifest, { projectName: "Project B" }), /project identity input mismatch/);
});

test("launch gate binds the world entity limit", () => {
  const manifest = emptyManifest();
  manifest.inputs.worldConfig = digestCapabilityJson(normalizeCapabilityWorldConfig({ entityLimit: 12 }));
  assert.equal(verifyProjectCapabilityWorldConfigInput(manifest, { entityLimit: 12 }).present, true);
  assert.throws(() => verifyProjectCapabilityWorldConfigInput(manifest, { entityLimit: 13 }), /world config input mismatch/);
});

test("launch gate contract records static sound samples and playback transport", () => {
  assert.equal(capabilityLaunchGateContract.manifestVersion, 14);
  assert.equal(capabilityLaunchGateContract.bindsStaticServerSoundSamples, true);
  assert.equal(capabilityLaunchGateContract.requiresSoundPlaybackTransport, true);
});

function emptyManifest() {
  const manifest = Object.fromEntries(capabilityLaunchGateContract.collections.map(name => [name, []]));
  return Object.assign(manifest, {
    format: "nea-project-capability-manifest",
    version: capabilityLaunchGateContract.manifestVersion,
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    inputs: { modules: [], capabilities: { server: [], client: [] }, ui: digestCapabilityJson(null), assets: digestCapabilityJson([]), entities: digestCapabilityJson([]), storageScope: digestCapabilityJson({ groupId: null }), projectIdentity: digestCapabilityJson(normalizeCapabilityProjectIdentity({ projectName: "Conformance Project" })), worldConfig: digestCapabilityJson(normalizeCapabilityWorldConfig({ entityLimit: 3400 })), runtimeAbi: digestCapabilityJson(normalizeCapabilityRuntimeAbi(emptyRuntimeCompatibility())) },
    status: "ready",
  });
}

function emptyRuntimeCompatibility() {
  return {
    currentRuntime: { format: "nea-current-runtime", generatedAt: "2026-01-01T00:00:00.000Z", entries: [] },
    compatibilityMatrix: { format: "nea-compatibility-matrix", generatedAt: "2026-01-01T00:00:00.000Z", entries: [] },
    runtimeContracts: { format: "nea-runtime-contracts", generatedAt: "2026-01-01T00:00:00.000Z", contracts: [] },
  };
}

function moduleInput(side, name, bytes) {
  return { side, name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
}
