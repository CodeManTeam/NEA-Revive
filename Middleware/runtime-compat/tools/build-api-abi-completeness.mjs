import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = await readJson("generated/docs-api-index.json");
const matrix = await readJson("abi/compatibility-matrix.json");
const protocols = await readJson("abi/protocols.json");
const catalogs = {
  client: await readJson("abi/client-runtime.json"),
  server: await readJson("abi/server-runtime.json"),
  shared: await readJson("abi/shared-runtime.json"),
};

const gaps = [];
const availabilityValues = new Set(["confirmed", "partial", "declared", "unknown", "unsupported"]);
const compatibilityValues = new Set(["native", "compatible", "bridged", "emulated", "partial", "missing"]);
const documentationSides = new Set(["client", "server", "shared"]);

check(docs.version >= 2, "documentation", "catalog", "version", "member variants require documentation ABI version 2 or later");
check(docs.signatureModel === "member-variants-v1", "documentation", "catalog", "signatureModel", "must identify the member-variants-v1 signature model");
checkUnique(docs.entries, "documentation", "id");

for (const entry of docs.entries) validateDocumentationEntry(entry);
validateCatalogAndMatrixCoverage();
validateProtocols();

const memberVariants = docs.entries.flatMap(entry => entry.memberVariants ?? []);
const messagesByDirection = countBy(protocols.messages ?? [], message => message.direction);
const report = {
  format: "nea-api-abi-completeness",
  version: 1,
  generatedAt: new Date().toISOString(),
  status: gaps.length === 0 ? "complete" : "partial",
  signatureModel: docs.signatureModel,
  rules: {
    documentation: {
      global: ["type"],
      property: ["type", "readonly"],
      method: ["parameters", "returns"],
      event: ["parameters+returns", "or type for property-style events"],
      object: ["declaration"],
      common: ["id", "side", "owner", "name", "availability", "compatibility", "evidence", "memberVariants"],
    },
    protocolMessage: ["id", "protocolId", "direction", "sender", "receiver", "schema", "availability", "compatibility", "evidence"],
    propagation: ["documentation ids exactly cover the compatibility matrix", "every documentation id is retained by its side catalog"],
  },
  summary: {
    documentation: {
      entries: docs.entries.length,
      memberVariants: memberVariants.length,
      byKind: countBy(memberVariants, variant => variant.kind),
    },
    catalogs: Object.fromEntries(Object.entries(catalogs).map(([side, catalog]) => [side, catalog.entries.length])),
    compatibilityMatrix: {
      entries: matrix.entries.length,
      coveredDocumentationEntries: docs.entries.filter(entry => matrix.entries.some(matrixEntry => matrixEntry.id === entry.id)).length,
    },
    protocols: {
      catalogs: protocols.protocols.length,
      messages: (protocols.messages ?? []).length,
      byDirection: messagesByDirection,
    },
    gaps: gaps.length,
  },
  gaps,
};

await mkdir(resolve(root, "generated"), { recursive: true });
await writeFile(resolve(root, "generated", "api-abi-completeness.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`API/ABI completeness: ${report.status}; ${docs.entries.length} declarations, ${memberVariants.length} member variants, ${(protocols.messages ?? []).length} protocol messages, ${gaps.length} gaps.`);

function validateDocumentationEntry(entry) {
  const entryId = entry.id ?? "<missing-id>";
  check(hasText(entry.id), "documentation", entryId, "id", "must be a non-empty canonical id");
  check(documentationSides.has(entry.side), "documentation", entryId, "side", "must be client, server, or shared");
  check(hasText(entry.owner), "documentation", entryId, "owner", "must identify the owning object or namespace");
  check(hasText(entry.name), "documentation", entryId, "name", "must identify the declared member or object");
  check(availabilityValues.has(entry.availability), "documentation", entryId, "availability", "must use a recognized availability value");
  check(compatibilityValues.has(entry.compatibility), "documentation", entryId, "compatibility", "must use a recognized compatibility value");
  validateEvidence(entry.evidence, "documentation", entryId, "evidence");

  check(Array.isArray(entry.memberVariants) && entry.memberVariants.length > 0, "documentation", entryId, "memberVariants", "must retain at least one kind-qualified signature");
  const variants = entry.memberVariants ?? [];
  const variantKinds = [...new Set(variants.map(variant => variant.kind))];
  check(Array.isArray(entry.kinds) && sameJson(entry.kinds, variantKinds), "documentation", entryId, "kinds", "must exactly match memberVariants kinds in declaration order");
  check(entry.kindCollision === variantKinds.length > 1, "documentation", entryId, "kindCollision", "must reflect whether the canonical name has multiple kinds");
  check(entry.kind === variants[0]?.kind, "documentation", entryId, "kind", "must preserve the first canonical member variant as the legacy kind");

  const variantKeys = new Set();
  variants.forEach((variant, index) => {
    const variantId = `${entryId}#${index}:${variant.kind ?? "missing-kind"}`;
    check(hasText(variant.kind), "documentation-variant", variantId, "kind", "must identify the member kind");
    check(isPlainObject(variant.signature), "documentation-variant", variantId, "signature", "must be a structured signature object");
    validateEvidence(variant.evidence, "documentation-variant", variantId, "evidence");
    validateSignature(variant.kind, variant.signature ?? {}, variantId);
    const key = JSON.stringify([variant.kind, variant.signature]);
    check(!variantKeys.has(key), "documentation-variant", variantId, "signature", "must not duplicate another kind-qualified signature");
    variantKeys.add(key);
  });

  if (variants.length === 1) {
    check(sameJson(entry.signature, variants[0].signature), "documentation", entryId, "signature", "must equal the sole member variant signature");
  } else {
    check(Array.isArray(entry.signature?.variants) && entry.signature.variants.length === variants.length, "documentation", entryId, "signature.variants", "must retain every colliding signature");
  }
}

function validateSignature(kind, signature, id) {
  if (kind === "global") {
    validateKnownText(signature.type, "documentation-variant", id, "signature.type");
    return;
  }
  if (kind === "property") {
    validateKnownText(signature.type, "documentation-variant", id, "signature.type");
    check(typeof signature.readonly === "boolean", "documentation-variant", id, "signature.readonly", "must record property mutability");
    return;
  }
  if (kind === "method") {
    validateCallableSignature(signature, id);
    return;
  }
  if (kind === "event") {
    const callable = Array.isArray(signature.parameters) || Object.hasOwn(signature, "returns");
    const propertyStyle = Object.hasOwn(signature, "type");
    check(callable !== propertyStyle, "documentation-variant", id, "signature", "must use exactly one event signature shape");
    if (callable) validateCallableSignature(signature, id);
    if (propertyStyle) validateKnownText(signature.type, "documentation-variant", id, "signature.type");
    return;
  }
  if (kind === "object") {
    validateKnownText(signature.declaration, "documentation-variant", id, "signature.declaration");
    return;
  }
  check(false, "documentation-variant", id, "kind", `unsupported documentation kind: ${kind}`);
}

function validateCallableSignature(signature, id) {
  check(Array.isArray(signature.parameters), "documentation-variant", id, "signature.parameters", "must be an ordered parameter array");
  validateKnownText(signature.returns, "documentation-variant", id, "signature.returns");
  (signature.parameters ?? []).forEach((parameter, index) => {
    const parameterId = `${id}.parameters[${index}]`;
    check(hasText(parameter.name) && !/^arg\d+$/.test(parameter.name), "documentation-parameter", parameterId, "name", "must preserve the documented parameter name instead of a parser fallback");
    check(typeof parameter.optional === "boolean", "documentation-parameter", parameterId, "optional", "must record parameter optionality");
    validateKnownText(parameter.type, "documentation-parameter", parameterId, "type");
    if (Object.hasOwn(parameter, "rest")) check(typeof parameter.rest === "boolean", "documentation-parameter", parameterId, "rest", "must be boolean when present");
  });
}

function validateCatalogAndMatrixCoverage() {
  checkUnique(matrix.entries, "compatibility-matrix", "id");
  const docsById = new Map(docs.entries.map(entry => [entry.id, entry]));
  const matrixById = new Map(matrix.entries.map(entry => [entry.id, entry]));
  for (const entry of docs.entries) {
    const matrixEntry = matrixById.get(entry.id);
    check(Boolean(matrixEntry), "compatibility-matrix", entry.id, "id", "must cover every documentation declaration");
    if (matrixEntry) {
      check(sameJson(matrixEntry.memberVariants, entry.memberVariants), "compatibility-matrix", entry.id, "memberVariants", "must retain every documentation kind-qualified signature");
      check(hasText(matrixEntry.status), "compatibility-matrix", entry.id, "status", "must record compatibility classification");
      check(availabilityValues.has(matrixEntry.recovery?.availability), "compatibility-matrix", entry.id, "recovery.availability", "must record recovered availability");
      check(compatibilityValues.has(matrixEntry.recovery?.compatibility), "compatibility-matrix", entry.id, "recovery.compatibility", "must record recovered compatibility");
      validateEvidence(matrixEntry.evidence, "compatibility-matrix", entry.id, "evidence");
    }

    const catalog = catalogs[entry.side];
    const catalogEntry = catalog?.entries.find(candidate => candidate.id === entry.id);
    check(Boolean(catalogEntry), "runtime-catalog", entry.id, "id", `must appear in the ${entry.side} runtime catalog`);
    if (catalogEntry) {
      check(sameJson(catalogEntry.memberVariants, entry.memberVariants), "runtime-catalog", entry.id, "memberVariants", "must retain every documentation kind-qualified signature");
      check(availabilityValues.has(catalogEntry.availability), "runtime-catalog", entry.id, "availability", "must record availability");
      check(compatibilityValues.has(catalogEntry.compatibility), "runtime-catalog", entry.id, "compatibility", "must record compatibility");
      validateEvidence(catalogEntry.evidence, "runtime-catalog", entry.id, "evidence");
    }
  }
  for (const entry of matrix.entries) check(docsById.has(entry.id), "compatibility-matrix", entry.id, "id", "must not invent a non-documentation canonical declaration");
}

function validateProtocols() {
  checkUnique(protocols.protocols, "protocol", "id");
  check(Array.isArray(protocols.messages), "protocol", "catalog", "messages", "must expose explicit direction-qualified message records");
  checkUnique(protocols.messages ?? [], "protocol-message", "id");
  const messagesById = new Map((protocols.messages ?? []).map(message => [message.id, message]));
  const expectedIds = new Set();

  for (const protocol of protocols.protocols) {
    check(hasText(protocol.id), "protocol", protocol.id ?? "<missing-id>", "id", "must identify the protocol catalog");
    check(hasText(protocol.layer), "protocol", protocol.id, "layer", "must identify the runtime layer");
    check(hasText(protocol.transport), "protocol", protocol.id, "transport", "must identify the transport");
    check(availabilityValues.has(protocol.availability), "protocol", protocol.id, "availability", "must record availability");
    check(compatibilityValues.has(protocol.compatibility), "protocol", protocol.id, "compatibility", "must record compatibility");
    validateEvidence(protocol.evidence, "protocol", protocol.id, "evidence");
    check(isPlainObject(protocol.clientReceives), "protocol", protocol.id, "clientReceives", "must be a message schema map");
    check(isPlainObject(protocol.serverReceives), "protocol", protocol.id, "serverReceives", "must be a message schema map");
    collectExpectedMessages(protocol, "clientReceives", "server-to-client", "server", "client", expectedIds, messagesById);
    collectExpectedMessages(protocol, "serverReceives", "client-to-server", "client", "server", expectedIds, messagesById);
  }

  for (const message of protocols.messages ?? []) {
    check(expectedIds.has(message.id), "protocol-message", message.id, "id", "must map back to a protocol receive schema");
  }
}

function collectExpectedMessages(protocol, collection, direction, sender, receiver, expectedIds, messagesById) {
  for (const [name, schema] of Object.entries(protocol[collection] ?? {})) {
    const id = `${protocol.id}.${direction}.${name}`;
    expectedIds.add(id);
    const message = messagesById.get(id);
    check(Boolean(message), "protocol-message", id, "id", "must explicitly represent every protocol receive schema");
    if (!message) continue;
    check(message.protocolId === protocol.id, "protocol-message", id, "protocolId", "must reference its containing protocol");
    check(message.direction === direction, "protocol-message", id, "direction", "must preserve wire direction");
    check(message.sender === sender, "protocol-message", id, "sender", "must identify the sending endpoint");
    check(message.receiver === receiver, "protocol-message", id, "receiver", "must identify the receiving endpoint");
    check(message.name === name, "protocol-message", id, "name", "must preserve the recovered message name");
    check(isPlainObject(message.schema) && sameJson(message.schema, schema), "protocol-message", id, "schema", "must preserve the complete recovered message schema");
    check(availabilityValues.has(message.availability), "protocol-message", id, "availability", "must record availability");
    check(compatibilityValues.has(message.compatibility), "protocol-message", id, "compatibility", "must record compatibility");
    validateEvidence(message.evidence, "protocol-message", id, "evidence");
  }
}

function validateEvidence(values, domain, id, field) {
  check(Array.isArray(values) && values.length > 0, domain, id, field, "must retain at least one evidence record");
  (values ?? []).forEach((evidence, index) => {
    check(hasText(evidence.type), domain, id, `${field}[${index}].type`, "must identify the evidence type");
    check(hasText(evidence.path), domain, id, `${field}[${index}].path`, "must identify the local evidence path");
    check(hasText(evidence.confidence), domain, id, `${field}[${index}].confidence`, "must record evidence confidence");
  });
}

function validateKnownText(value, domain, id, field) {
  check(hasText(value) && value !== "unknown", domain, id, field, "must contain a known non-empty ABI value");
}

function checkUnique(values, domain, field) {
  const seen = new Set();
  for (const value of values ?? []) {
    const key = value?.[field];
    check(hasText(key) && !seen.has(key), domain, key ?? "<missing-id>", field, "must be present and unique");
    if (hasText(key)) seen.add(key);
  }
}

function check(condition, domain, id, field, rule) {
  if (!condition) gaps.push({ domain, id, field, rule });
}

function countBy(values, selector) {
  const output = {};
  for (const value of values) {
    const key = selector(value);
    output[key] = (output[key] ?? 0) + 1;
  }
  return output;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
