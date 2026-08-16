import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { worldProjectIdentityConformance } from "../conformance/world-project-identity.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");
const importerSource = await readFile(new URL("../../../Frontend/demo-map/src/import-project.mjs", import.meta.url), "utf8");

test("world.projectName is bound to the launch-verified package display name", () => {
  assert.match(importerSource, /projectIdentity: \{ projectName: source\.manifest\.display\.name \}/);
  assert.match(runtimeSource, /projectName: project\.display\?\.name/);
  assert.match(runtimeSource, /WORLD_CONFIG_CAPABILITY_MEMBERS = new Set\(\["gravity", "airFriction", "fogColor", "projectName"\]\)/);
  assert.match(runtimeSource, /Object\.defineProperty\(world, "projectName", \{ value: this\.projectName, enumerable: true, writable: false/);
  assert.equal(worldProjectIdentityConformance.manifestBinding, "Capability Manifest v14 inputs.projectIdentity");
  assert.deepEqual(worldProjectIdentityConformance.excluded, ["GameWorld.url", "GameWorld.serverId"]);
});
