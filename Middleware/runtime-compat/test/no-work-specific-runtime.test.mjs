import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");

test("unified Runtime and conformance code contain no private work branches", async () => {
  const paths = [
    "Frontend/demo-map/src/runtime/script-runtime.mjs",
    "Frontend/demo-map/src/runtime/game-voxels.mjs",
    "Backend/local-player/src/block-info.mjs",
    "Middleware/runtime-compat/conformance/client-remote-channel.mjs",
    "Middleware/runtime-compat/conformance/client-ui-tree.mjs",
    "Middleware/runtime-compat/tools/build-script-corpus-gap-report.mjs",
    "Middleware/runtime-compat/tools/build-capability-gate-audit.mjs",
    "Evidence/preservation-dump/build-editor-runtime-package.mjs",
  ];
  for (const path of paths) {
    const source = await readFile(resolve(repositoryRoot, path), "utf8");
    assert.doesNotMatch(source, /bedwars|parkour|\u8d77\u5e8a\u6218\u4e89|\u8dd1\u9177/i, `${path} contains a work-specific branch`);
  }
});

test("Demo disables legacy gameplay adapters while retaining the generic bridge", async () => {
  const demoServer = await readFile(resolve(repositoryRoot, "Frontend/demo-map/src/server.mjs"), "utf8");
  const backend = await readFile(resolve(repositoryRoot, "Backend/local-player/backend/box3-server.cjs"), "utf8");
  assert.match(demoServer, /BOX3_DISABLE_LEGACY_GAMEPLAY: "1"/);
  assert.match(demoServer, /const blockCatalog = await loadPreservedBlockCatalog\(assetRoot, worldManifestName\)/);
  assert.match(demoServer, /ScriptRuntime\.load\(buildRoot, \{[\s\S]*blockCatalog,/);
  assert.doesNotMatch(demoServer, /BOX3_ENABLE_REMOTE_SESSIONS: "1"/);
  assert.match(backend, /const legacyGameplayDisabled = process\.env\.BOX3_DISABLE_LEGACY_GAMEPLAY === "1"/);
  assert.match(backend, /\[remote-channel:event\]/);
});
