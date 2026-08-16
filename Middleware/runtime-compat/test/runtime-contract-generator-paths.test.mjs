import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const generatorUrl = new URL("../tools/build-runtime-contracts.mjs", import.meta.url);
const generator = await readFile(generatorUrl, "utf8");

test("runtime contract generator uses current repository layer paths", async () => {
  const paths = [
    "../../../Backend/local-player/backend/box3-server.cjs",
    "../../../Backend/local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js",
    "../../../Evidence/origin/origin/origin/shell/ScriptShell.js",
    "../../../Frontend/demo-map/src/backend-event-bridge.mjs",
  ];
  await Promise.all(paths.map(path => access(new URL(path, import.meta.url))));
  assert.doesNotMatch(generator, /["']local-player\//);
  assert.doesNotMatch(generator, /["']origin\/origin\//);
  assert.match(generator, /const backendEventBridgePath = "Frontend\/demo-map\/src\/backend-event-bridge\.mjs"/);
});
