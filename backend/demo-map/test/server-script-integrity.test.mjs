import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyServerScriptModules } from "../src/server-script-integrity.mjs";

test("server script integrity verifier admits the declared entry module set", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-server-script-"));
  try {
    await writeFile(join(root, "entry.js"), "require('./helper.js');\n");
    await writeFile(join(root, "helper.js"), "module.exports = 1;\n");
    const modules = await verifyServerScriptModules(root, { entry: "entry.js", modules: ["entry.js", "helper.js"] });
    assert.deepEqual(modules.map(module => [module.side, module.name]), [["server", "entry.js"], ["server", "helper.js"]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("server script integrity verifier rejects absent entry duplicate and unsafe modules", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-server-script-"));
  try {
    await assert.rejects(() => verifyServerScriptModules(root, { entry: "entry.js", modules: ["helper.js"] }), /include the entry/);
    await assert.rejects(() => verifyServerScriptModules(root, { entry: "entry.js", modules: ["entry.js", "entry.js"] }), /duplicated/);
    await assert.rejects(() => verifyServerScriptModules(root, { entry: "entry.js", modules: ["../entry.js"] }), /include the entry|server module/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
