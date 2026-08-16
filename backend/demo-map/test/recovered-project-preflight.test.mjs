import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { preflightRecoveredProject } from "../src/recovered-project-preflight.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("keeps recovered project fields evidence-blocked when value encodings are unknown", () => {
  const result = preflightRecoveredProject({
    voxels: { shape: { x: 32, y: 64, z: 32 }, chunks: [] },
    entitiesTree: {
      "opaque-node": { id: "opaque-node", name: "Entity", type: 1, parentId: "", childrenIds: [], value: {} },
    },
    environment: { bakedShadow: {}, drawDistance: 512, fog: {}, rain: {}, sky: {}, snow: {} },
    physics: { gravity: -0.1, useOBB: false, velocityDamping: 0.01 },
    player: {},
    features: { enableTriggerAPI: false },
    uiTree: {
      "opaque-screen": { id: "opaque-screen", name: "Screen", type: 1, parentId: "", childrenIds: [], value: { type: "screen" } },
    },
  });
  assert.equal(result.status, "evidence-blocked");
  assert.equal(result.conversion, "not-attempted");
  assert.equal(result.fields.find(field => field.name === "voxels")?.status, "partial");
  assert.equal(result.fields.find(field => field.name === "entitiesTree")?.status, "partial");
  assert.equal(result.fields.find(field => field.name === "environment")?.status, "partial");
  assert.equal(result.fields.find(field => field.name === "physics")?.status, "partial");
  assert.equal(result.fields.find(field => field.name === "player")?.status, "evidence-blocked");
  assert.equal(result.fields.find(field => field.name === "features")?.status, "partial");
  assert.equal(result.fields.find(field => field.name === "uiTree")?.status, "partial");
  assert.ok(result.diagnostics.some(item => item.code === "chunk-encoding-unverified"));
  assert.ok(result.diagnostics.some(item => item.code === "entity-value-encoding-unverified"));
  assert.ok(result.diagnostics.some(item => item.field === "player" && item.code === "field-schema-mismatch"));
});

test("blocks descriptors that omit recovered core fields", () => {
  const result = preflightRecoveredProject({ voxels: { shape: { x: 32, y: 32, z: 32 } } });
  assert.equal(result.status, "evidence-blocked");
  assert.equal(result.fields.filter(field => field.status === "evidence-blocked").length, 6);
  assert.ok(result.diagnostics.every(item => item.field));
});

test("rejects non-object descriptors before inspecting fields", () => {
  assert.throws(() => preflightRecoveredProject(null), /must be an object/);
  assert.throws(() => preflightRecoveredProject([]), /must be an object/);
});

test("uses only the core fields confirmed by public project evidence", async () => {
  const evidence = JSON.parse(await readFile(resolve(repositoryRoot, "Middleware/runtime-compat/evidence/project-field-inventory.json"), "utf8"));
  const result = preflightRecoveredProject({});
  assert.deepEqual(result.fields.map(field => field.name), evidence.migrationReadiness.confirmedFieldPresence);
});
