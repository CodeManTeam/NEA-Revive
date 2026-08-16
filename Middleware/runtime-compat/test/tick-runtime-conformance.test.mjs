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

test("Server Script Runtime dispatches canonical tick fields and filtered nextTick", async () => {
  const sourceRoot = await mkdtemp(join(tmpdir(), "nea-tick-source-"));
  const source = join(sourceRoot, "project");
  const output = join(await mkdtemp(join(tmpdir(), "nea-tick-runtime-")), "project");
  await cp(resolve(repositoryRoot, "Frontend", "demo-map", "project"), source, { recursive: true });
  await writeFile(join(source, "scripts", "server.js"), `
world.onTick(event => {
  world.say(["tick", event.tick, event.prevTick, event.skip, event.elapsedTimeMS].join(":"));
});
world.nextTick(event => event.tick === 2).then(event => {
  world.say(["next", event.tick, event.prevTick, event.skip].join(":"));
});
`, "utf8");
  await importMapProject(source, output);
  const runtime = await ScriptRuntime.load(output, {
    blockCatalog,
    logger: { info() {}, warn() {}, error() {} },
  });
  await runtime.start();
  runtime.tick();
  runtime.tick();
  await Promise.resolve();
  const messages = runtime.snapshot().messages.map(message => message.text);
  runtime.stop();

  assert.ok(messages.some(message => message.startsWith("tick:1:0:false:")));
  assert.ok(messages.some(message => message.startsWith("tick:2:1:false:")));
  assert.ok(messages.includes("next:2:1:false"));
});
