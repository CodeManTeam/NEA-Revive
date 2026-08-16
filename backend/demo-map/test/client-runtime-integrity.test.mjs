import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyClientRuntimeAssets } from "../src/client-runtime-integrity.mjs";

test("verifies every declared client runtime asset before template reuse", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-client-runtime-"));
  const bytes = Buffer.from("console.log('runtime');\n");
  await writeFile(join(root, "runtime.js"), bytes);
  const manifest = runtimeManifest({ file: "runtime.js", bytes: bytes.byteLength, sha256: hash(bytes) });
  assert.deepEqual(await verifyClientRuntimeAssets(root, manifest), { assets: 1 });
  await writeFile(join(root, "runtime.js"), Buffer.alloc(bytes.byteLength, 0));
  await assert.rejects(() => verifyClientRuntimeAssets(root, manifest), /hash mismatch/);
});

test("rejects duplicated and traversal-shaped client runtime asset metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-client-runtime-"));
  const entry = { file: "runtime.js", bytes: 0, sha256: hash(Buffer.alloc(0)) };
  await writeFile(join(root, entry.file), Buffer.alloc(0));
  await assert.rejects(() => verifyClientRuntimeAssets(root, runtimeManifest(entry, entry)), /duplicated/);
  await assert.rejects(() => verifyClientRuntimeAssets(root, runtimeManifest({ ...entry, file: "../runtime.js" })), /escapes its package root/);
});

function runtimeManifest(...files) {
  return { format: "nea-recovered-client-runtime", version: 1, files };
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
