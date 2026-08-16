import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRuntimeEntity } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { entityKindDiscriminatorConformance, entityTagApiConformance } from "../conformance/entity-tag-api.mjs";

const runtimeSource = await readFile(new URL("../../../Frontend/demo-map/src/runtime/script-runtime.mjs", import.meta.url), "utf8");

test("RuntimeEntity tag mutations match the recovered canonical method signatures", () => {
  const entity = createRuntimeEntity({ id: "tag-api", tags: ["initial"] });
  assert.equal(entity.hasTag("initial"), true);
  assert.equal(entity.addTag(7), undefined);
  assert.equal(entity.hasTag("7"), true);
  assert.equal(entity.removeTag(7), undefined);
  assert.equal(entity.hasTag("7"), false);
  assert.deepEqual(entityTagApiConformance.returns, { addTag: "void", removeTag: "void", hasTag: "boolean" });
  assert.match(entityTagApiConformance.excludedApi, /remains partial/);
});

test("RuntimePlayer exposes the same inherited canonical tag methods", () => {
  const playerStart = runtimeSource.indexOf("function createRuntimePlayer(runtime, input)");
  const playerEnd = runtimeSource.indexOf("export function isLiveChatEntity", playerStart);
  const playerSource = runtimeSource.slice(playerStart, playerEnd);
  for (const marker of ["addTag(tag) {", "removeTag(tag) {", "hasTag(tag) {"]) assert.match(playerSource, new RegExp(marker.replace(/[(){}]/g, "\\$&")));
});

test("RuntimeEntity and RuntimePlayer preserve the canonical isPlayer discriminator", () => {
  const entity = createRuntimeEntity({ id: "kind-entity" });
  assert.equal(entity.isPlayer, false);
  assert.deepEqual(entityKindDiscriminatorConformance.localBindings, { RuntimeEntity: false, RuntimePlayer: true });
  const playerStart = runtimeSource.indexOf("function createRuntimePlayer(runtime, input)");
  const playerEnd = runtimeSource.indexOf("export function isLiveChatEntity", playerStart);
  assert.match(runtimeSource.slice(playerStart, playerEnd), /get isPlayer\(\) \{ return true; \}/);
});
