import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const docs = await readJson("generated/docs-api-index.json");
const current = await readJson("abi/current-runtime.json");
const catalogs = {
  client: await readJson("abi/client-runtime.json"),
  server: await readJson("abi/server-runtime.json"),
  shared: await readJson("abi/shared-runtime.json"),
};
const protocols = await readJson("abi/protocols.json");
const serverAdapters = await readJson("abi/server-adapter-map.json");
const entityAdapters = await readJson("abi/runtime-entity-adapter-map.json");
const playerAdapters = await readJson("abi/runtime-player-adapter-map.json");
const project = JSON.parse(await readFile(resolve(repositoryRoot, "Frontend/demo-map/project/nea.map.json"), "utf8"));

const currentById = new Map(current.entries.map(entry => [entry.id, entry]));
const catalogBySide = Object.fromEntries(Object.entries(catalogs).map(([side, catalog]) => [side, new Map(catalog.entries.map(entry => [entry.id, entry]))]));
const bindings = collectBindings();
const entries = docs.entries.map(declaration => matrixEntry(declaration));
const statusOrder = ["native", "compatible", "partial", "recovered-only", "unavailable", "declared-only"];
const summary = {
  entries: entries.length,
  byStatus: countBy(entries, entry => entry.status, statusOrder),
  bySide: Object.fromEntries(["client", "server", "shared"].map(side => {
    const values = entries.filter(entry => entry.side === side);
    return [side, { total: values.length, ...countBy(values, entry => entry.status, statusOrder) }];
  })),
  executable: entries.filter(entry => entry.executable).length,
  nonExecutable: entries.filter(entry => !entry.executable).length,
};
if (entries.length !== docs.entries.length) throw new Error("Compatibility matrix does not cover every documented declaration");
if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error("Compatibility matrix contains duplicate canonical ids");

const matrix = {
  format: "nea-runtime-compatibility-matrix",
  version: 1,
  generatedAt: new Date().toISOString(),
  apiVersion: project.runtime.apiVersion,
  compatibilityLevel: project.runtime.compatibilityLevel,
  contracts: [
    contract("dao3-documentation/archive", "canonical", "All 599 declarations extracted from the local developer documentation mirror."),
    contract(project.runtime.clientContract, "client", "Archived Player SES Client Script Runtime."),
    contract(project.runtime.serverContract, "server", "Local capability-gated Server Script Runtime."),
    contract("shared-value-runtime/v1", "shared", "Local shared value-object compatibility runtime."),
    contract("mudb-transport/v1", "transport", "Recovered MuDB protocol names, directions and schemas."),
    contract("nea-authoritative-runtime/v1", "state", "Authoritative ticks, players, bodies and accepted state transitions."),
  ],
  statusDefinitions: {
    native: "Executable in the historical runtime provider with direct evidence.",
    compatible: "Executable locally with conformance evidence sufficient for the documented contract.",
    partial: "Executable locally, but one or more access, signature or behavioral gaps remain.",
    "recovered-only": "The historical declaration or implementation is recovered, but no local executable binding exists.",
    unavailable: "Direct runtime evidence proves that the selected historical provider does not expose this declaration to scripts.",
    "declared-only": "Only the documentation declaration is currently recovered.",
  },
  summary,
  entries,
  protocols: protocols.protocols.map(protocol => ({
    id: protocol.id,
    layer: protocol.layer,
    transport: protocol.transport,
    availability: protocol.availability,
    compatibility: protocol.compatibility,
    clientReceives: Object.keys(protocol.clientReceives ?? {}).sort(),
    serverReceives: Object.keys(protocol.serverReceives ?? {}).sort(),
    evidence: protocol.evidence,
  })),
};

await writeFile(resolve(root, "abi", "compatibility-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`);
console.log(`Built compatibility matrix for ${summary.entries} declarations: ${statusOrder.map(status => `${status}=${summary.byStatus[status]}`).join(", ")}.`);

function matrixEntry(declaration) {
  const candidates = [];
  const adapterBindings = bindings.get(declaration.id) ?? [];
  const adapterLocalIds = new Set(adapterBindings.map(binding => binding.localId));
  const direct = currentById.get(declaration.id);
  if (direct) candidates.push(bindingFromEntry(direct, directStatus(direct), "exact"));
  for (const entry of current.entries) {
    if ((entry.implements ?? []).includes(declaration.id) && !adapterLocalIds.has(entry.id)) candidates.push(bindingFromEntry(entry, directStatus(entry), "implements"));
  }
  candidates.push(...adapterBindings);
  candidates.sort((left, right) => statusRank(right.status) - statusRank(left.status));
  const best = candidates[0];
  const recovered = catalogBySide[declaration.side]?.get(declaration.id);
  const recoveredEvidence = (recovered?.evidence ?? []).filter(item => item.type !== "docs");
  const status = best?.status ?? (recovered?.availability === "unsupported" ? "unavailable" : recoveredEvidence.length > 0 ? "recovered-only" : "declared-only");
  const localBindings = candidates.map(candidate => ({
    localId: candidate.localId,
    relation: candidate.relation,
    status: candidate.status,
    capability: candidate.capability,
    gaps: candidate.gaps,
  }));
  return {
    id: declaration.id,
    side: declaration.side,
    contract: contractForSide(declaration.side),
    owner: declaration.owner,
    kind: declaration.kind,
    kinds: declaration.kinds,
    kindCollision: declaration.kindCollision,
    memberVariants: declaration.memberVariants,
    name: declaration.name,
    signature: declaration.signature,
    status,
    executable: ["native", "compatible", "partial"].includes(status),
    capability: best?.capability ?? null,
    unavailableReason: status === "unavailable" ? recovered?.unavailableReason ?? null : null,
    localBindings,
    recovery: {
      availability: recovered?.availability ?? declaration.availability,
      compatibility: recovered?.compatibility ?? declaration.compatibility,
      evidenceTypes: [...new Set((recovered?.evidence ?? declaration.evidence ?? []).map(item => item.type))].sort(),
    },
    evidence: dedupeEvidence([...(declaration.evidence ?? []), ...(recovered?.evidence ?? []), ...candidates.flatMap(candidate => candidate.evidence ?? [])]),
  };
}

function collectBindings() {
  const result = new Map();
  for (const adapter of serverAdapters.adapters) add(adapter.canonicalId, {
    localId: adapter.localId,
    relation: "adapter",
    status: adapter.status,
    capability: currentById.get(adapter.localId)?.capability ?? null,
    gaps: normalizeGaps(adapter.gaps),
    evidence: currentById.get(adapter.localId)?.evidence ?? [],
  });
  for (const model of [entityAdapters, playerAdapters]) {
    for (const member of model.members) {
      for (const target of member.canonicalTargets ?? []) add(target.id, {
        localId: member.local.id,
        relation: "object-adapter",
        status: member.status,
        capability: member.local.capability ?? null,
        gaps: normalizeGaps(member.gaps),
        evidence: member.evidence ?? [],
      });
    }
  }
  return result;

  function add(id, value) {
    const values = result.get(id) ?? [];
    values.push(value);
    result.set(id, values);
  }
}

function bindingFromEntry(entry, status, relation) {
  return { localId: entry.id, relation, status, capability: entry.capability ?? null, gaps: [], evidence: entry.evidence ?? [] };
}

function directStatus(entry) {
  if (entry.availability === "partial" || entry.compatibility === "partial") return "partial";
  if (entry.compatibility === "native") return "native";
  return "compatible";
}

function statusRank(status) {
  return { unavailable: 0, "declared-only": 0, "recovered-only": 1, partial: 2, compatible: 3, native: 4 }[status] ?? -1;
}

function contractForSide(side) {
  if (side === "client") return project.runtime.clientContract;
  if (side === "server") return project.runtime.serverContract;
  if (side === "shared") return "shared-value-runtime/v1";
  throw new Error(`Unknown documented side: ${side}`);
}

function contract(id, side, description) {
  return { id, side, apiVersion: project.runtime.apiVersion, description };
}

function normalizeGaps(gaps) {
  if (Array.isArray(gaps)) return gaps;
  if (!gaps || typeof gaps !== "object") return [];
  return Object.entries(gaps).flatMap(([category, values]) => (values ?? []).map(value => `${category}: ${value}`));
}

function countBy(values, selector, expected = []) {
  const counts = Object.fromEntries(expected.map(value => [value, 0]));
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function dedupeEvidence(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = `${value.type}\u0000${value.path}\u0000${value.symbol ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
