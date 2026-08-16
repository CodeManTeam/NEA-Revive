import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = JSON.parse(await readFile(new URL("../generated/phase-5-audit.json", import.meta.url), "utf8"));

test("phase 5 audit covers every objective requirement", () => {
  assert.deepEqual(audit.requirements.map(requirement => requirement.id), [
    "layered-architecture",
    "machine-readable-api-abi",
    "player-standing-body",
    "player-posture-shapes",
    "terrain-contact-rules",
    "version-capability-conformance",
    "project-capability-launch-gate",
    "demo-contract-bindings",
    "gap-report",
  ]);
  assert.equal(audit.requirements.filter(requirement => requirement.status === "complete").length, 9);
  const apiAbi = audit.requirements.find(requirement => requirement.id === "machine-readable-api-abi");
  assert.equal(apiAbi.status, "complete");
  assert.ok(apiAbi.evidence.some(item => item.path === "Middleware/runtime-compat/generated/api-abi-completeness.json" && item.finding.status === "complete"));
  assert.equal(audit.requirements.find(requirement => requirement.id === "project-capability-launch-gate")?.status, "complete");
});

test("audit completes the explicit null posture contract without claiming historical dimensions", () => {
  assert.equal(audit.overallStatus, "complete");
  const posture = audit.requirements.find(requirement => requirement.id === "player-posture-shapes");
  assert.equal(posture.status, "complete");
  assert.equal(posture.remaining, undefined);
  const contract = posture.evidence.find(item => item.path === "Middleware/runtime-compat/abi/physics-player-posture.json");
  assert.equal(contract.finding.crouching.authoritativeShape.boundsHalfExtents, null);
  assert.equal(contract.finding.flying.authoritativeShape.shapeHalfExtents, null);
  assert.equal(contract.finding.compatibilityPolicy.onUnknownAuthoritativeShape, "preserve-current-collider");
  assert.equal(contract.finding.compatibilityPolicy.historicalClaim, false);
  const corpus = posture.evidence.find(item => item.path === "Middleware/runtime-compat/generated/posture-delta-corpus-inventory.json");
  assert.equal(corpus.finding.clientToServerBinaryFrames, 1864);
  assert.equal(corpus.finding.serverToClientBinaryFrames, 0);
  assert.equal(corpus.finding.status, "not-found-in-safe-local-frame-corpus");
  assert.deepEqual(audit.remainingEvidenceGaps, []);
  assert.deepEqual(audit.deferredEvidence.map(item => ({ id: item.id, blocking: item.blocking, representation: item.representation })), [{
    id: "player-posture-authoritative-shapes",
    blocking: false,
    representation: "evidence-deferred",
  }]);
  assert.match(audit.policy, /remain null/);
  assert.match(audit.policy, /without claiming recovered historical values/);
});
