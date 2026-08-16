import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { preflightRecoveredUiTree } from "../src/recovered-ui-tree-preflight.mjs";

test("recognizes the observed UI tree container while keeping UI values partial", () => {
  const result = preflightRecoveredUiTree({
    "opaque-screen": { id: "opaque-screen", name: "Screen", type: 1, parentId: "", childrenIds: [], value: { type: "screen" } },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.nodeCount, 1);
  assert.equal(result.diagnostics[0].code, "ui-value-encoding-unverified");
});

test("blocks malformed UI tree nodes", () => {
  assert.equal(preflightRecoveredUiTree({ node: { id: "node", value: {} } }).status, "evidence-blocked");
});

test("public Player bundle confirms the UI tree schema names", async () => {
  const bundle = await readFile(new URL("../../../Backend/local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js", import.meta.url), "utf8");

  assert.match(bundle, /UITreeRDA/);
  assert.match(bundle, /UINodeRDA/);
});
