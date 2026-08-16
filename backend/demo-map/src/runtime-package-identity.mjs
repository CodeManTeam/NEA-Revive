export function verifyRuntimePackageIdentity({ runtimePackage, projectManifest, clientRuntimeManifest }) {
  requireRecord(runtimePackage, "runtime package");
  requireRecord(projectManifest, "project manifest");
  requireRecord(clientRuntimeManifest, "client runtime manifest");
  if (projectManifest.packageId !== runtimePackage.packageId) {
    throw new Error("Runtime package packageId does not match project manifest");
  }
  if (clientRuntimeManifest.gameName !== runtimePackage.packageId) {
    throw new Error("Client runtime gameName does not match runtime package packageId");
  }
  if (clientRuntimeManifest.pagePath !== `/p/${runtimePackage.packageId}`) {
    throw new Error("Client runtime pagePath does not match runtime package packageId");
  }
  if (clientRuntimeManifest.contentId !== runtimePackage.contentId) {
    throw new Error("Client runtime contentId does not match runtime package contentId");
  }
  return Object.freeze({ packageId: runtimePackage.packageId, contentId: runtimePackage.contentId });
}

function requireRecord(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${field}`);
}
