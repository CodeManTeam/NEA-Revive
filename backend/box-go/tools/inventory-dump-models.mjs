#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "../../.build/backroom-dump-20260819/GET-assets.box3.fun/engine/m");
const entries = [];
const byName = new Map();
for (const name of await readdir(root)) {
  const path = join(root, name);
  const info = await stat(path);
  if (!info.isFile()) continue;
  const bytes = await readFile(path);
  const kind = name.endsWith(".png") ? "png" : bytes[0] === 0x7b ? "json" : "binary";
  entries.push({ name, bytes: bytes.length, kind });
  byName.set(name, { name, bytes: bytes.length, kind });
}
entries.sort((a, b) => a.name.localeCompare(b.name));
const counts = Object.groupBy(entries, entry => entry.kind);
const catalogPath = process.argv[3] && resolve(process.argv[3]);
let models;
if (catalogPath) {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  models = catalog.models.map(model => {
    const metadata = byName.get(model.modelFileHash);
    const project = byName.get(model.projectFileHash);
    return {
      modelId: model.modelId,
      name: model.name,
      modelFileHash: model.modelFileHash,
      projectFileHash: model.projectFileHash,
      dumpModelFile: metadata?.name ?? null,
      dumpProjectFile: project?.name ?? null,
      // Engine v7 metadata is keyed by a request hash and points to dataHash.
      // A second pass below resolves every metadata request to its binary payload.
      metadata: null,
    };
  });
  for (const row of models) {
    const meta = byName.get(row.modelFileHash);
    if (meta?.kind === "json") {
      row.metadata = JSON.parse(await readFile(join(root, meta.name), "utf8"));
    }
  }
}
const metadata = [];
for (const entry of entries.filter(e => e.kind === "json")) {
  try {
    const value = JSON.parse(await readFile(join(root, entry.name), "utf8"));
    metadata.push({ requestKey: entry.name, ...value, binaryPresent: byName.has(value.dataHash) });
  } catch {}
}
console.log(JSON.stringify({ root, total: entries.length, counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.length])), entries, metadata, models }, null, 2));
