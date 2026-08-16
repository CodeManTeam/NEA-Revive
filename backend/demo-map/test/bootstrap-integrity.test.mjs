import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { verifyProjectBootstrapFile, verifyProjectBootstrapProtocol } from "../src/bootstrap-integrity.mjs";

test("verifies the recovered project bootstrap manifest and bytes", () => {
  const bytes = Buffer.from('{"meshHashes":[]}\n');
  const manifest = {
    format: "nea-recovered-project-bootstrap-manifest",
    version: 1,
    file: { name: "bootstrap.json", bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") },
  };
  assert.deepEqual(verifyProjectBootstrapFile(manifest, bytes), manifest.file);
  assert.throws(() => verifyProjectBootstrapFile(manifest, Buffer.alloc(bytes.byteLength, 0)), /hash mismatch/);
});

test("rejects bootstrap path-shaped names and invalid metadata", () => {
  const manifest = { format: "nea-recovered-project-bootstrap-manifest", version: 1, file: { name: "../bootstrap.json", bytes: 0, sha256: "0".repeat(64) } };
  assert.throws(() => verifyProjectBootstrapFile(manifest, Buffer.alloc(0)), /file name is invalid/);
  assert.throws(() => verifyProjectBootstrapFile({ ...manifest, file: { ...manifest.file, name: "bootstrap.json", bytes: 1 } }, Buffer.alloc(0)), /byte length mismatch/);
});

test("verifies the preserved bootstrap protocol identity before runtime startup", () => {
  const bytes = Buffer.from(JSON.stringify({
    format: "nea-recovered-project-bootstrap",
    version: 2,
    sourceMessages: [
      "models.appendMeshHashes",
      "models.appendSkinHashes",
      "models.appendSkinPartHashes",
      "sound.resetDictionary",
      "gameNet.syncClientScriptModules",
      "gameTerrain.reset",
      "models.appendSkinPartHashes",
    ],
  }));
  assert.equal(verifyProjectBootstrapProtocol(bytes).version, 2);
  assert.throws(() => verifyProjectBootstrapProtocol(Buffer.from(bytes.toString("utf8").replace("sound.resetDictionary", "sound.reset"))), /protocol identity/);
});
