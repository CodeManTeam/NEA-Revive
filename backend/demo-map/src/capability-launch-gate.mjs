import { createHash } from "node:crypto";
import { digestCapabilityJson } from "./capability-input-digest.mjs";
import { normalizeCapabilityAssets, normalizeCapabilityEntities, normalizeCapabilityPlayerBody, normalizeCapabilityProjectIdentity, normalizeCapabilityRuntimeAbi, normalizeCapabilityStorageScope, normalizeCapabilityWorldConfig } from "./capability-input-normalize.mjs";
import { normalizeWorldSpawn } from "./world-spawn.mjs";

const COLLECTIONS = Object.freeze([
  Object.freeze({ name: "requirements", label: item => `${item.side}:${item.module}:${item.usage}` }),
  Object.freeze({ name: "modules", label: item => `${item.side}:${item.module}->${item.specifier}` }),
  Object.freeze({ name: "resources", label: item => `${item.kind}:${item.reference}` }),
  Object.freeze({ name: "ui", label: item => `client-ui:${item.module ?? "project"}:${item.lookupName ?? item.name ?? item.variable}` }),
  Object.freeze({ name: "entities", label: item => `${item.source}:${item.id ?? item.module ?? "unknown"}:entity` }),
  Object.freeze({ name: "dependencies", label: item => `dependency:${item.id ?? item.flow ?? "unknown"}` }),
  Object.freeze({ name: "diagnostics", label: item => `${item.side}:${item.module}:${item.code}` }),
]);
const MANIFEST_STATUSES = new Set(["ready", "partial", "blocked"]);
const ENTRY_STATES = new Set(["ready", "partial", "blocked"]);
const CAPABILITY_MANIFEST_VERSION = 14;
const SHA256 = /^[0-9a-f]{64}$/;

export const capabilityLaunchGateCollections = Object.freeze(COLLECTIONS.map(collection => collection.name));

export function verifyProjectCapabilityModuleInputs(manifest, modules) {
  const expected = validateModuleInputs(manifest);
  if (!Array.isArray(modules)) throw new Error("Project capability module inputs are missing or invalid");
  const actual = new Map();
  for (const module of modules) {
    if (!module || typeof module !== "object" || (module.side !== "server" && module.side !== "client") || typeof module.name !== "string") throw new Error("Project capability actual module entry is invalid");
    const key = `${module.side}:${module.name}`;
    if (actual.has(key)) throw new Error(`Project capability actual module is duplicated: ${key}`);
    const bytes = Buffer.isBuffer(module.bytes) || module.bytes instanceof Uint8Array ? module.bytes : Buffer.from(String(module.source ?? ""), "utf8");
    actual.set(key, { bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  if (actual.size !== expected.size) throw new Error(`Project capability module count mismatch: declared ${expected.size}, actual ${actual.size}`);
  for (const [key, declared] of expected) {
    const value = actual.get(key);
    if (!value) throw new Error(`Project capability module is missing: ${key}`);
    if (value.bytes !== declared.bytes || value.sha256 !== declared.sha256) throw new Error(`Project capability module hash mismatch: ${key}`);
  }
  return Object.freeze({ modules: actual.size });
}

export function verifyProjectCapabilityGrants(manifest, capabilities) {
  const expected = validateCapabilityInputs(manifest);
  if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) throw new Error("Project capability actual grants are missing or invalid");
  for (const side of ["server", "client"]) {
    const actual = normalizeCapabilities(capabilities[side], `actual ${side}`);
    if (actual.length !== expected[side].length || actual.some((capability, index) => capability !== expected[side][index])) {
      throw new Error(`Project capability ${side} grants mismatch: declared ${expected[side].join(",")}, actual ${actual.join(",")}`);
    }
  }
  return Object.freeze({ server: expected.server.length, client: expected.client.length });
}

export function verifyProjectCapabilityUiInput(manifest, uiState) {
  const expected = validateUiInput(manifest);
  const actual = digestCapabilityJson(uiState ?? null);
  if (actual.present !== expected.present || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(`Project capability UI input mismatch: declared ${formatDigest(expected)}, actual ${formatDigest(actual)}`);
  }
  return actual;
}

export function verifyProjectCapabilityAssetInput(manifest, assets) {
  return verifyJsonInput("asset", validateJsonInput(manifest, "assets"), normalizeCapabilityAssets(assets));
}

export async function verifyProjectCapabilityAssetFiles(assets, readAsset) {
  if (!Array.isArray(assets) || typeof readAsset !== "function") throw new Error("Project capability asset files are missing or invalid");
  const sources = new Set();
  for (const [index, asset] of assets.entries()) {
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) throw new Error(`Project capability asset file entry is invalid at ${index}`);
    const source = asset.packagePath ?? asset.source ?? asset.path;
    const declaredBytes = asset.bytes instanceof Uint8Array ? asset.bytes.byteLength : asset.bytes;
    if (typeof source !== "string" || source.length === 0 || !Number.isInteger(declaredBytes) || declaredBytes < 0 || typeof asset.sha256 !== "string" || !SHA256.test(asset.sha256)) {
      throw new Error(`Project capability asset file evidence is incomplete at ${index}`);
    }
    if (sources.has(source)) throw new Error(`Project capability asset file source is duplicated: ${source}`);
    sources.add(source);
    const bytes = await readAsset(asset, source);
    if (!(bytes instanceof Uint8Array)) throw new Error(`Project capability asset reader returned invalid bytes: ${source}`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== declaredBytes || sha256 !== asset.sha256) throw new Error(`Project capability asset file mismatch: ${source}`);
  }
  return Object.freeze({ assets: assets.length });
}

export function verifyProjectCapabilityEntityInput(manifest, entities) {
  return verifyJsonInput("entity", validateJsonInput(manifest, "entities"), normalizeCapabilityEntities(entities));
}

export function verifyProjectCapabilityStorageScopeInput(manifest, storageScope) {
  return verifyJsonInput("storage scope", validateJsonInput(manifest, "storageScope"), normalizeCapabilityStorageScope(storageScope));
}

export function verifyProjectCapabilityProjectIdentityInput(manifest, projectIdentity) {
  return verifyJsonInput("project identity", validateJsonInput(manifest, "projectIdentity"), normalizeCapabilityProjectIdentity(projectIdentity));
}

export function verifyProjectCapabilityWorldConfigInput(manifest, worldConfig) {
  return verifyJsonInput("world config", validateJsonInput(manifest, "worldConfig"), normalizeCapabilityWorldConfig(worldConfig));
}

export function verifyProjectCapabilityWorldSpawnInput(manifest, worldSpawn) {
  return verifyJsonInput("world spawn", validateJsonInput(manifest, "worldSpawn"), normalizeWorldSpawn(worldSpawn));
}

export function verifyProjectCapabilityPlayerBodyInput(manifest, playerBody) {
  return verifyJsonInput("player body", validateJsonInput(manifest, "playerBody"), normalizeCapabilityPlayerBody(playerBody));
}

export function verifyProjectCapabilityRuntimeAbiInput(manifest, runtimeCompatibility) {
  return verifyJsonInput("Runtime ABI", validateJsonInput(manifest, "runtimeAbi"), normalizeCapabilityRuntimeAbi(runtimeCompatibility));
}

export function deriveProjectCapabilitySummary(manifest) {
  return Object.freeze({
    requirements: manifest.requirements.length,
    ready: manifest.requirements.filter(item => item.state === "ready").length,
    partial: manifest.requirements.filter(item => item.state === "partial").length,
    blocked: manifest.requirements.filter(item => item.state === "blocked").length,
    scriptOwned: manifest.requirements.filter(item => item.state === "script-owned").length,
    modules: manifest.modules.length,
    blockedModules: manifest.modules.filter(item => item.state === "blocked").length,
    resources: manifest.resources.length,
    partialResources: manifest.resources.filter(item => item.state === "partial").length,
    blockedResources: manifest.resources.filter(item => item.state === "blocked").length,
    uiNodes: manifest.ui.length,
    partialUi: manifest.ui.filter(item => item.state === "partial").length,
    blockedUi: manifest.ui.filter(item => item.state === "blocked").length,
    entities: manifest.entities.length,
    partialEntities: manifest.entities.filter(item => item.state === "partial").length,
    blockedEntities: manifest.entities.filter(item => item.state === "blocked").length,
    dependencies: manifest.dependencies.length,
    partialDependencies: manifest.dependencies.filter(item => item.state === "partial").length,
    blockedDependencies: manifest.dependencies.filter(item => item.state === "blocked").length,
    diagnostics: manifest.diagnostics.length,
    partialDiagnostics: manifest.diagnostics.filter(item => item.state === "partial").length,
    blockingDiagnostics: manifest.diagnostics.filter(item => item.state === "blocked").length,
  });
}

export function evaluateProjectCapabilityManifest(manifest, expectations = {}) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || manifest.format !== "nea-project-capability-manifest") {
    throw new Error("Project capability manifest is missing or invalid");
  }
  if (manifest.version !== CAPABILITY_MANIFEST_VERSION) throw new Error(`Project capability manifest version is unsupported: ${String(manifest.version)}`);
  if (typeof manifest.apiVersion !== "string" || manifest.apiVersion.length === 0) throw new Error("Project capability manifest apiVersion is missing or invalid");
  if (!manifest.contracts || typeof manifest.contracts !== "object" || Array.isArray(manifest.contracts) || typeof manifest.contracts.client !== "string" || typeof manifest.contracts.server !== "string") {
    throw new Error("Project capability manifest contracts are missing or invalid");
  }
  validateModuleInputs(manifest);
  validateCapabilityInputs(manifest);
  validateUiInput(manifest);
  validateJsonInput(manifest, "assets");
  validateJsonInput(manifest, "entities");
  validateJsonInput(manifest, "projectIdentity");
  validateJsonInput(manifest, "worldConfig");
  validateJsonInput(manifest, "runtimeAbi");
  if (Object.hasOwn(expectations, "apiVersion") && (typeof expectations.apiVersion !== "string" || expectations.apiVersion.length === 0)) {
    throw new Error("Expected project runtime apiVersion is missing or invalid");
  }
  if (Object.hasOwn(expectations, "apiVersion") && manifest.apiVersion !== expectations.apiVersion) {
    throw new Error(`Project capability manifest apiVersion mismatch: declared ${manifest.apiVersion}, expected ${expectations.apiVersion}`);
  }
  for (const side of ["client", "server"]) {
    const hasExpected = expectations.contracts !== undefined && Object.hasOwn(expectations.contracts, side);
    const expected = expectations.contracts?.[side];
    if (hasExpected && (typeof expected !== "string" || expected.length === 0)) throw new Error(`Expected project runtime ${side} contract is missing or invalid`);
    if (hasExpected && manifest.contracts[side] !== expected) {
      throw new Error(`Project capability manifest ${side} contract mismatch: declared ${manifest.contracts[side]}, expected ${expected}`);
    }
  }
  if (!MANIFEST_STATUSES.has(manifest.status)) throw new Error(`Project capability manifest status is invalid: ${String(manifest.status)}`);
  const blocked = [];
  const partial = [];
  for (const collection of COLLECTIONS) {
    const items = manifest[collection.name];
    if (!Array.isArray(items)) throw new Error(`Project capability manifest ${collection.name} collection is missing or invalid`);
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Project capability manifest ${collection.name} entry is invalid`);
      const validState = ENTRY_STATES.has(item.state) || collection.name === "requirements" && item.state === "script-owned";
      if (!validState) throw new Error(`Project capability manifest ${collection.name} entry state is invalid: ${String(item.state)}`);
      if (item.state === "blocked") blocked.push(collection.label(item));
      else if (item.state === "partial") partial.push(collection.label(item));
    }
  }
  if (!manifest.summary || typeof manifest.summary !== "object" || Array.isArray(manifest.summary)) throw new Error("Project capability manifest summary is missing or invalid");
  const summary = deriveProjectCapabilitySummary(manifest);
  for (const [field, expected] of Object.entries(summary)) {
    if (manifest.summary[field] !== expected) throw new Error(`Project capability manifest summary mismatch for ${field}: declared ${String(manifest.summary[field])}, derived ${expected}`);
  }
  const status = blocked.length > 0 ? "blocked" : partial.length > 0 ? "partial" : "ready";
  return Object.freeze({ status, summary, blocked: Object.freeze(blocked), partial: Object.freeze(partial) });
}

function validateModuleInputs(manifest) {
  if (!manifest.inputs || typeof manifest.inputs !== "object" || Array.isArray(manifest.inputs) || !Array.isArray(manifest.inputs.modules)) {
    throw new Error("Project capability manifest module inputs are missing or invalid");
  }
  const result = new Map();
  for (const module of manifest.inputs.modules) {
    if (!module || typeof module !== "object" || (module.side !== "server" && module.side !== "client") || typeof module.name !== "string" || module.name.length === 0 || !Number.isInteger(module.bytes) || module.bytes < 0 || typeof module.sha256 !== "string" || !SHA256.test(module.sha256)) {
      throw new Error("Project capability manifest module input entry is invalid");
    }
    const key = `${module.side}:${module.name}`;
    if (result.has(key)) throw new Error(`Project capability manifest module input is duplicated: ${key}`);
    result.set(key, module);
  }
  return result;
}

function validateCapabilityInputs(manifest) {
  if (!manifest.inputs || !manifest.inputs.capabilities || typeof manifest.inputs.capabilities !== "object" || Array.isArray(manifest.inputs.capabilities)) {
    throw new Error("Project capability manifest grants are missing or invalid");
  }
  return Object.freeze({
    server: Object.freeze(normalizeCapabilities(manifest.inputs.capabilities.server, "manifest server")),
    client: Object.freeze(normalizeCapabilities(manifest.inputs.capabilities.client, "manifest client")),
  });
}

function normalizeCapabilities(value, label) {
  if (!Array.isArray(value)) throw new Error(`Project capability ${label} grants are missing or invalid`);
  const result = [];
  const seen = new Set();
  for (const capability of value) {
    if (typeof capability !== "string" || !/^[a-z][a-z0-9-]{0,63}(?:\.[a-z][a-z0-9-]{0,63})*$/.test(capability)) throw new Error(`Project capability ${label} grant is invalid`);
    if (seen.has(capability)) throw new Error(`Project capability ${label} grant is duplicated: ${capability}`);
    seen.add(capability);
    result.push(capability);
  }
  return result.sort();
}

function validateUiInput(manifest) {
  const input = manifest.inputs?.ui;
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.present !== "boolean" || !Number.isInteger(input.bytes) || input.bytes < 0) {
    throw new Error("Project capability manifest UI input is missing or invalid");
  }
  if (input.present) {
    if (input.bytes < 1 || typeof input.sha256 !== "string" || !SHA256.test(input.sha256)) throw new Error("Project capability manifest UI digest is invalid");
  } else if (input.bytes !== 0 || input.sha256 !== null) {
    throw new Error("Project capability manifest empty UI digest is invalid");
  }
  return Object.freeze({ present: input.present, bytes: input.bytes, sha256: input.sha256 });
}

function formatDigest(value) {
  return value.present ? `${value.bytes}:${value.sha256}` : "absent";
}

function validateJsonInput(manifest, name) {
  const input = manifest.inputs?.[name];
  if (!input || typeof input !== "object" || Array.isArray(input) || input.present !== true || !Number.isInteger(input.bytes) || input.bytes < 2 || typeof input.sha256 !== "string" || !SHA256.test(input.sha256)) {
    throw new Error(`Project capability manifest ${name} input is missing or invalid`);
  }
  return Object.freeze({ present: true, bytes: input.bytes, sha256: input.sha256 });
}

function verifyJsonInput(name, expected, value) {
  const actual = digestCapabilityJson(value);
  if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error(`Project capability ${name} input mismatch: declared ${formatDigest(expected)}, actual ${formatDigest(actual)}`);
  return actual;
}

export function assertProjectCapabilities(manifest, expectations = {}, warn = message => console.warn(message)) {
  if (typeof expectations === "function") {
    warn = expectations;
    expectations = {};
  }
  const evaluation = evaluateProjectCapabilityManifest(manifest, expectations);
  if (manifest.status !== evaluation.status) {
    throw new Error(`Project capability manifest status mismatch: declared ${String(manifest.status)}, derived ${evaluation.status}`);
  }
  if (evaluation.status === "blocked") {
    throw new Error(`Project launch blocked by unavailable capabilities: ${evaluation.blocked.join(", ")}`);
  }
  if (evaluation.status === "partial") {
    warn(`[demo] project uses partial compatibility surfaces: ${evaluation.partial.join(", ")}`);
  }
  return evaluation;
}
