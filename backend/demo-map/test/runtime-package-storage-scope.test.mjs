import assert from "node:assert/strict";
import test from "node:test";

import { resolveRuntimePackageStorageFile, resolveRuntimePackageStorageScope } from "../src/runtime-package-storage-scope.mjs";

test("runtime package storage scope preserves an absent or declared group identity", () => {
  assert.deepEqual(resolveRuntimePackageStorageScope({}), { groupId: null });
  assert.deepEqual(resolveRuntimePackageStorageScope({ declaredGroupId: "recovered-group" }), { groupId: "recovered-group" });
});

test("runtime package storage scope requires explicit blocked-package diagnostic admission", () => {
  assert.throws(
    () => resolveRuntimePackageStorageScope({ localDiagnosticGroupId: "local-probe" }),
    /requires NEA_DEMO_ALLOW_BLOCKED_PACKAGE_DIAGNOSTIC=1/,
  );
  assert.deepEqual(resolveRuntimePackageStorageScope({
    allowBlockedPackageDiagnostic: true,
    localDiagnosticGroupId: "local-probe",
  }), { groupId: "local-probe" });
});

test("runtime package storage scope cannot replace recovered evidence", () => {
  assert.throws(
    () => resolveRuntimePackageStorageScope({
      allowBlockedPackageDiagnostic: true,
      declaredGroupId: "recovered-group",
      localDiagnosticGroupId: "different-group",
    }),
    /cannot replace a declared runtime package storage.groupId/,
  );
});

test("runtime package storage scope validates both declared and local identities", () => {
  for (const invalid of ["", " padded", "padded ", "line\nbreak", "x".repeat(257)]) {
    assert.throws(
      () => resolveRuntimePackageStorageScope({ declaredGroupId: invalid }),
      /must be a non-empty, trimmed string/,
    );
  }
});

test("runtime package diagnostic storage requires an explicit absolute file", () => {
  assert.equal(resolveRuntimePackageStorageFile({}), undefined);
  assert.throws(
    () => resolveRuntimePackageStorageFile({ localDiagnosticStorageFile: "C:\\runtime\\storage.json" }),
    /requires NEA_DEMO_LOCAL_STORAGE_GROUP_ID/,
  );
  assert.throws(
    () => resolveRuntimePackageStorageFile({ localDiagnosticGroupId: "local-probe" }),
    /is required for a local diagnostic storage group/,
  );
  assert.throws(
    () => resolveRuntimePackageStorageFile({
      localDiagnosticGroupId: "local-probe",
      localDiagnosticStorageFile: "relative/storage.json",
    }),
    /must be an absolute path/,
  );
  assert.equal(resolveRuntimePackageStorageFile({
    localDiagnosticGroupId: "local-probe",
    localDiagnosticStorageFile: "C:\\runtime\\storage.json",
  }), "C:\\runtime\\storage.json");
});
