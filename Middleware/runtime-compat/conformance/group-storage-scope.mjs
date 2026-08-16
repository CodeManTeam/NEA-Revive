import { normalizeCapabilityStorageScope } from "../../../Frontend/demo-map/src/capability-input-normalize.mjs";

export const groupStorageScopeContract = Object.freeze({
  historicalIdentitySource: "script-protocol.start.groupId",
  disabledIdentity: "",
  packagePath: "dao3.project.json.storage.groupId",
  manifestInput: "inputs.storageScope",
  localNamespace: "group:${groupId}:${storageKey}",
  defaultLaunchState: "blocked",
  configuredLaunchState: "partial",
});

export function resolveGroupStorageScope(value) {
  return Object.freeze(normalizeCapabilityStorageScope(value));
}
