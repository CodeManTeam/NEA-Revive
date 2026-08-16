import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { importMapProject } from "../../../Frontend/demo-map/src/import-project.mjs";
import { ScriptRuntime } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const archiveRoot = resolve(repositoryRoot, "Backend", "local-player", "archive");
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");

test("manifest-bound group storage reaches the Server Script Runtime", async () => {
  const sourceRoot = await mkdtemp(join(tmpdir(), "nea-group-storage-source-"));
  const source = join(sourceRoot, "project");
  const output = join(await mkdtemp(join(tmpdir(), "nea-group-storage-runtime-")), "project");
  await cp(resolve(repositoryRoot, "Frontend", "demo-map", "project"), source, { recursive: true });

  const manifestPath = join(source, "nea.map.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.runtime.groupId = "group-7";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(join(source, "scripts", "server.js"), `
world.onTick(async () => {
  const shared = storage.getGroupStorage("shared");
  await shared.set("score", 7);
  const value = await shared.get("score");
  world.say(["group", value.value].join(":"));
});
`, "utf8");

  await importMapProject(source, output);
  const errors = [];
  const runtime = await ScriptRuntime.load(output, {
    blockCatalog,
    logger: { info() {}, warn() {}, error(error) { errors.push(String(error)); } },
  });
  await runtime.start();
  runtime.tick();
  await new Promise(resolve => setTimeout(resolve, 25));
  const messages = runtime.snapshot().messages.map(message => message.text);
  runtime.stop();

  assert.deepEqual(errors, []);
  assert.ok(messages.includes("group:7"), messages.join(" | "));
});
