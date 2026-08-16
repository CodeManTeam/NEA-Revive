import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));
const current = JSON.parse(await readFile(resolve(root, "abi", "current-runtime.json"), "utf8"));
const client = JSON.parse(await readFile(resolve(root, "abi", "client-runtime.json"), "utf8"));
const server = JSON.parse(await readFile(resolve(root, "abi", "server-runtime.json"), "utf8"));
const matrix = JSON.parse(await readFile(resolve(root, "abi", "compatibility-matrix.json"), "utf8"));
const contact = JSON.parse(await readFile(resolve(root, "abi", "contact-event-model.json"), "utf8"));
const posture = JSON.parse(await readFile(resolve(root, "abi", "physics-player-posture.json"), "utf8"));
const evidenceCoverage = JSON.parse(await readFile(resolve(root, "generated", "authoritative-runtime-evidence-coverage.json"), "utf8"));
const recovered = [...client.entries, ...server.entries].filter(entry =>
  ["confirmed", "partial"].includes(entry.availability) && entry.compatibility !== "missing"
);
const executableIds = new Set(matrix.entries.filter(entry => entry.executable).map(entry => entry.id));
const declaredIds = new Set(docs.entries.map(entry => entry.id));
const covered = docs.entries.filter(entry => executableIds.has(entry.id));
const missing = docs.entries.filter(entry => !executableIds.has(entry.id));
const extensions = current.entries.filter(entry => !declaredIds.has(entry.id) && !(entry.implements ?? []).some(id => declaredIds.has(id)));
const bySide = Object.fromEntries(["client", "server", "shared"].map(side => {
  const declared = docs.entries.filter(entry => entry.side === side).length;
  const compatible = covered.filter(entry => entry.side === side).length;
  return [side, { declared, compatible, missing: declared - compatible }];
}));
const catalogStatus = {
  client: statusMatrix(client.entries),
  server: statusMatrix(server.entries),
};

const report = {
  format: "nea-runtime-gap-report",
  version: 1,
  generatedAt: new Date().toISOString(),
  summary: {
    documentedDeclarations: docs.entries.length,
    currentContractEntries: current.entries.length,
    recoveredContractEntries: recovered.length,
    exactIdMatches: covered.length,
    documentedMissing: missing.length,
    localExtensions: extensions.length,
    bySide,
    catalogStatus,
    compatibilityStatus: matrix.summary.byStatus,
  },
  warnings: [
    "Native, compatible and partial matrix states are executable classifications; partial still records unresolved behavioral gaps.",
    "Documentation declarations remain missing until Player/origin evidence and conformance tests prove compatibility.",
    "The upright Player default collision dimensions are recovered; crouch and flying historical shapes are explicit null fields with a non-historical preserve-current-collider compatibility policy.",
    "Per-contact fx/fy/fz production is recovered from the historical impulse solver; only the GameEntity.contactForce aggregate and local solver integration remain unresolved."
  ],
  evidenceGaps: {
    playerPostureShapes: {
      status: evidenceCoverage.postureShapeProducer.status,
      representationStatus: posture.crouching.authoritativeShape.status,
      unknownWireFields: Object.entries(posture.crouching.authoritativeShape.wireFields).filter(([, value]) => value === null).map(([field]) => field),
      compatibilityPolicy: posture.compatibilityPolicy,
      blockingCurrentPhase: false,
      indexedSourceSets: evidenceCoverage.indexedSourceSets.map(source => source.id),
      frameCorpusStatus: evidenceCoverage.postureShapeProducer.frameCorpusStatus,
      clientToServerBinaryFrames: evidenceCoverage.postureShapeProducer.clientToServerBinaryFrames,
      serverToClientBinaryFrames: evidenceCoverage.postureShapeProducer.publicFrameCount,
      requiredEvidence: "historical server-to-client PUBLIC body delta or equivalent authoritative posture producer",
    },
    contactBinding: {
      status: evidenceCoverage.contactBinding.status,
      perContactForceProduction: contact.force.status,
      aggregateContactForce: contact.force.aggregateContactForce.status,
    },
  },
  deferredEvidence: [{
    id: "player-posture-authoritative-shapes",
    status: evidenceCoverage.postureShapeProducer.status,
    blocking: false,
    requiredEvidence: "historical server-to-client PUBLIC body delta or equivalent authoritative posture producer",
  }],
  immediatePriorities: [
    "Recover ContactBinding or equivalent server source to determine GameEntity.contactForce aggregation and active contact object reuse.",
    "Integrate the recovered per-contact impulse force formula only with a compatible authoritative solver, not the current sweep approximation.",
    "Bind recovered origin GameEntity and GamePlayer surfaces to server runtime adapters only after behavior matches.",
    "Search other evidence-compatible historical Player providers before changing the confirmed-unavailable UiInput.placeholderOpacity classification for the selected archived provider.",
  ],
  covered: covered.map(entry => entry.id),
  missing: missing.map(entry => entry.id),
  localExtensions: extensions.map(entry => entry.id),
};

const jsonPath = resolve(root, "generated", "gap-report.json");
const markdownPath = resolve(root, "generated", "gap-report.md");
await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, renderMarkdown(report));
console.log(`Gap report: ${covered.length}/${docs.entries.length} documented identifiers currently represented.`);

function renderMarkdown(value) {
  const lines = [
    "# Runtime Compatibility Gap Report",
    "",
    `Generated: ${value.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Documentation declarations: ${value.summary.documentedDeclarations}`,
    `- Current contract entries: ${value.summary.currentContractEntries}`,
    `- Recovered compatible entries: ${value.summary.recoveredContractEntries}`,
    `- Identifier/canonical matches: ${value.summary.exactIdMatches}`,
    `- Documented declarations still missing: ${value.summary.documentedMissing}`,
    `- Local extensions not joined to documentation: ${value.summary.localExtensions}`,
    `- Native: ${value.summary.compatibilityStatus.native}`,
    `- Compatible: ${value.summary.compatibilityStatus.compatible}`,
    `- Partial: ${value.summary.compatibilityStatus.partial}`,
    `- Recovered only: ${value.summary.compatibilityStatus["recovered-only"]}`,
    `- Unavailable in selected provider: ${value.summary.compatibilityStatus.unavailable ?? 0}`,
    `- Declared only: ${value.summary.compatibilityStatus["declared-only"]}`,
    "",
    "## By Runtime Side",
    "",
    ...Object.entries(value.summary.bySide).map(([side, counts]) => `- ${side}: ${counts.compatible}/${counts.declared} represented; ${counts.missing} missing`),
    "",
    "## Recovery vs Implementation",
    "",
    `- Client confirmed/native: ${value.summary.catalogStatus.client["confirmed/native"] ?? 0}`,
    `- Client declared/missing: ${value.summary.catalogStatus.client["declared/missing"] ?? 0}`,
    `- Server confirmed but unimplemented: ${value.summary.catalogStatus.server["confirmed/missing"] ?? 0}`,
    `- Server confirmed/bridged: ${value.summary.catalogStatus.server["confirmed/bridged"] ?? 0}`,
    `- Server confirmed/emulated: ${value.summary.catalogStatus.server["confirmed/emulated"] ?? 0}`,
    "",
    "## Interpretation",
    "",
    ...value.warnings.map(warning => `- ${warning}`),
    "",
    "## Evidence Gaps",
    "",
    `- Player posture producer: ${value.evidenceGaps.playerPostureShapes.status}`,
    `- Player posture representation: ${value.evidenceGaps.playerPostureShapes.representationStatus}`,
    `- Unknown posture wire fields: ${value.evidenceGaps.playerPostureShapes.unknownWireFields.join(", ")}`,
    `- Unknown posture policy: ${value.evidenceGaps.playerPostureShapes.compatibilityPolicy.onUnknownAuthoritativeShape}; historical claim=${value.evidenceGaps.playerPostureShapes.compatibilityPolicy.historicalClaim}`,
    `- Blocking current phase: ${value.evidenceGaps.playerPostureShapes.blockingCurrentPhase}`,
    `- Posture frame corpus: ${value.evidenceGaps.playerPostureShapes.frameCorpusStatus}`,
    `- Captured binary traffic: ${value.evidenceGaps.playerPostureShapes.clientToServerBinaryFrames} client-to-server; ${value.evidenceGaps.playerPostureShapes.serverToClientBinaryFrames} server-to-client`,
    `- Indexed source sets: ${value.evidenceGaps.playerPostureShapes.indexedSourceSets.join(", ")}`,
    `- ContactBinding: ${value.evidenceGaps.contactBinding.status}`,
    `- Per-contact force: ${value.evidenceGaps.contactBinding.perContactForceProduction}`,
    `- Aggregate contactForce: ${value.evidenceGaps.contactBinding.aggregateContactForce}`,
    "",
    "## Deferred Evidence",
    "",
    ...value.deferredEvidence.map(item => `- ${item.id}: ${item.status}; blocking=${item.blocking}`),
    "",
    "## Immediate Priorities",
    "",
    ...value.immediatePriorities.map((priority, index) => `${index + 1}. ${priority}`),
    ""
  ];
  return lines.join("\n");
}

function statusMatrix(entries) {
  const matrix = {};
  for (const entry of entries) {
    const key = `${entry.availability}/${entry.compatibility}`;
    matrix[key] = (matrix[key] ?? 0) + 1;
  }
  return matrix;
}
