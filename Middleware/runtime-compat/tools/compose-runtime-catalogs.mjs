import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));
const origin = JSON.parse(await readFile(resolve(root, "generated", "origin-server-api.json"), "utf8"));
const playerClient = JSON.parse(await readFile(resolve(root, "generated", "player-client-script-runtime-analysis.json"), "utf8"));
const localServer = JSON.parse(await readFile(resolve(root, "generated", "local-server-runtime-analysis.json"), "utf8"));
const localShared = JSON.parse(await readFile(resolve(root, "generated", "local-shared-runtime-analysis.json"), "utf8"));
const current = JSON.parse(await readFile(resolve(root, "abi", "current-runtime.json"), "utf8"));

await writeCatalog("client", docs.entries.filter(entry => entry.side === "client"), playerClient.entries, current.entries.filter(entry => entry.side === "client"), playerClient.unavailable ?? []);
await writeCatalog("server", docs.entries.filter(entry => entry.side === "server"), [...origin.entries, ...localServer.entries], current.entries.filter(entry => entry.side === "server"), [], true, localServer.adapters);
await writeCatalog("shared", docs.entries.filter(entry => entry.side === "shared"), localShared.entries, current.entries.filter(entry => entry.side === "shared"));

async function writeCatalog(side, declared, recovered, implemented, unavailable = [], propagateImplements = false, adapters = []) {
  const merged = new Map();
  for (const entry of [...declared, ...recovered, ...implemented]) {
    const previous = merged.get(entry.id);
    if (!previous) {
      merged.set(entry.id, structuredClone(entry));
      continue;
    }
    merged.set(entry.id, {
      ...previous,
      ...entry,
      availability: strongestAvailability(previous.availability, entry.availability),
      compatibility: strongestCompatibility(previous.compatibility, entry.compatibility),
      notes: [...new Set([...(previous.notes ?? []), ...(entry.notes ?? [])])],
      evidence: deduplicateEvidence([...(previous.evidence ?? []), ...(entry.evidence ?? [])]),
    });
  }
  if (propagateImplements) {
    propagateImplementedCompatibility(merged, recovered, side);
  }
  propagateAdapterCompatibility(merged, recovered, adapters, side);
  for (const item of unavailable) {
    const previous = merged.get(item.id);
    if (!previous) throw new Error(`Unavailable ${side} ABI entry is not declared: ${item.id}`);
    merged.set(item.id, {
      ...previous,
      availability: "unsupported",
      compatibility: "missing",
      unavailableReason: item.reason,
      notes: [...new Set([...(previous.notes ?? []), item.reason])],
      evidence: deduplicateEvidence([...(previous.evidence ?? []), ...(item.evidence ?? [])]),
    });
  }
  const entries = [...merged.values()].sort((left, right) => left.id.localeCompare(right.id));
  await writeFile(resolve(root, "abi", `${side}-runtime.json`), `${JSON.stringify({
    format: "nea-runtime-abi",
    version: 1,
    generatedAt: new Date().toISOString(),
    side,
    entries,
  }, null, 2)}\n`);
  console.log(`Composed ${side} runtime catalog with ${entries.length} entries.`);
}

function propagateImplementedCompatibility(merged, entries, side) {
  for (const entry of entries) {
    for (const canonicalId of entry.implements ?? []) {
      const canonical = merged.get(canonicalId);
      if (!canonical) {
        continue;
      }
      merged.set(canonicalId, {
        ...canonical,
        availability: strongestAvailability(canonical.availability, entry.availability),
        compatibility: strongestCompatibility(canonical.compatibility, entry.compatibility),
        notes: [...new Set([...(canonical.notes ?? []), ...(entry.notes ?? [])])],
        evidence: deduplicateEvidence([...(canonical.evidence ?? []), ...(entry.evidence ?? [])]),
      });
    }
  }
}

function propagateAdapterCompatibility(merged, entries, adapters, side) {
  const evidenceByLocalId = new Map(entries.map(entry => [entry.id, entry.evidence ?? []]));
  for (const adapter of adapters) {
    const canonical = merged.get(adapter.canonicalId);
    if (!canonical) continue;
    const localEvidence = evidenceByLocalId.get(adapter.localId) ?? [];
    merged.set(adapter.canonicalId, {
      ...canonical,
      compatibility: strongestCompatibility(canonical.compatibility, adapter.status),
      evidence: deduplicateEvidence([...(canonical.evidence ?? []), ...localEvidence]),
    });
  }
}

function strongestAvailability(left, right) {
  const rank = { unsupported: 0, unknown: 1, declared: 2, partial: 3, confirmed: 4 };
  return rank[right] > rank[left] ? right : left;
}

function strongestCompatibility(left, right) {
  const rank = { missing: 0, partial: 1, emulated: 2, bridged: 3, compatible: 4, native: 5 };
  return rank[right] > rank[left] ? right : left;
}

function deduplicateEvidence(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = `${value.type}\u0000${value.path}\u0000${value.symbol ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
