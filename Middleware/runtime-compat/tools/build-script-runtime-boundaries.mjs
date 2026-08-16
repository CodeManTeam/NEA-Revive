import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const client = await readJson("generated/player-client-script-runtime-analysis.json");
const server = await readJson("generated/local-server-runtime-analysis.json");
const protocols = await readJson("abi/protocols.json");
const gameNet = protocols.protocols.find(protocol => protocol.id === "player.game-net");
const remoteChannel = protocols.protocols.find(protocol => protocol.id === "player.remote-channel");
if (!gameNet?.clientReceives?.syncClientScriptModules) throw new Error("Client module delivery protocol is missing");
if (!remoteChannel?.clientReceives?.sendClientEvent || !remoteChannel?.serverReceives?.sendServerEvent) {
  throw new Error("Bidirectional remote channel protocol is missing");
}
if (client.execution.engine !== "SES Compartment" || client.execution.entryModule !== "clientIndex.js") {
  throw new Error("Archived Client Script Runtime execution contract changed");
}
if (!server.entries.some(entry => entry.id === "server.world.currentTick")) throw new Error("Local Server Script Runtime surface is missing");

const model = {
  format: "nea-script-runtime-boundaries",
  version: 1,
  generatedAt: new Date().toISOString(),
  invariant: "Client Script Runtime and Server Script Runtime are separate execution realms connected only through declared transport and authoritative state flows.",
  runtimes: [
    {
      id: "dao3-client-runtime/v1",
      side: "client",
      provider: "archived-player",
      engine: client.execution.engine,
      entry: client.execution.entryModule,
      moduleDelivery: "player.game-net.syncClientScriptModules",
      globals: client.globals,
      authority: ["UI", "input observation", "client media", "client HTTP", "client presentation state"],
      forbiddenAuthority: ["authoritative player position", "authoritative rigid-body dimensions", "server world mutation", "server-only API globals"],
      remoteSend: "player.remote-channel.sendServerEvent",
      remoteReceive: "player.remote-channel.sendClientEvent",
      evidence: [client.source, client.engineSource],
    },
    {
      id: "nea-server-runtime/v1",
      side: "server",
      provider: "local-vm-script-runtime",
      engine: "Node vm.Context",
      entry: "scripts/server.js",
      globals: [...new Set(server.entries.map(entry => entry.owner).filter(Boolean))].sort(),
      authority: ["map script ticks", "world event dispatch", "player mutation requests", "server remote events"],
      forbiddenAuthority: ["direct DOM/UI access", "client input polling", "direct MuDB socket access", "unversioned authoritative body mutation"],
      remoteSend: "player.remote-channel.sendClientEvent",
      remoteReceive: "player.remote-channel.sendServerEvent",
      evidence: [server.source],
    },
  ],
  bridges: [
    {
      id: "remote-channel",
      protocol: "player.remote-channel",
      encoding: "MuDB struct {tick: varint, args: utf8 JSON text}",
      directions: ["client-to-server", "server-to-client"],
    },
    {
      id: "authoritative-state",
      protocol: "nea-control.player-state -> player.game-net.PUBLIC",
      directions: ["server-script-to-authoritative-runtime", "authoritative-runtime-to-player"],
      rule: "Server scripts request state changes; the authoritative runtime owns accepted rigid-body state and PUBLIC snapshots.",
    },
  ],
  sharedValues: {
    rule: "Names such as GameVector3 may exist in both realms, but object identity and mutable instances never cross realms directly.",
    transportForm: "serialized values only",
  },
};

await writeFile(resolve(root, "abi", "script-runtime-boundaries.json"), `${JSON.stringify(model, null, 2)}\n`);
console.log(`Built script runtime boundary model for ${model.runtimes.length} isolated runtimes.`);

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
