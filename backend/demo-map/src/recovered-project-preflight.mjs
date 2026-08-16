const CORE_FIELDS = [
  "voxels",
  "entitiesTree",
  "environment",
  "physics",
  "player",
  "features",
  "uiTree",
];

import { preflightRecoveredEntitiesTree } from "./recovered-entity-tree-preflight.mjs";
import { preflightRecoveredCoreField } from "./recovered-core-field-preflight.mjs";
import { preflightRecoveredUiTree } from "./recovered-ui-tree-preflight.mjs";

export function preflightRecoveredProject(value) {
  if (!isRecord(value)) throw new TypeError("Recovered project descriptor must be an object");
  const fields = CORE_FIELDS.map(field => inspectField(field, value[field]));
  const status = fields.every(field => field.status === "partial") ? "partial" : "evidence-blocked";
  return Object.freeze({
    format: "nea-recovered-project-preflight",
    version: 1,
    status,
    conversion: "not-attempted",
    fields: Object.freeze(fields),
    diagnostics: Object.freeze(fields.flatMap(field => field.diagnostics)),
  });
}

function inspectField(name, value) {
  if (value === undefined) {
    return fieldResult(name, "evidence-blocked", "field-not-present", "Recovered descriptor does not contain this field");
  }
  if (name === "voxels") return inspectVoxels(value);
  if (name === "entitiesTree") {
    const result = preflightRecoveredEntitiesTree(value);
    return fieldResult(name, result.status, result.diagnostics[0]?.code ?? "entity-value-encoding-unverified", result.diagnostics[0]?.message ?? "Entity tree value encoding is not verified");
  }
  if (["environment", "features", "physics", "player"].includes(name)) {
    const result = preflightRecoveredCoreField(name, value);
    return fieldResult(name, result.status, result.diagnostics[0]?.code ?? "value-semantics-unverified", result.diagnostics[0]?.message ?? "Recovered core field value semantics are not verified");
  }
  if (name === "uiTree") {
    const result = preflightRecoveredUiTree(value);
    return fieldResult(name, result.status, result.diagnostics[0]?.code ?? "ui-value-encoding-unverified", result.diagnostics[0]?.message ?? "Recovered UI value encoding is not verified");
  }
  return fieldResult(name, "evidence-blocked", "value-encoding-unverified", "Field presence is evidenced, but its value encoding is not verified");
}

function inspectVoxels(value) {
  if (!isRecord(value)) return fieldResult("voxels", "evidence-blocked", "invalid-value-shape", "Voxel descriptor is not an object");
  const shape = value.shape;
  if (!isRecord(shape) || !["x", "y", "z"].every(axis => Number.isInteger(shape[axis]) && shape[axis] > 0)) {
    return fieldResult("voxels", "evidence-blocked", "shape-encoding-unverified", "Voxel shape does not match the verified numeric axis contract");
  }
  return fieldResult("voxels", "partial", "chunk-encoding-unverified", "Voxel bounds are readable, but chunk values are not mapped to nea-terrain/v1");
}

function fieldResult(name, status, code, message) {
  return Object.freeze({
    name,
    status,
    diagnostics: Object.freeze([{ field: name, code, message }]),
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
