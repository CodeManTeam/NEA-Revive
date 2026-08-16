import assert from "node:assert/strict";
import test from "node:test";
import { isEvidenceBackedRecoveredCanonical } from "../conformance/recovered-canonical-evidence.mjs";

function binding(overrides = {}) {
  return {
    availability: "confirmed",
    compatibility: "compatible",
    evidence: [],
    ...overrides,
  };
}

test("recovered canonical evidence accepts direct historical providers", () => {
  for (const type of ["player-bundle", "origin-source", "declaration", "protocol-schema"]) {
    assert.equal(isEvidenceBackedRecoveredCanonical(binding({ evidence: [{ type, confidence: "direct" }] })), true, type);
  }
});

test("recovered canonical evidence accepts tested local implementations", () => {
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({
    compatibility: "emulated",
    evidence: [
      { type: "local-source", confidence: "direct" },
      { type: "test", confidence: "direct" },
    ],
  })), true);
});

test("recovered canonical evidence rejects weak or non-executable claims", () => {
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({ evidence: [{ type: "script-corpus", confidence: "direct" }] })), false);
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({ evidence: [{ type: "local-source", confidence: "direct" }] })), false);
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({ availability: "recovered", evidence: [{ type: "origin-source", confidence: "direct" }] })), false);
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({ compatibility: "partial", evidence: [{ type: "origin-source", confidence: "direct" }] })), false);
  assert.equal(isEvidenceBackedRecoveredCanonical(binding({ evidence: [{ type: "player-bundle", confidence: "inferred" }] })), false);
});
