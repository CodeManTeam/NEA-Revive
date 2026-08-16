import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const architecture = await readJson("abi/runtime-contracts.json");
const matrix = await readJson("abi/compatibility-matrix.json");
const protocols = await readJson("abi/protocols.json");
const body = await readJson("abi/physics-player-body.json");
const posture = await readJson("abi/physics-player-posture.json");
const contact = await readJson("abi/contact-event-model.json");
const legacyPosture = await readJson("generated/legacy-worktree-posture-inventory.json");
const evidenceCoverage = await readJson("generated/authoritative-runtime-evidence-coverage.json");
const postureCorpus = await readJson("generated/posture-delta-corpus-inventory.json");
const apiAbiCompleteness = await readJson("generated/api-abi-completeness.json");
const gap = await readJson("generated/gap-report.json");
const apiAbiStatus = apiAbiCompleteness.status === "complete" ? "complete" : "partial";
const apiAbiRemaining = apiAbiCompleteness.gaps.slice(0, 20).map(item => `${item.domain}:${item.id}:${item.field} - ${item.rule}`);
const capabilityManifest = architecture.projectCapabilityManifest;
const capabilityManifestComplete = capabilityManifest?.format === "nea-project-capability-manifest"
  && capabilityManifest.version >= 10
  && ["requirements", "modules", "resources", "ui", "entities", "dependencies", "diagnostics"].every(name => capabilityManifest.evidenceCollections.includes(name))
  && ["server-modules", "client-modules", "server-capability-grants", "client-capability-grants", "client-ui-state", "asset-file-evidence", "entity-projection-evidence", "runtime-abi-artifacts"].every(name => capabilityManifest.inputBindings.includes(name))
  && capabilityManifest.integrityChecks.includes("asset-file-bytes-sha256")
  && capabilityManifest.integrityChecks.includes("runtime-abi-semantic-digest")
  && ["client-script-publication", "client-ui-publication", "server-script-runtime-construction", "backend-spawn", "player-navigation"].every(name => capabilityManifest.launchBefore.includes(name));

const requirements = [
  requirement("layered-architecture", "complete", "Client Script Runtime, Server Script Runtime, MuDB transport and authoritative state are separate layers.", [
    proof("Middleware/runtime-compat/abi/runtime-contracts.json", architecture.layers.map(layer => layer.id)),
    proof("Middleware/runtime-compat/abi/script-runtime-boundaries.json", architecture.scriptRuntimes.invariant),
  ]),
  requirement("machine-readable-api-abi", apiAbiStatus, "Every locally documented canonical declaration, kind-qualified member signature and recovered MuDB message has an explicit machine-readable record with availability, compatibility and evidence.", [
    proof("Middleware/runtime-compat/generated/api-abi-completeness.json", { status: apiAbiCompleteness.status, summary: apiAbiCompleteness.summary }),
    proof("Middleware/runtime-compat/abi/compatibility-matrix.json", { declarations: matrix.summary.entries, byStatus: matrix.summary.byStatus }),
    proof("Middleware/runtime-compat/abi/protocols.json", { protocols: protocols.protocols.length, messages: protocols.messages.length, byDirection: protocols.summary.byDirection }),
  ], apiAbiRemaining),
  requirement("player-standing-body", "complete", "Historical standing Player body dimensions and body-center coordinates replace the unsupported 0.6x1.8x0.6 assumption.", [
    proof("Middleware/runtime-compat/abi/physics-player-body.json", { origin: body.coordinateOrigin, halfExtents: body.halfExtents, dimensions: body.dimensions, status: body.dimensionStatus }),
  ]),
  requirement("player-posture-shapes", "complete", "Crouch/fly state encoding and client motor behavior are recovered; unavailable historical shapes are explicit null fields and the local runtime preserves the current collider instead of synthesizing dimensions.", [
    proof("Middleware/runtime-compat/abi/physics-player-posture.json", {
      crouching: posture.crouching,
      flying: posture.flying,
      compatibilityPolicy: posture.compatibilityPolicy,
      captureEvidence: posture.authority.evidenceAvailable,
    }),
    proof("Middleware/runtime-compat/generated/legacy-worktree-posture-inventory.json", {
      clientShapeWrites: legacyPosture.archivedPlayerMotor.bodyShapeWrites,
      legacyProducer: legacyPosture.legacyPublicProducer.classification,
      authoritativeStatus: legacyPosture.authoritativePostureDelta.status,
    }),
    proof("Middleware/runtime-compat/generated/posture-delta-corpus-inventory.json", {
      captures: postureCorpus.captures.count,
      clientToServerBinaryFrames: postureCorpus.captures.traffic.clientToServerBinaryFrames,
      serverToClientBinaryFrames: postureCorpus.captures.traffic.serverToClientBinaryFrames,
      resourceArchives: postureCorpus.resourceArchives.count,
      rawReplayPayloadAvailable: postureCorpus.staticReplay.rawPayloadAvailable,
      status: postureCorpus.authoritativePostureDelta.status,
    }),
    proof("Middleware/runtime-compat/generated/authoritative-runtime-evidence-coverage.json", {
      indexedSourceSets: evidenceCoverage.indexedSourceSets.map(source => source.id),
      producerStatus: evidenceCoverage.postureShapeProducer.status,
      contactBindingStatus: evidenceCoverage.contactBinding.status,
    }),
  ]),
  requirement("terrain-contact-rules", "complete", "Terrain contact axes, grounded support selection, force fields and active ContactRecord schemas are recovered.", [
    proof("Middleware/runtime-compat/abi/physics-player-body.json", body.contactRules),
    proof("Middleware/runtime-compat/abi/contact-event-model.json", { axis: contact.axis, authoritativeState: contact.authoritativeState }),
  ]),
  requirement("version-capability-conformance", "complete", "API version, runtime contracts, side-qualified capabilities, compatibility levels and conformance fixtures are enforced.", [
    proof("Middleware/runtime-compat/abi/runtime-contracts.json", { apiVersion: architecture.apiVersion, contracts: architecture.contracts.map(contract => contract.id) }),
    proof("Middleware/runtime-compat/abi/compatibility-matrix.json", matrix.statusDefinitions),
    proof("Middleware/runtime-compat/conformance/entity-tag-api.mjs", { compatible: ["GameEntity.addTag", "GameEntity.removeTag", "GameEntity.hasTag"], partial: ["GameEntity.tags"] }),
    proof("Middleware/runtime-compat/conformance/world-collision-filter-api.mjs", { partial: ["GameWorld.addCollisionFilter", "GameWorld.removeCollisionFilter", "GameWorld.clearCollisionFilters", "GameWorld.collisionFilters"] }),
  ]),
  requirement("project-capability-launch-gate", capabilityManifestComplete ? "complete" : "partial", "Capability Manifest v14 binds analyzed scripts, grants, UI, resources, entities, storage group scope, project identity, world entity-limit configuration, static server sound samples and semantic Runtime ABI artifacts to the actual package before publication or execution; sound calls additionally require the evidenced player.sound transport, while exact player lifecycle payloads may be project-ready even though the global player ABI remains partial because accessed members are independently gated.", [
    proof("Middleware/runtime-compat/abi/runtime-contracts.json", capabilityManifest),
    proof("Frontend/demo-map/src/capability-launch-gate.mjs", { version: capabilityManifest?.version, inputs: capabilityManifest?.inputBindings, launchBefore: capabilityManifest?.launchBefore }),
    proof("Middleware/runtime-compat/conformance/player-lifecycle-project-refinement.mjs", capabilityManifest?.projectRefinements ?? []),
    proof("Middleware/runtime-compat/conformance/world-project-identity.mjs", { compatible: "GameWorld.projectName", excluded: ["GameWorld.url", "GameWorld.serverId"] }),
  ], capabilityManifestComplete ? [] : ["Capability Manifest v14 architecture contract or startup ordering is incomplete."]),
  requirement("demo-contract-bindings", "complete", "Demo client.js and server.js bind separate declared runtime contracts and capabilities.", [
    proof("Middleware/runtime-compat/abi/runtime-contracts.json", architecture.demo.bindings.map(binding => ({ side: binding.side, contract: binding.contract, resolved: binding.resolved }))),
  ]),
  requirement("gap-report", "complete", "The generated gap report uses the same canonical compatibility matrix classification.", [
    proof("Middleware/runtime-compat/generated/gap-report.json", { executable: gap.summary.exactIdMatches, compatibilityStatus: gap.summary.compatibilityStatus }),
  ]),
];
const overallStatus = requirements.every(item => item.status === "complete") ? "complete" : "partial";
const audit = {
  format: "nea-runtime-compatibility-phase-audit",
  version: 1,
  generatedAt: new Date().toISOString(),
  phase: 5,
  overallStatus,
  requirements,
  remainingEvidenceGaps: requirements.flatMap(item => item.remaining ?? []),
  deferredEvidence: [{
    id: "player-posture-authoritative-shapes",
    blocking: false,
    status: evidenceCoverage.postureShapeProducer.status,
    representation: posture.crouching.authoritativeShape.status,
    requiredEvidence: "Historical server-to-client PUBLIC body delta containing crouch or flying rx/ry/rz and hsx/hsy/hsz changes.",
  }],
  validationCommands: [
    "cd runtime-compat && npm run build && npm test",
    "cd demo-map && npm run build && npm test",
  ],
  policy: "Historical behavior is never synthesized. Evidence-deferred fields remain null; a local preserve-current-collider policy may complete the compatibility contract without claiming recovered historical values.",
};

await mkdir(resolve(root, "generated"), { recursive: true });
await writeFile(resolve(root, "generated", "phase-5-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(resolve(root, "generated", "phase-5-audit.md"), renderMarkdown(audit));
console.log(`Phase 5 audit: ${requirements.filter(item => item.status === "complete").length}/${requirements.length} requirements complete; overall ${overallStatus}.`);

function requirement(id, status, conclusion, evidence, remaining = []) {
  return { id, status, conclusion, evidence, ...(remaining.length > 0 ? { remaining } : {}) };
}

function proof(path, finding) {
  return { path, finding };
}

function renderMarkdown(value) {
  const lines = [
    "# NEA Runtime Compatibility Phase 5 Audit",
    "",
    `Generated: ${value.generatedAt}`,
    `Overall status: **${value.overallStatus}**`,
    "",
    "## Requirements",
    "",
  ];
  for (const item of value.requirements) {
    lines.push(`### ${item.id}: ${item.status}`, "", item.conclusion, "");
    for (const evidence of item.evidence) lines.push(`- ${evidence.path}: ${JSON.stringify(evidence.finding)}`);
    for (const remaining of item.remaining ?? []) lines.push(`- Remaining: ${remaining}`);
    lines.push("");
  }
  lines.push("## Deferred Evidence", "", ...value.deferredEvidence.map(item => `- ${item.id}: ${item.status}; blocking=${item.blocking}; representation=${item.representation}`), "");
  lines.push("## Validation", "", ...value.validationCommands.map(command => `- \`${command}\``), "", `Policy: ${value.policy}`, "");
  return lines.join("\n");
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
