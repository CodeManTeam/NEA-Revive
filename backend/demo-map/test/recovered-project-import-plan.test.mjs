import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveredProjectImportPlan } from "../src/recovered-project-import-plan.mjs";

test("maps only evidenced voxel shape and converted terrain while blocking unknown fields", () => {
  const plan = buildRecoveredProjectImportPlan(project(), {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.equal(plan.status, "evidence-blocked");
  assert.equal(plan.canWritePackage, false);
  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "voxels"), {
    source: "voxels",
    targets: ["world.shape", "world.terrain"],
    status: "partial",
    ready: true,
    verified: { shape: { x: 32, y: 32, z: 32 }, terrainFormat: "nea-terrain/v1" },
  });
  assert.deepEqual(plan.unsupportedFields, ["entitiesTree", "environment", "physics", "player", "features", "uiTree"]);
  assert.deepEqual(
    plan.mappings.find(mapping => mapping.source === "player")?.blockers,
    [
      { field: "player", code: "initial-position-invalid", message: "World spawn must be a finite three-dimensional vector" },
    ],
  );
  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "player")?.targets, ["world.spawn"]);
  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "environment")?.targets, ["world.environment"]);
  assert.notEqual(plan.mappings.find(mapping => mapping.source === "environment")?.reason, "target-format-unavailable");
});

test("reports the recovered Player initialPosition as a bounded partial world spawn mapping", () => {
  const source = project();
  source.player = { initialPosition: { x: 1, y: 2, z: 3 }, walkSpeed: 0.25 };

  const plan = buildRecoveredProjectImportPlan(source, {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "player"), {
    source: "player",
    targets: ["world.spawn"],
    status: "partial",
    reason: "other-player-values-unverified",
    ready: false,
    verified: { initialPosition: [1, 2, 3] },
    blockers: [{ field: "player", code: "other-player-values-unverified", message: "Recovered player.initialPosition maps to world.spawn, but other Player value semantics remain unverified" }],
  });
  assert.equal(plan.canWritePackage, false);
});

test("reports only validated type-1 entity positions as partial package placements", () => {
  const source = project();
  source.entitiesTree = {
    "entity-1": { id: "entity-1", name: "Entity", type: 1, parentId: "", childrenIds: [], value: { position: { x: 4, y: 5, z: 6 }, mesh: "unknown" } },
    "folder-1": { id: "folder-1", name: "Folder", type: 2, parentId: "", childrenIds: [], value: {} },
  };

  const plan = buildRecoveredProjectImportPlan(source, {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "entitiesTree"), {
    source: "entitiesTree",
    targets: ["world.entities"],
    status: "partial",
    reason: "other-entity-values-unverified",
    ready: false,
    verified: { placementCount: 1 },
    blockers: [{ field: "entitiesTree", code: "other-entity-values-unverified", message: "Recovered type-1 entity positions map to world.entities, but other entity value semantics remain unverified" }],
  });
  assert.equal(plan.canWritePackage, false);
});

test("reports the recovered UI tree container without claiming UI value semantics", () => {
  const source = project();
  source.uiTree = {
    ROOT_ID: { id: "ROOT_ID", name: "Root", type: 0, parentId: "", childrenIds: ["screen"], value: {} },
    screen: { id: "screen", name: "Screen", type: 1, parentId: "ROOT_ID", childrenIds: [], value: { type: "screen" } },
  };

  const plan = buildRecoveredProjectImportPlan(source, {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "uiTree"), {
    source: "uiTree",
    targets: ["client-ui.uiTree"],
    status: "partial",
    reason: "ui-value-semantics-unverified",
    ready: false,
    verified: { nodeCount: 2 },
    blockers: [{ field: "uiTree", code: "ui-value-semantics-unverified", message: "Recovered UI tree container maps to client-ui.uiTree, but UI value semantics remain unverified" }],
  });
  assert.equal(plan.canWritePackage, false);
});

test("reports recovered environment and features as preservation-only package targets", () => {
  const source = project();
  source.environment = {
    bakedShadow: { enabled: true },
    drawDistance: 128,
    fog: { density: 0.1 },
    rain: { enabled: false },
    sky: { color: [0.2, 0.3, 0.4] },
    snow: { enabled: false },
  };
  source.features = { enableTriggerAPI: true };

  const plan = buildRecoveredProjectImportPlan(source, {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "environment"), {
    source: "environment",
    targets: ["world.environment"],
    status: "partial",
    reason: "runtime-consumption-unverified",
    ready: false,
    verified: { fieldCount: 6 },
    blockers: [{ field: "environment", code: "runtime-consumption-unverified", message: "Recovered environment values are preserved at world.environment without claiming native runtime consumption" }],
  });
  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "features"), {
    source: "features",
    targets: ["world.features"],
    status: "partial",
    reason: "runtime-consumption-unverified",
    ready: false,
    verified: { fieldCount: 1 },
    blockers: [{ field: "features", code: "runtime-consumption-unverified", message: "Recovered features values are preserved at world.features without claiming native runtime consumption" }],
  });
  assert.equal(plan.canWritePackage, false);
});

test("reports only the evidenced recovered physics bindings", () => {
  const source = project();
  source.physics = { gravity: -0.1, useOBB: false, velocityDamping: 0.01 };

  const plan = buildRecoveredProjectImportPlan(source, {
    terrain: { formatVersion: "nea-terrain/v1", voxels: [{ position: [0, 0, 0], blockId: 1 }] },
  });

  assert.deepEqual(plan.mappings.find(mapping => mapping.source === "physics"), {
    source: "physics",
    targets: ["world.physics"],
    status: "partial",
    reason: "use-obb-semantics-unverified",
    ready: false,
    verified: { bindings: ["gravity -> world.physics.gravity", "velocityDamping -> world.physics.airFriction"] },
    blockers: [{ field: "physics", code: "use-obb-semantics-unverified", message: "Recovered physics.useOBB has no evidenced public runtime projection" }],
  });
  assert.equal(plan.canWritePackage, false);
});

test("blocks recovered admission until terrain conversion is supplied", () => {
  const plan = buildRecoveredProjectImportPlan(project());

  assert.equal(plan.canWritePackage, false);
  assert.ok(plan.diagnostics.some(item => item.code === "terrain-conversion-required"));
  assert.ok(plan.diagnostics.some(item => item.code === "field-schema-mismatch" && item.field === "environment"));
  assert.equal(plan.mappings.find(mapping => mapping.source === "voxels")?.status, "evidence-blocked");
  assert.deepEqual(
    plan.mappings.find(mapping => mapping.source === "voxels")?.blockers,
    [{ field: "voxels", code: "terrain-conversion-required", message: "Recovered voxel chunks must be converted before package admission" }],
  );
});

test("rejects malformed terrain conversion input without relaxing field gates", () => {
  const plan = buildRecoveredProjectImportPlan(project(), { terrain: { formatVersion: "wrong", voxels: [] } });

  assert.equal(plan.canWritePackage, false);
  assert.ok(plan.diagnostics.some(item => item.code === "invalid-terrain-conversion"));
});

function project() {
  return {
    voxels: { shape: { x: 32, y: 32, z: 32 }, chunks: ["slot-000"] },
    entitiesTree: {},
    environment: {},
    physics: {},
    player: {},
    features: {},
    uiTree: {},
  };
}
