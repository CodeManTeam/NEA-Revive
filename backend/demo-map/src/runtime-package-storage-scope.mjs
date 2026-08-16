const MAX_STORAGE_GROUP_ID_LENGTH = 256;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function resolveRuntimePackageStorageScope({
  allowBlockedPackageDiagnostic,
  declaredGroupId,
  localDiagnosticGroupId,
}) {
  const declared = normalizeOptionalGroupId(declaredGroupId, "runtime package storage.groupId");
  const local = normalizeOptionalGroupId(localDiagnosticGroupId, "NEA_DEMO_LOCAL_STORAGE_GROUP_ID");
  if (local === null) return Object.freeze({ groupId: declared });
  if (!allowBlockedPackageDiagnostic) {
    throw new Error("NEA_DEMO_LOCAL_STORAGE_GROUP_ID requires NEA_DEMO_ALLOW_BLOCKED_PACKAGE_DIAGNOSTIC=1");
  }
  if (declared !== null && declared !== local) {
    throw new Error("NEA_DEMO_LOCAL_STORAGE_GROUP_ID cannot replace a declared runtime package storage.groupId");
  }
  return Object.freeze({ groupId: local });
}

export function resolveRuntimePackageStorageFile({ localDiagnosticGroupId, localDiagnosticStorageFile }) {
  if (localDiagnosticGroupId === undefined || localDiagnosticGroupId === null) {
    if (localDiagnosticStorageFile !== undefined) {
      throw new Error("NEA_DEMO_LOCAL_STORAGE_FILE requires NEA_DEMO_LOCAL_STORAGE_GROUP_ID");
    }
    return undefined;
  }
  if (typeof localDiagnosticStorageFile !== "string" || localDiagnosticStorageFile.length === 0) {
    throw new Error("NEA_DEMO_LOCAL_STORAGE_FILE is required for a local diagnostic storage group");
  }
  if (!/^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(localDiagnosticStorageFile)) {
    throw new Error("NEA_DEMO_LOCAL_STORAGE_FILE must be an absolute path outside the runtime package");
  }
  return localDiagnosticStorageFile;
}

function normalizeOptionalGroupId(value, label) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAX_STORAGE_GROUP_ID_LENGTH
    || value.trim() !== value
    || CONTROL_CHARACTERS.test(value)
  ) {
    throw new Error(`${label} must be a non-empty, trimmed string of at most ${MAX_STORAGE_GROUP_ID_LENGTH} characters without control characters`);
  }
  return value;
}
