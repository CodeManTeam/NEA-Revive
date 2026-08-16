import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { encodeHistoricalServerEvent, HistoricalClientRemoteChannelFixture } from "../../../Middleware/runtime-compat/conformance/client-remote-channel.mjs";
import { importMapProject } from "../src/import-project.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");

test("directed and broadcast events do not leak to disconnected recipients", async () => {
  const source = resolve(fileURLToPath(new URL("../project", import.meta.url)));
  const output = join(await mkdtemp(join(tmpdir(), "nea-remote-isolation-")), "project");
  await importMapProject(source, output);
  await writeFile(join(output, "scripts", "server.js"), `
    remoteChannel.onServerEvent(({ entity }) => {
      remoteChannel.sendClientEvent(entity, { type: "directed", recipient: entity.id });
      remoteChannel.broadcastClientEvent({ type: "broadcast", sender: entity.id });
    });
  `, "utf8");

  const received = new Map([
    ["recipient-1", []],
    ["recipient-2", []],
  ]);
  const fixtures = new Map([...received.keys()].map(playerId => {
    const fixture = new HistoricalClientRemoteChannelFixture();
    fixture.events.on("client", event => received.get(playerId).push(event));
    fixture.start();
    return [playerId, fixture];
  }));
  let runtime;
  runtime = await ScriptRuntime.load(output, {
    blockCatalog,
    logger: { info() {}, warn() {}, error() {} },
    sendClientEvent: (playerId, event) => fixtures.get(playerId)?.receivePacket(encodeHistoricalServerEvent(runtime.currentTick, event)),
  });
  await runtime.start();
  runtime.addPlayer({ id: "recipient-1" });
  runtime.addPlayer({ id: "recipient-2" });
  assert.equal(runtime.dispatchClientEvent("recipient-1", { type: "first" }), true);
  runtime.removePlayer("recipient-2");
  fixtures.delete("recipient-2");
  assert.equal(runtime.dispatchClientEvent("recipient-1", { type: "second" }), true);
  runtime.stop();

  assert.deepEqual(received.get("recipient-1"), [
    { type: "directed", recipient: "recipient-1" },
    { type: "broadcast", sender: "recipient-1" },
    { type: "directed", recipient: "recipient-1" },
    { type: "broadcast", sender: "recipient-1" },
  ]);
  assert.deepEqual(received.get("recipient-2"), [{ type: "broadcast", sender: "recipient-1" }]);
});
