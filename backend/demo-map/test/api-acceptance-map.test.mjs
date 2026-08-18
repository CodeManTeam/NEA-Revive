import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { importMapProject } from "../src/import-project.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";
import { loadPreservedBlockCatalog } from "../../local-player/src/block-info.mjs";

const root = resolve(import.meta.dirname, "../../..");
const sourceRoot = resolve(root, "packages/api-acceptance");
const buildRoot = resolve(root, ".build/api-acceptance-test-v2");
const assetRoot = resolve(root, "backend/local-player/archive");

test("DAO3 API acceptance map boots and returns no automatic failures", async () => {
  await importMapProject(sourceRoot, buildRoot);
  const blockCatalog = await loadPreservedBlockCatalog(assetRoot, "world-bedwars.json");
  const events = [];
  const runtime = await ScriptRuntime.load(buildRoot, {
    blockCatalog,
    sendClientEvent: (playerId, event) => events.push({ playerId, event }),
    logger: { info() {}, warn() {}, error() {} },
  });
  try {
    await runtime.start();
    runtime.addPlayer({ id: "acceptance-test-player", name: "Acceptance Test", position: [8, 3, 8] });
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
    const report = events.find(item => item.event?.type === "api-acceptance:report")?.event;
    assert.ok(report, "server must publish the acceptance report");
    assert.equal(report.results.filter(item => item.status === "FAIL").length, 0);
    assert.ok(report.results.filter(item => item.status === "PASS").length >= 13);
    assert.deepEqual(runtime.snapshot().worldPhysics.materials[343], {
      friction: 0.05,
      restitution: 0,
    });
    assert.deepEqual(runtime.snapshot().worldPhysics.materials[119], {
      friction: 1,
      restitution: 0.85,
    });
    assert.deepEqual(runtime.moduleExecutionSummary(), { declared: 1, loaded: 1, entryLoaded: true });
  } finally {
    runtime.stop();
  }
});
