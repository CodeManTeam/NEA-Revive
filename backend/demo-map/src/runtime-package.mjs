const PACKAGE_ID = /^[a-z][a-z0-9-]{0,63}$/;
const CONTENT_ID = /^\d{1,20}$/;
const ARCHIVE_JSON_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.json$/;

export function validateRuntimePackage(value) {
  const record = requireRecord(value, "runtime package");
  const packageId = requireString(record.packageId, "packageId");
  if (!PACKAGE_ID.test(packageId)) throw new Error("Invalid runtime package packageId");
  const contentId = requireString(record.contentId, "contentId");
  if (!CONTENT_ID.test(contentId)) throw new Error("Invalid runtime package contentId");
  const route = requireString(record.route, "route");
  if (route !== `/play/${packageId}`) throw new Error("Runtime package route must match packageId");
  return Object.freeze({
    ...record,
    packageId,
    contentId,
    route,
    projectRoot: requireString(record.projectRoot, "projectRoot"),
    archiveRoot: requireString(record.archiveRoot, "archiveRoot"),
    worldManifest: requireArchiveJsonPath(record.worldManifest, "worldManifest"),
    clientManifest: requireArchiveJsonPath(record.clientManifest, "clientManifest"),
    clientUiManifest: optionalArchiveJsonPath(record.clientUiManifest, "clientUiManifest"),
    clientRuntimeManifest: requireArchiveJsonPath(record.clientRuntimeManifest, "clientRuntimeManifest"),
    projectBootstrapManifest: requireArchiveJsonPath(record.projectBootstrapManifest, "projectBootstrapManifest"),
    playerProjectionDescriptor: optionalArchiveJsonPath(record.playerProjectionDescriptor, "playerProjectionDescriptor"),
  });
}

function requireArchiveJsonPath(value, field) {
  const path = requireString(value, field);
  if (!ARCHIVE_JSON_PATH.test(path) || path.includes("\\")) throw new Error(`Invalid runtime package ${field}`);
  return path;
}

function optionalArchiveJsonPath(value, field) {
  return value === null || value === undefined ? null : requireArchiveJsonPath(value, field);
}

function requireRecord(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid runtime package ${field}`);
  return value;
}
