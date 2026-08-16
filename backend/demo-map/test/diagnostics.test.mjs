import assert from "node:assert/strict";
import test from "node:test";
import { formatDiagnostic, redactDiagnostic } from "../src/diagnostics.mjs";

test("diagnostics redact configured secrets and Windows paths", () => {
  const token = "control-token-value";
  const message = redactDiagnostic(`failed at D:\\Users\\name\\private\\runtime.json with ${token}`, [token]);
  assert.equal(message.includes(token), false);
  assert.equal(message.includes("D:\\Users\\name"), false);
  assert.match(message, /<redacted>/);
  assert.match(message, /<path>/);
});

test("diagnostics preserve actionable error messages", () => {
  assert.match(formatDiagnostic(new Error("runtime package is invalid")), /runtime package is invalid/);
});
