import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { preflightRecoveredEntitiesTree } from "../src/recovered-entity-tree-preflight.mjs";

test("recognizes the observed entity tree container while keeping value semantics partial", () => {
  const result = preflightRecoveredEntitiesTree({
    "opaque-node": { id: "opaque-node", name: "Entity", type: 1, parentId: "", childrenIds: [], value: { position: [0, 0, 0] } },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.nodeCount, 1);
  assert.deepEqual(result.observedNodeFields, ["id", "name", "type", "parentId", "childrenIds", "value"]);
  assert.equal(result.diagnostics[0].code, "entity-value-encoding-unverified");
});

test("blocks malformed entity tree containers", () => {
  const result = preflightRecoveredEntitiesTree({ node: { id: "node", value: {} } });

  assert.equal(result.status, "evidence-blocked");
  assert.equal(result.diagnostics[0].code, "invalid-entity-node-shape");
});

test("public Player bundle confirms the EntitySeed and EntitiesTree schema names", async () => {
  const bundle = await readFile(new URL("../../../Backend/local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js", import.meta.url), "utf8");

  assert.match(bundle, /EntitySeedRDA/);
  assert.match(bundle, /EntitiesTreeRDA=new .*MuRDATree\(t\.EntitySeedRDA\)/);
});
