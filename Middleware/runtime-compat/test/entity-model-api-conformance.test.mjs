import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityModelApiConformance } from "../conformance/entity-model-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");
const backendSource = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

test("RuntimeEntity model properties preserve recovered defaults and ranges", () => {
  const entity = createRuntimeEntity({ id: "model-api" });
  assert.equal(entity.meshInvisible, false);
  assert.deepEqual(entity.meshScale.toArray(), [1 / 64, 1 / 64, 1 / 64]);
  assert.deepEqual(entity.meshOffset.toArray(), [0, 0, 0]);
  assert.deepEqual([entity.meshColor.r, entity.meshColor.g, entity.meshColor.b, entity.meshColor.a], [1, 1, 1, 1]);
  entity.meshScale = [2, 3, 4];
  entity.meshOffset = [-1, 0, 1];
  entity.meshColor = [0.25, 0.5, 0.75, 1];
  entity.meshEmissive = 0.5;
  assert.deepEqual(entity.meshScale.toArray(), [2, 3, 4]);
  assert.throws(() => { entity.meshMetalness = 2; }, /between 0 and 1/);
});

test("model updates preserve mesh identity and cross only whole-property state", () => {
  assert.match(runtimeSource, /model: runtimeEntityModelPayload\(entity\)/);
  assert.match(backendSource, /runtime entity model meshId cannot be changed/);
  assert.match(backendSource, /transform\.model === void 0 \? entity\.replica\.model/);
  assert.equal(entityModelApiConformance.dynamicMeshSwap, false);
  assert.equal(entityModelApiConformance.anchorOffset, "evidence-blocked");
  assert.equal(entityModelApiConformance.status, "partial");
});
