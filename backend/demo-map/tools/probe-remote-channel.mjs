import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const legacyRoot = process.argv[2];
if (!legacyRoot) throw new Error("A local research project root is required as the first argument");
const baseUrl = requireHttpUrl(process.env.NEA_DEMO_URL ?? "http://127.0.0.1:4322", "NEA_DEMO_URL");
const controlUrl = requireHttpUrl(process.env.NEA_DEMO_CONTROL_URL ?? "http://127.0.0.1:4323", "NEA_DEMO_CONTROL_URL");
const controlToken = process.env.NEA_DEMO_CONTROL_TOKEN;
if (!controlToken) throw new Error("NEA_DEMO_CONTROL_TOKEN is required for the authoritative state probe");
const require = createRequire(join(legacyRoot, "package.json"));
const { MuClient } = require("mudb");
const { MuWebSocket } = require("mudb/socket/web/client");
const { box3Protocols, gameNet, remoteChannel } = await import(pathToFileURL(join(legacyRoot, "legacy/box3-compat/src/wire/protocols.ts")).href);

const response = await fetch(`${baseUrl}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "local-probe", contentId: "100110008", fingerPrint: "nea-probe", serverId: "local" }),
});
if (!response.ok) throw new Error(`createSession failed: HTTP ${response.status} ${await response.text()}`);
const issued = await response.json();
const socket = new MuWebSocket({
  sessionId: issued.config.sessionId,
  url: issued.config.socketServerUrl,
  maxSockets: issued.config.maxSockets,
  logger: { log() {}, error() {}, exception() {} },
});
const client = new MuClient(socket, undefined, true);
let remoteProtocol;
let gameNetProtocol;
let settled = false;
const received = [];

const result = await new Promise((resolveResult, rejectResult) => {
  const timeout = setTimeout(() => rejectResult(new Error("Timed out waiting for nea-demo:ack")), 8_000);
  for (const schema of box3Protocols) {
    const protocol = client.protocol(schema);
    const handlers = Object.fromEntries(Object.keys(schema.client).map(name => [name, () => {}]));
    if (schema === remoteChannel) {
      remoteProtocol = protocol;
      handlers.sendClientEvent = data => {
        const event = JSON.parse(data.args);
        if (!["nea-demo:ack", "nea-demo:checkpoint", "nea-demo:hazard"].includes(event.type)) return;
        received.push({ tick: data.tick, event });
        if (event.type === "nea-demo:ack") {
          remoteProtocol.server.message.sendServerEvent({
            tick: 2,
            args: JSON.stringify({ type: "nea-demo:probe-interactions" }),
          });
        }
        if (!received.some(item => item.event.type === "nea-demo:checkpoint")) return;
        if (!received.some(item => item.event.type === "nea-demo:hazard")) return;
        settled = true;
        clearTimeout(timeout);
        resolveResult({ sessionLabel: shortSession(issued.config.sessionId), received });
      };
    }
    if (schema === gameNet) gameNetProtocol = protocol;
    protocol.configure({ message: handlers });
  }
  client.start({
    ready() {
      gameNetProtocol.server.message.join();
      remoteProtocol.server.message.sendServerEvent({
        tick: 1,
        args: JSON.stringify({ type: "nea-demo:ready", runtimeApiVersion: "0.1.0", probe: true }),
      });
    },
    close(error) {
      if (settled) return;
      clearTimeout(timeout);
      rejectResult(new Error(`MuDB probe closed: ${String(error ?? "clean shutdown")}`));
    },
  });
});

await new Promise(resolve => setTimeout(resolve, 250));
const stateResponse = await fetch(`${controlUrl}/__nea/control/player-state?session=${encodeURIComponent(result.sessionLabel)}`, {
  headers: { authorization: `Bearer ${controlToken}` },
});
const statePayload = await stateResponse.json();
if (!stateResponse.ok || statePayload.ok !== true) throw new Error(`Player state probe failed: ${JSON.stringify(statePayload)}`);
const physics = JSON.parse(await readFile(new URL("../project/world/physics.json", import.meta.url), "utf8"));
const expectedHalfExtents = physics.playerBody.halfExtents;
if (!sameVector(statePayload.state.bodyHalfExtents, expectedHalfExtents)) {
  throw new Error(`Player Body profile did not reach authoritative state: expected ${expectedHalfExtents}, received ${statePayload.state.bodyHalfExtents}`);
}
console.log(JSON.stringify({ ...result, authoritativeState: statePayload.state }, null, 2));
if (client.running) client.destroy();

function shortSession(value) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function sameVector(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === 3 && right.length === 3 && left.every((value, index) => value === right[index]);
}

function requireHttpUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`${name} must be an absolute HTTP URL`);
  return url.toString().replace(/\/$/, "");
}
