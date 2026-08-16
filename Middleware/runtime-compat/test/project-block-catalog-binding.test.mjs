import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const backend = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");
const demoServer = await readFile(new URL("../../../Frontend/demo-map/src/server.mjs", import.meta.url), "utf8");

test("project-package Player launches bind the verified world BlockInfo catalog", () => {
  assert.match(demoServer, /loadPreservedBlockCatalogMetadata/);
  assert.match(demoServer, /BOX3_PROJECT_BLOCK_INFO: blockCatalogMetadata\.contentAddress/);
  assert.match(demoServer, /BOX3_PROJECT_RESET_COUNTER: String\(blockCatalogMetadata\.resetCounter\)/);
  assert.match(demoServer, /BOX3_PROJECT_INNER_AO: String\(blockCatalogMetadata\.innerAO\)/);
  assert.match(backend, /const projectBlockInfo = process\.env\.BOX3_PROJECT_BLOCK_INFO/);
  assert.match(backend, /const projectResetCounter = optionalProjectResetCounter\(process\.env\.BOX3_PROJECT_RESET_COUNTER\)/);
  assert.match(backend, /const projectInnerAO = optionalProjectInnerAO\(process\.env\.BOX3_PROJECT_INNER_AO\)/);
  assert.match(backend, /BOX3_PROJECT_BLOCK_INFO requires BOX3_PROJECT_ROOT/);
  assert.match(backend, /resetCounter: projectResetCounter/);
  assert.match(backend, /innerAO: projectInnerAO/);
});
