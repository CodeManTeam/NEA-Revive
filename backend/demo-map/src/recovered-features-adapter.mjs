import { preflightRecoveredCoreField } from "./recovered-core-field-preflight.mjs";

export function preserveRecoveredFeatures(value) {
  const preflight = preflightRecoveredCoreField("features", value);
  if (preflight.status === "evidence-blocked") {
    const error = new Error("Recovered feature preservation is blocked by an incompatible descriptor");
    error.code = "evidence-blocked";
    error.diagnostics = preflight.diagnostics;
    throw error;
  }
  return Object.freeze({
    formatVersion: "nea-recovered-features/v1",
    compatibility: "partial",
    source: "recovered-project",
    fields: Object.freeze({ enableTriggerAPI: value.enableTriggerAPI }),
    diagnostics: Object.freeze([
      {
        field: "features",
        code: "runtime-consumption-unverified",
        message: "Recovered feature flags are preserved without claiming native runtime consumption",
      },
    ]),
  });
}
