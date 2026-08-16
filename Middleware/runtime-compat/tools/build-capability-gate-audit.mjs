import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isEvidenceBackedRecoveredCanonical } from "../../../Frontend/demo-map/src/recovered-canonical-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = await readJson("generated/script-corpus-gap-report.json");
const matrix = await readJson("abi/compatibility-matrix.json");
const current = await readJson("abi/current-runtime.json");
const entries = new Map(matrix.entries.map(entry => [entry.id, entry]));
const currentEntries = new Map(current.entries.map(entry => [entry.id, entry]));
const evidenceBlockers = new Map([
  ["server:world.onChat", "The historical GameChatEvent consumer reads chatEvents.chats, while the recovered Player game-chat client-to-server surface only sends administrator noticeMessage {title,detail}; no Player chat producer reaches the local Server Script Runtime."],
  ["server:storage.getGroupStorage", "The default local Runtime has no authoritative DAO3 group identity or group-scoped storage provider."],
  ["server:world.onPlayerPurchaseSuccess", "Historical ScriptShell consumes tick.purchaseSuccessEvents {userId,productId,orderId,messageId} and acknowledges messageId, while the recovered Player market protocol only receives openMarketplace and has no client-to-server result message; no purchase producer reaches the local Server Script Runtime."],
]);

const requirements = corpus.requirements.map(requirement => {
  const resolution = resolveRequirement(requirement);
  const declaration = resolution.declaration;
  const scriptOwned = requirement.state === "custom-extension";
  const executableBindings = declaration?.localBindings?.filter(binding => binding.status !== "unavailable" && binding.status !== "declared-only") ?? (resolution.binding ? [{ localId: resolution.binding.id, capability: resolution.binding.capability, gaps: [] }] : []);
  const selectedLocalBinding = executableBindings.find(binding => currentEntries.has(binding.localId));
  const selectedBinding = resolution.binding ?? (selectedLocalBinding ? currentEntries.get(selectedLocalBinding.localId) : undefined);
  const executable = declaration ? declaration.executable === true && selectedBinding !== undefined : selectedBinding?.availability === "confirmed";
  const effectiveCompatibility = resolution.binding?.compatibility ?? selectedLocalBinding?.status ?? declaration?.status ?? selectedBinding?.compatibility ?? selectedBinding?.status ?? requirement.compatibility;
  let launchState;
  const reasons = [];
  const evidenceBlocker = evidenceBlockers.get(`${requirement.side}:${requirement.name}`);
  if (evidenceBlocker) {
    launchState = "blocked";
    reasons.push(evidenceBlocker);
  } else if (scriptOwned) {
    launchState = "script-owned";
    reasons.push("Corpus assignment evidence identifies a script-owned extension, not a DAO3 Runtime requirement.");
  } else if (!declaration && !selectedBinding) {
    launchState = "blocked";
    reasons.push("No compatibility-matrix declaration or recovered current-runtime canonical binding resolves this corpus usage.");
  } else if (!executable) {
    launchState = "blocked";
    reasons.push(`Canonical ABI is ${declaration.status} and has no executable local binding.`);
  } else if (!declaration && selectedBinding) {
    launchState = isEvidenceBackedRecoveredCanonical(selectedBinding) ? "ready" : "partial";
    reasons.push(launchState === "ready"
      ? "Recovered canonical surface is outside the documented declaration matrix, but direct runtime evidence proves the executable contract."
      : "Executable recovered canonical surface is outside the documented declaration matrix and lacks sufficient evidence for a ready launch claim.");
  } else if (effectiveCompatibility === "partial") {
    launchState = "partial";
    reasons.push("At least one evidence-backed behavioral gap remains on the executable binding.");
  } else {
    launchState = "ready";
  }
  const gaps = [...new Set(executableBindings.flatMap(binding => binding.gaps ?? []).map(sanitizeEvidenceText))].sort();
  if (!declaration && selectedBinding) reasons.push(launchState === "ready"
    ? `Direct evidence resolves the recovered current-runtime canonical binding: ${selectedBinding.id}.`
    : `Executable recovered canonical surface is not present in the documented declaration matrix: ${selectedBinding.id}.`);
  reasons.push(...gaps.filter(gap => !reasons.includes(gap)));
  return Object.freeze({
    side: requirement.side,
    usage: requirement.name,
    occurrences: requirement.count,
    sampleCount: requirement.sampleCount,
    corpusCanonicalId: requirement.canonicalId,
    canonicalId: declaration?.id ?? selectedBinding?.id ?? requirement.canonicalId,
    resolution: resolution.method,
    corpusState: requirement.state,
    compatibility: effectiveCompatibility,
    capability: executableBindings.find(binding => binding.capability)?.capability ?? declaration?.capability ?? null,
    executableBindingIds: [...new Set(executableBindings.map(binding => binding.localId))].sort(),
    launchState,
    reasons,
  });
}).sort((left, right) => launchRank(left.launchState) - launchRank(right.launchState) || right.occurrences - left.occurrences || left.usage.localeCompare(right.usage));

const gated = requirements.filter(requirement => requirement.launchState !== "script-owned");
const report = Object.freeze({
  format: "nea-capability-gate-audit",
  version: 1,
  inputs: Object.freeze({
    corpus: "Middleware/runtime-compat/generated/script-corpus-gap-report.json",
    matrix: "Middleware/runtime-compat/abi/compatibility-matrix.json",
    currentRuntime: "Middleware/runtime-compat/abi/current-runtime.json",
  }),
  summary: Object.freeze({
    requirements: requirements.length,
    gatedRequirements: gated.length,
    ready: gated.filter(item => item.launchState === "ready").length,
    partial: gated.filter(item => item.launchState === "partial").length,
    blocked: gated.filter(item => item.launchState === "blocked").length,
    scriptOwned: requirements.filter(item => item.launchState === "script-owned").length,
    occurrences: gated.reduce((sum, item) => sum + item.occurrences, 0),
    readyOccurrences: gated.filter(item => item.launchState === "ready").reduce((sum, item) => sum + item.occurrences, 0),
    partialOccurrences: gated.filter(item => item.launchState === "partial").reduce((sum, item) => sum + item.occurrences, 0),
    blockedOccurrences: gated.filter(item => item.launchState === "blocked").reduce((sum, item) => sum + item.occurrences, 0),
  }),
  requirements,
});

await writeOutput("generated/capability-gate-audit.json", `${JSON.stringify(report, null, 2)}\n`);
await writeOutput("generated/capability-gate-audit.md", renderMarkdown(report));
console.log(`Generated capability gate audit: ready=${report.summary.ready}, partial=${report.summary.partial}, blocked=${report.summary.blocked}, script-owned=${report.summary.scriptOwned}.`);

function renderMarkdown(value) {
  const lines = [
    "# Capability Gate Audit",
    "",
    "This report converts the anonymized script corpus ABI inventory into the same conservative launch states used by the project Capability Manifest. It does not read private script source.",
    "",
    "## Summary",
    "",
    `- Requirements: ${value.summary.requirements}`,
    `- Gated requirements: ${value.summary.gatedRequirements}`,
    `- Ready: ${value.summary.ready} (${value.summary.readyOccurrences} occurrences)`,
    `- Partial: ${value.summary.partial} (${value.summary.partialOccurrences} occurrences)`,
    `- Blocked: ${value.summary.blocked} (${value.summary.blockedOccurrences} occurrences)`,
    `- Script-owned extensions: ${value.summary.scriptOwned}`,
    "",
    "## Blocked",
    "",
    ...renderRows(value.requirements.filter(item => item.launchState === "blocked")),
    "",
    "## Partial",
    "",
    ...renderRows(value.requirements.filter(item => item.launchState === "partial")),
    "",
    "## Ready",
    "",
    ...renderRows(value.requirements.filter(item => item.launchState === "ready")),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderRows(values) {
  if (values.length === 0) return ["None."];
  return [
    "| Side | Usage | Occurrences | Canonical ABI | Capability | Reason |",
    "| --- | --- | ---: | --- | --- | --- |",
    ...values.map(item => `| ${item.side} | \`${item.usage}\` | ${item.occurrences} | \`${item.canonicalId ?? "unresolved"}\` | ${item.capability ? `\`${item.capability}\`` : "-"} | ${escapeCell(item.reasons.join(" ") || "Executable evidence-backed binding.")} |`),
  ];
}

function launchRank(state) {
  return { blocked: 0, partial: 1, ready: 2, "script-owned": 3 }[state] ?? 4;
}

function resolveRequirement(requirement) {
  const exact = entries.get(requirement.canonicalId);
  if (exact) return { declaration: exact, binding: null, method: "matrix-exact" };
  const [rootOwner, member] = requirement.name.split(".", 2);
  const canonicalOwner = {
    server: { world: "GameWorld", voxels: "GameVoxels", gui: "GameGUI", storage: "GameStorage", remoteChannel: "remoteChannel" },
    client: { input: "ClientInput", screen: "ClientScreen", ui: "UiNode", remoteChannel: "remoteChannel" },
  }[requirement.side]?.[rootOwner];
  if (canonicalOwner) {
    const preferred = entries.get(`${requirement.side}.${canonicalOwner}.${member}`);
    if (preferred) return { declaration: preferred, binding: null, method: "matrix-owner" };
  }
  const local = currentEntries.get(requirement.canonicalId);
  for (const implemented of local?.implements ?? []) if (entries.has(implemented)) return { declaration: entries.get(implemented), binding: local, method: "current-implements-matrix" };
  if (local?.availability === "confirmed") return { declaration: null, binding: local, method: "current-runtime-recovered" };
  const candidates = matrix.entries.filter(entry => entry.side === requirement.side && entry.name === member && (!canonicalOwner || entry.owner === canonicalOwner));
  if (candidates.length === 1) return { declaration: candidates[0], binding: null, method: "matrix-unique-member" };
  const recovered = current.entries.filter(entry => entry.side === requirement.side && entry.name === member && (!canonicalOwner || entry.owner === canonicalOwner) && entry.availability === "confirmed");
  return recovered.length === 1 ? { declaration: null, binding: recovered[0], method: "current-runtime-recovered" } : { declaration: null, binding: null, method: "unresolved" };
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function sanitizeEvidenceText(value) {
  return String(value).replace(/\b[A-Z][A-Za-z0-9_-]* corpus\b/g, "anonymous captured-script corpus");
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function writeOutput(path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value);
}
