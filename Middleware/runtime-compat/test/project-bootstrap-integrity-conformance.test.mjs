import test from "node:test";
import assert from "node:assert/strict";
import { projectBootstrapIntegrityContract } from "../conformance/project-bootstrap-integrity.mjs";

test("project bootstrap compatibility permits only manifest-equivalent newline normalization", () => {
  assert.match(projectBootstrapIntegrityContract.primaryCheck, /raw bootstrap byte length and SHA-256/);
  assert.match(projectBootstrapIntegrityContract.compatibilityCheck, /only CRLF-to-LF normalization/);
  assert.deepEqual(projectBootstrapIntegrityContract.rejectedChanges, [
    "JSON value changes",
    "key changes",
    "whitespace changes other than CRLF line endings",
    "manifest hash edits",
  ]);
});
