import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityNameplateApiConformance } from "../conformance/entity-nameplate-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");
const backendSource = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

test("RuntimeEntity nameplate properties preserve recovered defaults and validation", () => {
  const entity = createRuntimeEntity({ id: "nameplate-api" });
  assert.equal(entity.showEntityName, false);
  assert.equal(entity.customName, "");
  assert.equal(entity.nameRadius, 16);
  assert.deepEqual([entity.nameColor.r, entity.nameColor.g, entity.nameColor.b], [1, 1, 1]);
  entity.showEntityName = true;
  entity.customName = "NPC";
  entity.nameRadius = 24;
  entity.nameColor = [0.25, 0.5, 0.75];
  assert.deepEqual([entity.showEntityName, entity.customName, entity.nameRadius], [true, "NPC", 24]);
  assert.deepEqual([entity.nameColor.r, entity.nameColor.g, entity.nameColor.b], [0.25, 0.5, 0.75]);
  assert.throws(() => { entity.nameRadius = -1; }, /between 0 and 4096/);
  assert.throws(() => { entity.nameColor = [2, 0, 0]; }, /between 0 and 1/);
});

test("nameplate state crosses creation and update paths with explicit deletion", () => {
  assert.match(runtimeSource, /nameplate: runtimeEntityNameplatePayload\(entity\)/);
  assert.match(backendSource, /transform\.nameplate === null \? \{\}/);
  assert.match(backendSource, /entity\.nameplate === null \|\| entity\.nameplate === void 0/);
  assert.deepEqual(entityNameplateApiConformance.protocol.fields, ["name", "radius", "color"]);
  assert.equal(entityNameplateApiConformance.status, "partial");
});
