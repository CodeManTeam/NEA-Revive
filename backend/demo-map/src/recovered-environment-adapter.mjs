import { preflightRecoveredCoreField } from "./recovered-core-field-preflight.mjs";

export function preserveRecoveredEnvironment(value) {
  const preflight = preflightRecoveredCoreField("environment", value);
  if (preflight.status === "evidence-blocked") {
    const error = new Error("Recovered environment preservation is blocked by an incompatible descriptor");
    error.code = "evidence-blocked";
    error.diagnostics = preflight.diagnostics;
    throw error;
  }
  return Object.freeze({
    formatVersion: "nea-recovered-environment/v1",
    compatibility: "partial",
    source: "recovered-project",
    fields: cloneRecord(value),
    diagnostics: Object.freeze([
      {
        field: "environment",
        code: "runtime-consumption-unverified",
        message: "Recovered environment values are preserved without claiming native runtime consumption",
      },
    ]),
  });
}

function cloneRecord(value) {
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)])));
}

function cloneValue(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneValue));
  if (value !== null && typeof value === "object") return cloneRecord(value);
  return value;
}
