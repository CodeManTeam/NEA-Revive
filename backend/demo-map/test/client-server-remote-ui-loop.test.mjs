import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { decodeHistoricalClientEvent, encodeHistoricalServerEvent, HistoricalClientRemoteChannelFixture } from "../../../Middleware/runtime-compat/conformance/client-remote-channel.mjs";
import { importMapProject } from "../src/import-project.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";
import { createDemoClientRuntimeFixture } from "./support/demo-client-runtime-fixture.mjs";

const clientScript = await readFile(new URL("../project/scripts/client.js", import.meta.url), "utf8");
const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");

test("server remote event updates client UI and client input returns through the runtime", async () => {
  const source = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const output = join(await mkdtemp(join(tmpdir(), "nea-remote-ui-loop-")), "project");
  await importMapProject(source, output);

  let runtime;
  let player;
  const pendingClientEvents = [];
  const clientRemoteChannel = new HistoricalClientRemoteChannelFixture({
    getTick: () => runtime.currentTick,
    sendPacket: packet => {
      const decoded = decodeHistoricalClientEvent(packet);
      assert.ok(decoded);
      if (!player) {
        pendingClientEvents.push(decoded.event);
        return;
      }
      assert.equal(runtime.dispatchClientEvent(player.id, decoded.event), true);
    },
  });
  runtime = await ScriptRuntime.load(output, {
    blockCatalog,
    logger: { info() {}, warn() {}, error() {} },
    sendClientEvent: (_playerId, event) => clientRemoteChannel.receivePacket(encodeHistoricalServerEvent(runtime.currentTick, event)),
  });
  await runtime.start();

  const fixture = createDemoClientRuntimeFixture(
    event => clientRemoteChannel.sendServerEvent(event),
    clientRemoteChannel.events,
  );
  vm.runInNewContext(clientScript, fixture.context, { filename: "client.js" });
  clientRemoteChannel.start();
  player = runtime.addPlayer({ id: "remote-ui-player", name: "Guest", position: [32, 9, 38] });
  for (const event of pendingClientEvents.splice(0)) assert.equal(runtime.dispatchClientEvent(player.id, event), true);

  assert.ok(fixture.logs.some(message => message.includes("welcome received at server tick")));
  assert.match(fixture.status.textContent, /server: client ready acknowledged/);
  assert.ok(fixture.sent.some(event => event.type === "nea-demo:ready"));
  assert.ok(fixture.logs.some(message => message.includes("server runtime received client ready")));

  fixture.pointerLockEvents.emit("pointerlockchange", { isLocked: true });
  assert.match(fixture.status.textContent, /input: pointer locked/);
  assert.deepEqual(fixture.sent.at(-1), { type: "nea-demo:pointer-lock", isLocked: true });
  runtime.stop();
});
