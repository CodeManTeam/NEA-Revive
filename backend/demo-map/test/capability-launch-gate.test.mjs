import assert from "node:assert/strict";
import test from "node:test";

import { createHash } from "node:crypto";
import { digestCapabilityJson } from "../src/capability-input-digest.mjs";
import { normalizeCapabilityAssets, normalizeCapabilityEntities, normalizeCapabilityPlayerBody, normalizeCapabilityProjectIdentity, normalizeCapabilityRuntimeAbi, normalizeCapabilityStorageScope, normalizeCapabilityWorldConfig } from "../src/capability-input-normalize.mjs";
import { assertProjectCapabilities, deriveProjectCapabilitySummary, evaluateProjectCapabilityManifest, verifyProjectCapabilityAssetFiles, verifyProjectCapabilityAssetInput, verifyProjectCapabilityEntityInput, verifyProjectCapabilityGrants, verifyProjectCapabilityModuleInputs, verifyProjectCapabilityPlayerBodyInput, verifyProjectCapabilityProjectIdentityInput, verifyProjectCapabilityRuntimeAbiInput, verifyProjectCapabilityStorageScopeInput, verifyProjectCapabilityUiInput, verifyProjectCapabilityWorldConfigInput, verifyProjectCapabilityWorldSpawnInput } from "../src/capability-launch-gate.mjs";
import { normalizeWorldSpawn } from "../src/world-spawn.mjs";

function manifest(overrides = {}) {
  const value = {
    format: "nea-project-capability-manifest",
    version: 14,
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    inputs: { modules: [], capabilities: { server: [], client: [] }, ui: digestCapabilityJson(null), assets: digestCapabilityJson([]), entities: digestCapabilityJson([]), storageScope: digestCapabilityJson({ groupId: null }), projectIdentity: digestCapabilityJson({ projectName: "Capability Test" }), worldConfig: digestCapabilityJson(normalizeCapabilityWorldConfig({ entityLimit: 3400 })), worldSpawn: digestCapabilityJson(normalizeWorldSpawn([1, 2, 3])), playerBody: digestCapabilityJson(normalizeCapabilityPlayerBody({ profileId: "demo", origin: "body-center", originStatus: "confirmed", sizeStatus: "confirmed", boundsHalfExtents: [0.45, 1.1, 0.45], shapeHalfExtents: [0.45, 1.1, 0.45] })), runtimeAbi: digestCapabilityJson(normalizeCapabilityRuntimeAbi(emptyRuntimeCompatibility())) },
    status: "ready",
    requirements: [], modules: [], resources: [], ui: [], entities: [], dependencies: [], diagnostics: [],
    ...overrides,
  };
  value.summary = overrides.summary ?? deriveProjectCapabilitySummary(value);
  return value;
}

test("launch gate derives status from every manifest collection", () => {
  for (const name of ["requirements", "modules", "resources", "ui", "entities", "dependencies", "diagnostics"]) {
    const value = manifest({ status: "blocked", [name]: [{ state: "blocked" }] });
    assert.equal(evaluateProjectCapabilityManifest(value).status, "blocked", name);
    assert.throws(() => assertProjectCapabilities(value, () => {}), /Project launch blocked/);
  }
});

test("launch gate rejects a stale or tampered top-level status", () => {
  const value = manifest({ requirements: [{ state: "blocked", side: "server", module: "server.js", usage: "world.onChat" }] });
  assert.throws(() => assertProjectCapabilities(value, () => {}), /status mismatch: declared ready, derived blocked/);
});

test("launch gate rejects unknown states instead of treating them as ready", () => {
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ status: "unknown" })), /manifest status is invalid/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ resources: [{ state: "script-owned" }] })), /resources entry state is invalid/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ requirements: [{ state: "unavailable" }] })), /requirements entry state is invalid/);
  assert.equal(evaluateProjectCapabilityManifest(manifest({ requirements: [{ state: "script-owned" }] })).status, "ready");
});

test("launch gate rejects stale manifests and project contract mismatches", () => {
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ version: 9 })), /version is unsupported/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ apiVersion: "0.0.9" }), { apiVersion: "0.1.0" }), /apiVersion mismatch/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ contracts: { client: "dao3-client-runtime/v0", server: "nea-server-runtime/v1" } }), {
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
  }), /client contract mismatch/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest({ contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v0" } }), {
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
  }), /server contract mismatch/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest(), { apiVersion: undefined }), /Expected project runtime apiVersion is missing/);
  assert.throws(() => evaluateProjectCapabilityManifest(manifest(), { contracts: { client: undefined, server: "nea-server-runtime/v1" } }), /Expected project runtime client contract is missing/);
});

test("launch gate binds scanned module hashes to actual server and client bytes", () => {
  const server = Buffer.from("world.say('server');", "utf8");
  const client = Buffer.from("ui.log('client');", "utf8");
  const input = (side, name, bytes) => ({ side, name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
  const value = manifest({ inputs: { modules: [input("server", "scripts/server.js", server), input("client", "clientIndex.js", client)] } });
  assert.equal(verifyProjectCapabilityModuleInputs(value, [{ side: "server", name: "scripts/server.js", bytes: server }, { side: "client", name: "clientIndex.js", bytes: client }]).modules, 2);
  assert.throws(() => verifyProjectCapabilityModuleInputs(value, [{ side: "server", name: "scripts/server.js", bytes: Buffer.from("changed") }, { side: "client", name: "clientIndex.js", bytes: client }]), /module hash mismatch/);
  assert.throws(() => verifyProjectCapabilityModuleInputs(value, [{ side: "server", name: "scripts/server.js", bytes: server }]), /module count mismatch/);
});

test("launch gate binds analyzed capability grants to runtime manifests", () => {
  const value = manifest({ inputs: { modules: [], capabilities: { server: ["server.world.events", "server.world.entities"], client: ["client.core"] } } });
  assert.deepEqual(verifyProjectCapabilityGrants(value, { server: ["server.world.entities", "server.world.events"], client: ["client.core"] }), { server: 2, client: 1 });
  assert.throws(() => verifyProjectCapabilityGrants(value, { server: ["server.world.events"], client: ["client.core"] }), /server grants mismatch/);
  assert.throws(() => verifyProjectCapabilityGrants(value, { server: ["server.world.events", "server.world.entities"], client: ["client.core", "client.ui"] }), /client grants mismatch/);
  assert.throws(() => verifyProjectCapabilityGrants(value, { server: ["server.world.events", "server.world.events"], client: ["client.core"] }), /grant is duplicated/);
});

test("launch gate binds analyzed UI state to the published Player UI manifest", () => {
  const ui = { format: "nea-recovered-client-ui", version: 1, uiTree: { ROOT_ID: { id: "ROOT_ID" } }, pictureAssets: {} };
  const value = manifest({ inputs: { modules: [], capabilities: { server: [], client: [] }, ui: digestCapabilityJson(ui) } });
  assert.equal(verifyProjectCapabilityUiInput(value, ui).present, true);
  assert.throws(() => verifyProjectCapabilityUiInput(value, { ...ui, uiTree: {} }), /UI input mismatch/);
  assert.throws(() => verifyProjectCapabilityUiInput(value, null), /UI input mismatch/);
  assert.equal(verifyProjectCapabilityUiInput(manifest(), null).present, false);
});

test("launch gate rejects a substituted storage scope", () => {
  const value = manifest({ inputs: { ...manifest().inputs, storageScope: digestCapabilityJson(normalizeCapabilityStorageScope({ groupId: "group-a" })) } });
  assert.equal(verifyProjectCapabilityStorageScopeInput(value, { groupId: "group-a" }).present, true);
  assert.throws(() => verifyProjectCapabilityStorageScopeInput(value, { groupId: "group-b" }), /storage scope input mismatch/);
});

test("launch gate rejects a substituted project identity", () => {
  const value = manifest({ inputs: { ...manifest().inputs, projectIdentity: digestCapabilityJson(normalizeCapabilityProjectIdentity({ projectName: "Project A" })) } });
  assert.equal(verifyProjectCapabilityProjectIdentityInput(value, { projectName: "Project A" }).present, true);
  assert.throws(() => verifyProjectCapabilityProjectIdentityInput(value, { projectName: "Project B" }), /project identity input mismatch/);
});

test("launch gate binds capability-relevant asset and entity projections", () => {
  const sourceAssets = [{ name: "mesh-a", packagePath: "assets/files/a.bin", bytes: Buffer.from("mesh"), sha256: "a".repeat(64) }];
  const packagedAssets = [{ name: "mesh-a", path: "assets/files/a.bin", bytes: 4, sha256: "a".repeat(64) }];
  const sourceEntities = [{ id: "spawn-a", kind: "prop", mesh: "mesh-a" }];
  const packagedEntities = [{ kind: "prop", tags: ["id-spawn-a"], mesh: "mesh-a" }];
  const value = manifest({ inputs: { modules: [], capabilities: { server: [], client: [] }, ui: digestCapabilityJson(null), assets: digestCapabilityJson(normalizeCapabilityAssets(sourceAssets)), entities: digestCapabilityJson(normalizeCapabilityEntities(sourceEntities)) } });
  assert.equal(verifyProjectCapabilityAssetInput(value, packagedAssets).present, true);
  assert.equal(verifyProjectCapabilityEntityInput(value, packagedEntities).present, true);
  assert.throws(() => verifyProjectCapabilityAssetInput(value, [{ ...packagedAssets[0], sha256: "b".repeat(64) }]), /asset input mismatch/);
  assert.throws(() => verifyProjectCapabilityEntityInput(value, [{ ...packagedEntities[0], mesh: "mesh-b" }]), /entity input mismatch/);
});

test("launch gate verifies actual asset bytes before trusting the asset index", async () => {
  const bytes = Buffer.from("asset-body");
  const asset = { name: "asset-a", path: "assets/a.bin", bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
  assert.deepEqual(await verifyProjectCapabilityAssetFiles([asset], async () => bytes), { assets: 1 });
  await assert.rejects(() => verifyProjectCapabilityAssetFiles([asset], async () => Buffer.from("changed")), /asset file mismatch/);
  await assert.rejects(() => verifyProjectCapabilityAssetFiles([asset, { ...asset }], async () => bytes), /source is duplicated/);
  await assert.rejects(() => verifyProjectCapabilityAssetFiles([{ name: "metadata-only" }], async () => bytes), /file evidence is incomplete/);
});

test("launch gate binds Capability conclusions to the current Runtime ABI artifacts", () => {
  const runtimeCompatibility = emptyRuntimeCompatibility();
  runtimeCompatibility.currentRuntime = { format: "nea-runtime-abi", generatedAt: "first", entries: [{ id: "server.world.say" }] };
  const value = manifest({ inputs: { ...manifest().inputs, runtimeAbi: digestCapabilityJson(normalizeCapabilityRuntimeAbi(runtimeCompatibility)) } });
  assert.equal(verifyProjectCapabilityRuntimeAbiInput(value, { ...runtimeCompatibility, currentRuntime: { ...runtimeCompatibility.currentRuntime, generatedAt: "second" } }).present, true);
  assert.throws(() => verifyProjectCapabilityRuntimeAbiInput(value, { ...runtimeCompatibility, currentRuntime: { ...runtimeCompatibility.currentRuntime, entries: [] } }), /Runtime ABI input mismatch/);
});

test("launch gate binds the normalized world spawn", () => {
  const value = manifest({ inputs: { ...manifest().inputs, worldSpawn: digestCapabilityJson(normalizeWorldSpawn([1, 2, 3])) } });
  assert.equal(verifyProjectCapabilityWorldSpawnInput(value, { x: 1, y: 2, z: 3 }).present, true);
  assert.throws(() => verifyProjectCapabilityWorldSpawnInput(value, [1, 2, 4]), /world spawn input mismatch/);
});

test("launch gate binds recovered world gravity and airFriction together", () => {
  const worldConfig = { entityLimit: 3400, gravity: -0.1, airFriction: 0.01 };
  const value = manifest({ inputs: { ...manifest().inputs, worldConfig: digestCapabilityJson(normalizeCapabilityWorldConfig(worldConfig)) } });
  assert.equal(verifyProjectCapabilityWorldConfigInput(value, worldConfig).present, true);
  assert.throws(() => verifyProjectCapabilityWorldConfigInput(value, { ...worldConfig, airFriction: 0.02 }), /world config input mismatch/);
  assert.throws(() => normalizeCapabilityWorldConfig({ entityLimit: 3400, gravity: -0.1 }), /gravity and airFriction together/);
});

test("launch gate binds the Player body profile", () => {
  const profile = { profileId: "demo", origin: "body-center", originStatus: "confirmed", sizeStatus: "confirmed", boundsHalfExtents: [0.45, 1.1, 0.45], shapeHalfExtents: [0.45, 1.1, 0.45] };
  const value = manifest({ inputs: { ...manifest().inputs, playerBody: digestCapabilityJson(normalizeCapabilityPlayerBody(profile)) } });
  assert.equal(verifyProjectCapabilityPlayerBodyInput(value, { ...profile, boundsHalfExtents: { x: 0.45, y: 1.1, z: 0.45 }, shapeHalfExtents: { x: 0.45, y: 1.1, z: 0.45 } }).present, true);
  assert.throws(() => verifyProjectCapabilityPlayerBodyInput(value, { ...profile, shapeHalfExtents: [0.5, 1.1, 0.45] }), /shapeHalfExtents must fit inside boundsHalfExtents/);
});

function emptyRuntimeCompatibility() {
  return { currentRuntime: { entries: [] }, compatibilityMatrix: { entries: [] }, runtimeContracts: { flows: [] } };
}

test("launch gate rejects stale or tampered summary counts", () => {
  const value = manifest({ requirements: [{ state: "partial" }], status: "partial" });
  assert.equal(evaluateProjectCapabilityManifest(value).summary.partial, 1);
  assert.throws(() => evaluateProjectCapabilityManifest({ ...value, summary: { ...value.summary, partial: 0 } }), /summary mismatch for partial/);
  assert.throws(() => evaluateProjectCapabilityManifest({ ...value, summary: null }), /summary is missing or invalid/);
});

test("launch gate reports partial dependencies and diagnostics", () => {
  const warnings = [];
  const value = manifest({
    status: "partial",
    dependencies: [{ state: "partial", id: "transport:chat-delivery", side: "server", usage: "world.say" }],
    diagnostics: [{ state: "partial", side: "client", module: "client.js", code: "dynamic-selector" }],
  });
  const evaluation = assertProjectCapabilities(value, warning => warnings.push(warning));
  assert.equal(evaluation.status, "partial");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /dependency:transport:chat-delivery/);
  assert.match(warnings[0], /client:client\.js:dynamic-selector/);
});
