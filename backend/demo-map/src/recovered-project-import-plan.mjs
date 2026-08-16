import { preflightRecoveredProject } from "./recovered-project-preflight.mjs";
import { normalizeRecoveredEntityPlacement } from "./recovered-entity-placement.mjs";
import { normalizeWorldSpawnWithinShape } from "./world-spawn.mjs";

const FIELD_TARGETS = Object.freeze({
  voxels: ["world.shape", "world.terrain"],
  entitiesTree: ["world.entities"],
  physics: ["world.physics"],
  uiTree: ["client-ui.uiTree"],
  environment: ["world.environment"],
  features: ["world.features"],
  player: ["world.spawn"],
});

export function buildRecoveredProjectImportPlan(project, options = {}) {
  const preflight = preflightRecoveredProject(project);
  const terrain = validateTerrain(options.terrain);
  const mappings = preflight.fields.map(field => mapField(field, project, terrain));
  const diagnostics = [...preflight.diagnostics, ...terrain.diagnostics, ...mappings.flatMap(mapping => mapping.blockers ?? [])];
  if (terrain.value === null) diagnostics.push(diagnostic("terrain-conversion-required", "Recovered voxel chunks must be converted before package admission"));
  return Object.freeze({
    format: "nea-recovered-project-import-plan",
    version: 1,
    status: "evidence-blocked",
    conversion: "not-attempted",
    canWritePackage: false,
    mappings: Object.freeze(mappings),
    unsupportedFields: Object.freeze(mappings.filter(mapping => mapping.ready !== true).map(mapping => mapping.source)),
    diagnostics: Object.freeze(diagnostics),
  });
}

function mapField(field, project, terrain) {
  const targets = FIELD_TARGETS[field.name];
  if (field.name === "player") return mapPlayerInitialPosition(project, targets);
  if (field.name === "entitiesTree" && field.status === "partial") return mapEntityPlacements(project, targets);
  if (field.name === "uiTree" && field.status === "partial") return mapUiTreeContainer(project, targets);
  if (field.name === "physics" && field.status === "partial") return mapPhysicsBindings(targets);
  if (["environment", "features"].includes(field.name) && field.status === "partial") return mapPreservationOnlyField(field, project, targets);
  if (field.name !== "voxels") {
    const targetBlockers = targets.length === 0
      ? [fieldDiagnostic(field.name, "target-format-unavailable", "The public import format has no target field for this recovered descriptor field")]
      : [];
    const blockers = [...field.diagnostics, ...targetBlockers];
    return mapping(
      field.name,
      targets,
      field.status,
      targetBlockers.length > 0 ? "target-format-unavailable" : field.diagnostics[0]?.code ?? "value-encoding-unverified",
      false,
      blockers,
    );
  }
  if (field.status !== "partial") return mapping(field.name, targets, "evidence-blocked", field.diagnostics[0]?.code ?? "value-encoding-unverified");
  if (terrain.value === null) {
    return mapping(field.name, targets, "evidence-blocked", "terrain-conversion-required", false, [
      diagnostic("terrain-conversion-required", "Recovered voxel chunks must be converted before package admission"),
    ]);
  }
  return Object.freeze({
    source: field.name,
    targets: Object.freeze(targets),
    status: "partial",
    ready: true,
    verified: Object.freeze({ shape: project.voxels.shape, terrainFormat: terrain.value.formatVersion }),
  });
}

function mapPhysicsBindings(targets) {
  return Object.freeze({
    source: "physics",
    targets: Object.freeze(targets),
    status: "partial",
    reason: "use-obb-semantics-unverified",
    ready: false,
    verified: Object.freeze({ bindings: Object.freeze(["gravity -> world.physics.gravity", "velocityDamping -> world.physics.airFriction"]) }),
    blockers: Object.freeze([
      fieldDiagnostic("physics", "use-obb-semantics-unverified", "Recovered physics.useOBB has no evidenced public runtime projection"),
    ]),
  });
}

function mapPreservationOnlyField(field, project, targets) {
  return Object.freeze({
    source: field.name,
    targets: Object.freeze(targets),
    status: "partial",
    reason: "runtime-consumption-unverified",
    ready: false,
    verified: Object.freeze({ fieldCount: Object.keys(project[field.name]).length }),
    blockers: Object.freeze([
      fieldDiagnostic(field.name, "runtime-consumption-unverified", `Recovered ${field.name} values are preserved at ${targets[0]} without claiming native runtime consumption`),
    ]),
  });
}

function mapEntityPlacements(project, targets) {
  const entityNodes = Object.values(project.entitiesTree)
    .filter(node => node?.type === 1 && node.value);
  if (entityNodes.length === 0) {
    return mapping("entitiesTree", targets, "evidence-blocked", "entity-placement-unavailable", false, [
      fieldDiagnostic("entitiesTree", "entity-placement-unavailable", "Recovered entity tree contains no type-1 nodes with values to map"),
    ]);
  }
  try {
    for (const node of entityNodes) normalizeRecoveredEntityPlacement(node.value.position);
    return Object.freeze({
      source: "entitiesTree",
      targets: Object.freeze(targets),
      status: "partial",
      reason: "other-entity-values-unverified",
      ready: false,
      verified: Object.freeze({ placementCount: entityNodes.length }),
      blockers: Object.freeze([
        fieldDiagnostic("entitiesTree", "other-entity-values-unverified", "Recovered type-1 entity positions map to world.entities, but other entity value semantics remain unverified"),
      ]),
    });
  } catch (error) {
    return mapping("entitiesTree", targets, "evidence-blocked", "entity-placement-invalid", false, [
      fieldDiagnostic("entitiesTree", "entity-placement-invalid", error.message),
    ]);
  }
}

function mapUiTreeContainer(project, targets) {
  return Object.freeze({
    source: "uiTree",
    targets: Object.freeze(targets),
    status: "partial",
    reason: "ui-value-semantics-unverified",
    ready: false,
    verified: Object.freeze({ nodeCount: Object.keys(project.uiTree).length }),
    blockers: Object.freeze([
      fieldDiagnostic("uiTree", "ui-value-semantics-unverified", "Recovered UI tree container maps to client-ui.uiTree, but UI value semantics remain unverified"),
    ]),
  });
}

function mapPlayerInitialPosition(project, targets) {
  try {
    const shape = [project.voxels?.shape?.x, project.voxels?.shape?.y, project.voxels?.shape?.z];
    const initialPosition = normalizeWorldSpawnWithinShape(project.player?.initialPosition, shape);
    return Object.freeze({
      source: "player",
      targets: Object.freeze(targets),
      status: "partial",
      reason: "other-player-values-unverified",
      ready: false,
      verified: Object.freeze({ initialPosition }),
      blockers: Object.freeze([
        fieldDiagnostic("player", "other-player-values-unverified", "Recovered player.initialPosition maps to world.spawn, but other Player value semantics remain unverified"),
      ]),
    });
  } catch (error) {
    return mapping("player", targets, "evidence-blocked", "initial-position-invalid", false, [
      fieldDiagnostic("player", "initial-position-invalid", error.message),
    ]);
  }
}

function mapping(source, targets, status, reason, ready = false, blockers = []) {
  const result = { source, targets: Object.freeze(targets), status, reason, ready };
  if (!ready) result.blockers = Object.freeze(blockers);
  return Object.freeze(result);
}

function validateTerrain(value) {
  if (value === undefined) return { value: null, diagnostics: [] };
  if (!isRecord(value) || value.formatVersion !== "nea-terrain/v1" || !Array.isArray(value.voxels)) {
    return { value: null, diagnostics: [diagnostic("invalid-terrain-conversion", "Terrain input must be a nea-terrain/v1 object with a voxels array")] };
  }
  return { value, diagnostics: [] };
}

function diagnostic(code, message) {
  return Object.freeze({ field: "voxels", code, message });
}

function fieldDiagnostic(field, code, message) {
  return Object.freeze({ field, code, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
