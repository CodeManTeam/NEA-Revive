import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyClientScriptAssets } from "../src/client-script-integrity.mjs";

test("client script integrity verifier returns bytes only after manifest hash validation", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-client-script-"));
  const bytes = Buffer.from("module.exports = 1;\n");
  try {
    const manifestPath = join(root, "manifest.json");
    await writeFile(join(root, "client.js"), bytes);
    const manifest = { files: [{ name: "client.js", bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") }] };
    const modules = await verifyClientScriptAssets(manifestPath, manifest);
    assert.deepEqual(modules.map(module => [module.side, module.name, module.bytes.toString("utf8")]), [["client", "client.js", "module.exports = 1;\n"]]);
    await assert.rejects(() => verifyClientScriptAssets(manifestPath, { files: [{ ...manifest.files[0], sha256: "0".repeat(64) }] }), /does not match/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("client script integrity verifier rejects duplicate and unsafe entries", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-client-script-"));
  try {
    const manifestPath = join(root, "manifest.json");
    await assert.rejects(() => verifyClientScriptAssets(manifestPath, { files: [{ name: "client.js", bytes: 0, sha256: "0".repeat(64) }, { name: "client.js", bytes: 0, sha256: "0".repeat(64) }] }), /duplicated/);
    await assert.rejects(() => verifyClientScriptAssets(manifestPath, { files: [{ name: "../client.js", bytes: 0, sha256: "0".repeat(64) }] }), /client module/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
