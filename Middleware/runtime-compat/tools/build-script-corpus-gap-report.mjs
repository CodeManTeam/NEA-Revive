import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const aliases = {
  "client:ui.findChildByName": "client.UiNode.findChildByName",
  "client:screen.findChildByName": "client.UiNode.findChildByName",
  "client:screen.name": "client.UiNode.name",
  "client:screen.visible": "client.UiScreen.visible",
  "client:screen.events": "client.ClientScreen.events",
  "client:remoteChannel.events": "client.remoteChannel.events",
  "client:input.pointerLockEvents": "client.input.pointerLockEvents",
  "server:voxels.getVoxelId": "server.GameVoxels.getVoxelId",
  "server:voxels.setVoxelId": "server.GameVoxels.setVoxelId",
  "server:voxels.id": "server.GameVoxels.id",
  "server:voxels.setVoxel": "server.GameVoxels.setVoxel",
  "server:voxels.getVoxel": "server.GameVoxels.getVoxel",
  "server:voxels.name": "server.GameVoxels.name",
  "server:voxels.getVoxelRotation": "server.GameVoxels.getVoxelRotation",
};
const canonicalOwners = { server: { world: "GameWorld", voxels: "GameVoxels", gui: "GameGUI", storage: "GameStorage" } };
const evidence = await readJson("evidence/script-corpus-usage.json");
const abi = await readJson("abi/current-runtime.json");
const serverCatalog = await readJson("abi/server-runtime.json");
const entries = new Map(abi.entries.map(entry => [entry.id, entry]));
const declarations = new Map(serverCatalog.entries.map(entry => [entry.id, entry]));
const aggregated = new Map();
const assignments = new Map();
const evidenceBoundary = readEvidenceBoundary(evidence);

for (const sample of evidence.samples) {
  for (const side of ["client", "server"]) {
    for (const usage of sample.sides[side].api) {
      const key = `${side}:${usage.name}`;
      const item = aggregated.get(key) ?? { side, name: usage.name, count: 0, sampleCount: 0 };
      item.count += usage.count;
      item.sampleCount += 1;
      aggregated.set(key, item);
    }
    for (const assignment of sample.sides[side].memberAssignments ?? []) {
      const key = `${side}:${assignment.name}`;
      assignments.set(key, (assignments.get(key) ?? 0) + assignment.count);
    }
  }
}

const requirements = [...aggregated.values()].map(item => {
  const resolution = resolveEntry(item.side, item.name);
  const assignmentCount = assignments.get(`${item.side}:${item.name}`) ?? 0;
  const customExtension = !resolution.declaration && !resolution.entry && assignmentCount > 0;
  const unclassified = !resolution.declaration && !resolution.entry && assignmentCount === 0;
  const state = customExtension ? "custom-extension" : unclassified ? "unclassified" : classify(resolution.entry);
  return {
    ...item,
    assignmentCount,
    canonicalId: resolution.id,
    resolution: customExtension ? "assignment-evidence" : resolution.method,
    state,
    availability: customExtension ? "script-defined" : unclassified ? "evidence-deferred" : resolution.entry?.availability ?? "missing",
    compatibility: customExtension ? "custom-extension" : unclassified ? "unclassified" : resolution.entry?.compatibility ?? "missing",
    priority: priority(item, state),
  };
}).sort((left, right) => right.priority - left.priority || right.count - left.count || left.name.localeCompare(right.name));

const report = {
  format: "nea-script-corpus-compatibility-gap-report",
  version: 2,
  evidence: {
    input: "Middleware/runtime-compat/evidence/script-corpus-usage.json",
    ...evidenceBoundary,
  },
  summary: {
    samples: evidence.samples.length,
    requirements: requirements.length,
    executable: requirements.filter(item => item.state === "executable").length,
    partial: requirements.filter(item => item.state === "partial").length,
    unavailable: requirements.filter(item => item.state === "unavailable").length,
    missing: requirements.filter(item => item.state === "missing").length,
    customExtensions: requirements.filter(item => item.state === "custom-extension").length,
    unclassified: requirements.filter(item => item.state === "unclassified").length,
  },
  corpus: evidence.samples.map(sample => ({ sample: sample.sample, counts: sample.counts })),
  requirements,
};

await writeOutput("generated/script-corpus-gap-report.json", `${JSON.stringify(report, null, 2)}\n`);
await writeOutput("generated/script-corpus-gap-report.md", renderMarkdown(report));
console.log(`Generated script corpus gap report with ${requirements.length} requirements.`);

function resolveEntry(side, name) {
  const aliasId = aliases[`${side}:${name}`];
  if (aliasId) return { id: aliasId, entry: entries.get(aliasId), declaration: declarations.get(aliasId), method: "evidence-alias" };
  const exactId = `${side}.${name}`;
  if (entries.has(exactId)) return { id: exactId, entry: entries.get(exactId), declaration: declarations.get(exactId), method: "exact" };
  const [owner, member] = name.split(".", 2);
  const candidate = abi.entries.find(entry => entry.side === side && entry.owner === owner && entry.name === member);
  if (candidate) return { id: candidate.id, entry: candidate, declaration: declarations.get(candidate.id), method: "owner-member" };
  const canonicalOwner = canonicalOwners[side]?.[owner];
  const canonicalId = canonicalOwner ? `${side}.${canonicalOwner}.${member}` : exactId;
  const declaration = declarations.get(canonicalId);
  return { id: declaration ? canonicalId : exactId, entry: entries.get(canonicalId), declaration, method: declaration ? "canonical-owner" : "unresolved" };
}

function classify(entry) {
  if (!entry) return "missing";
  if (entry.compatibility === "partial") return "partial";
  if (["native", "compatible", "emulated", "bridged"].includes(entry.compatibility) && entry.availability === "confirmed") return "executable";
  return "unavailable";
}

function priority(item, state) {
  const stateWeight = { missing: 8, unavailable: 6, partial: 3, unclassified: 4, executable: 1, "custom-extension": 0 }[state];
  const sideWeight = item.side === "client" ? 2 : 1;
  const criticalWeight = /remoteChannel|findChildByName|Ui|screen\.|input\./.test(item.name) ? 3 : 1;
  return item.count * stateWeight * sideWeight * criticalWeight;
}

function readEvidenceBoundary(value) {
  const provenance = value.provenance;
  const keys = ["sourceClass", "redactionStatus", "publicStatus", "reproducibilityLimit"];
  const hasCompleteMetadata = provenance
    && typeof provenance === "object"
    && keys.every(key => typeof provenance[key] === "string" && provenance[key].length > 0);
  if (!hasCompleteMetadata) {
    throw new Error("Script corpus evidence must declare complete provenance boundaries.");
  }
  return Object.fromEntries(keys.map(key => [key, provenance[key]]));
}

function renderMarkdown(value) {
  const lines = [
    "# Script Corpus Compatibility Gap Report", "",
    "Private source paths, work identities, and event type names are excluded. Samples only prioritize unified ABI work.", "",
    "A custom extension is reported only when the corpus contains a direct member assignment and the native ABI catalogs contain no matching declaration.", "",
    "## Evidence Boundaries", "", `- Source class: ${value.evidence.sourceClass}`, `- Redaction: ${value.evidence.redactionStatus}`,
    `- Publication status: ${value.evidence.publicStatus}`, `- Reproducibility limit: ${value.evidence.reproducibilityLimit}`, "",
    "## Summary", "", `- Anonymous samples: ${value.summary.samples}`, `- Distinct API requirements: ${value.summary.requirements}`,
    `- Executable: ${value.summary.executable}`, `- Partial: ${value.summary.partial}`, `- Unavailable: ${value.summary.unavailable}`,
    `- Missing native ABI: ${value.summary.missing}`, `- Unclassified surfaces: ${value.summary.unclassified}`, `- Script-defined custom extensions: ${value.summary.customExtensions}`, "",
    "## Highest-Priority Native Gaps", "", "| Priority | Side | Usage | Requirement | Canonical ABI | State | Compatibility |",
    "| ---: | --- | ---: | --- | --- | --- | --- |",
  ];
  for (const item of value.requirements.filter(item => !["executable", "custom-extension", "unclassified"].includes(item.state)).slice(0, 30)) {
    lines.push(`| ${item.priority} | ${item.side} | ${item.count} | \`${item.name}\` | \`${item.canonicalId}\` | ${item.state} | ${item.compatibility} |`);
  }
  lines.push("", "## Unclassified Surfaces", "", "These names have neither a matching native declaration nor direct assignment evidence in the current corpus.", "", "| Side | Usage | Requirement |", "| --- | ---: | --- |");
  for (const item of value.requirements.filter(item => item.state === "unclassified")) {
    lines.push(`| ${item.side} | ${item.count} | \`${item.name}\` |`);
  }
  lines.push("", "## Script-Defined Extensions", "", "| Side | Usage | Assignments | Requirement |", "| --- | ---: | ---: | --- |");
  for (const item of value.requirements.filter(item => item.state === "custom-extension")) {
    lines.push(`| ${item.side} | ${item.count} | ${item.assignmentCount} | \`${item.name}\` |`);
  }
  lines.push("", "## Implemented High-Use Paths", "", "| Side | Usage | Requirement | Canonical ABI |", "| --- | ---: | --- | --- |");
  for (const item of value.requirements.filter(item => item.state === "executable").slice(0, 30)) {
    lines.push(`| ${item.side} | ${item.count} | \`${item.name}\` | \`${item.canonicalId}\` |`);
  }
  return `${lines.join("\n")}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function writeOutput(path, contents) {
  const output = resolve(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, contents);
}
