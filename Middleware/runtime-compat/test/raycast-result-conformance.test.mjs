import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { createRaycastResultFixture } from "../conformance/raycast-result.mjs";

test("RuntimeRaycastResult exposes the recovered field shape and local voxel alias", () => {
  const entity = { id: "target" };
  const result = createRaycastResultFixture({ hit: true, hitEntity: entity, hitVoxel: 7, distance: 4 });

  assert.ok(result instanceof RuntimeRaycastResult);
  assert.equal(result.hit, true);
  assert.equal(result.hitEntity, entity);
  assert.equal(result.hitVoxel, 7);
  assert.equal(result.voxel, 7);
  assert.equal(result.distance, 4);
  for (const field of ["origin", "direction", "hitPosition", "normal", "voxelIndex"]) assert.ok(result[field]);
});

test("Capability Manifest propagates raycast result and hit entity owners", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      const result = world.raycast({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
      result.hit;
      result.distance;
      result.voxelIndex;
      const target = result.hitEntity;
      if (target) target.hurt(1);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.entities", "server.world.events"],
    clientCapabilities: [],
    assets: [],
    entities: [],
    uiState: null,
  });

  assert.equal(manifest.summary.blocked, 0);
  for (const member of ["hit", "distance", "voxelIndex", "hitEntity"]) {
    const requirement = manifest.requirements.find(item => item.usage === `result.${member}`);
    assert.equal(requirement?.owner, "GameRaycastResult");
    assert.equal(requirement?.state, "partial");
  }
  const hurt = manifest.requirements.find(item => item.usage === "target.hurt");
  assert.equal(hurt?.owner, "GameEntity");
  assert.equal(hurt?.state, "partial");
});
