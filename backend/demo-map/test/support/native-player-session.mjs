import { createRequire, register } from "node:module";

const PROBE_TIMEOUT_MS = 8_000;
let windowLeaseCount = 0;
let hadWindowBeforeProbe = false;
let windowBeforeProbe;
const PLAYER_PROTOCOL_EXPORTS = Object.freeze([
  "netLog",
  "models",
  "gameNet",
  "gameClock",
  "input",
  "sound",
  "gameTerrain",
  "gameChat",
  "playerProtocol",
  "entityInteract",
  "dialog",
  "navigator",
  "ref",
  "rtc",
  "gui",
  "market",
  "teleport",
  "remoteChannel",
  "gameUI",
  "admin",
]);

register(
  new URL("../../../../Backend/local-player/tools/legacy-ts-loader.mjs", import.meta.url),
  import.meta.url,
);

const protocolEvidence = await import(
  new URL("../../../../Middleware/runtime-compat/evidence/recovered-player-protocol.ts", import.meta.url)
);
const playerProtocols = Object.freeze(PLAYER_PROTOCOL_EXPORTS.map(name => instrumentProtocol(requireProtocol(name))));
const mudbRequire = createRequire(new URL("../../../../Shared/mudb/package.json", import.meta.url));
const { MuClient } = mudbRequire("./index.js");

export async function receiveNativePlayerTerrainReset({
  baseUrl,
  contentId,
  fingerPrint = "nea-public-conformance-probe",
  afterTerrainReset = () => {},
  onClientScriptModules = () => {},
  onRemoteEvent = () => {},
  fetchTerrainChunks = false,
  timeoutMS = PROBE_TIMEOUT_MS,
  settleMS = 100,
}) {
  const origin = requireHttpOrigin(baseUrl);
  const sessionFingerPrint = requireFingerPrint(fingerPrint);
  if (typeof afterTerrainReset !== "function") throw new Error("Native Player probe afterTerrainReset must be a function");
  if (typeof onClientScriptModules !== "function") throw new Error("Native Player probe onClientScriptModules must be a function");
  if (typeof onRemoteEvent !== "function") throw new Error("Native Player probe onRemoteEvent must be a function");
  if (typeof fetchTerrainChunks !== "boolean") throw new Error("Native Player probe fetchTerrainChunks must be a boolean");
  if (!Number.isSafeInteger(settleMS) || settleMS < 0 || settleMS > timeoutMS) {
    throw new Error("Native Player probe settleMS must be an integer within the probe timeout");
  }
  const session = await createSession(origin, contentId, sessionFingerPrint);
  const restoreWindow = installNodeWebSocketWindow();
  const clientErrors = [];
  const client = createProbeClient(session, clientErrors);

  try {
    return await waitForTerrainReset({
      afterTerrainReset,
      client,
      clientErrors,
      fetchTerrainChunks,
      onClientScriptModules,
      onRemoteEvent,
      sessionId: session.sessionId,
      settleMS,
      timeoutMS,
    });
  } finally {
    if (client.running) client.destroy();
    restoreWindow();
  }
}

function createProbeClient(session, clientErrors) {
  const { MuWebSocket } = mudbRequire("./socket/web/client.js");
  const logger = {
    log() {},
    error() {},
    exception(error) {
      clientErrors.push(error instanceof Error ? error : new Error(String(error)));
    },
  };
  const socket = new MuWebSocket({
    sessionId: session.sessionId,
    url: session.socketServerUrl,
    maxSockets: session.maxSockets,
    logger,
  });
  return new MuClient(socket, logger, true);
}

async function createSession(baseUrl, contentId, fingerPrint) {
  const response = await fetch(`${baseUrl}/api/createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: "native-player-protocol-smoke",
      contentId: String(contentId),
      fingerPrint,
      serverId: "local",
    }),
  });
  if (!response.ok) throw new Error(`Native Player createSession failed with HTTP ${response.status}`);
  const issued = await response.json();
  const config = issued?.config;
  if (!config || typeof config.sessionId !== "string" || typeof config.socketServerUrl !== "string") {
    throw new Error("Native Player createSession response is missing its socket configuration");
  }
  return config;
}

function waitForTerrainReset({ afterTerrainReset, client, clientErrors, fetchTerrainChunks, onClientScriptModules, onRemoteEvent, sessionId, settleMS, timeoutMS }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const state = createProbeState();
    const timeout = setTimeout(() => finish(new Error("Timed out waiting for Native Player terrain reset")), timeoutMS);
    timeout.unref?.();

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }

    for (const schema of playerProtocols) configureProbeProtocol({
      afterTerrainReset,
      client,
      clientErrors,
      fetchTerrainChunks,
      finish,
      onClientScriptModules,
      onRemoteEvent,
      schema,
      sessionId,
      settleMS,
      state,
    });

    client.start({
      ready() {
        state.gameNetProtocol.server.message.join();
      },
      close(error) {
        finish(new Error(`Native Player MuDB session closed before terrain reset: ${String(error ?? "clean shutdown")}`));
      },
    });
  });
}

function createProbeState() {
  return {
    gameNetProtocol: null,
    gameNetRawFrames: 0,
    terrainHandled: false,
    remoteChannelProtocol: null,
    remoteServerTick: 0,
    gameTerrainProtocol: null,
    pendingTerrainChunks: new Map(),
    terrainBoxes: 0,
    terrainChunksFetched: 0,
    playerJoins: [],
    playerLeaves: [],
    remoteEvents: [],
    bootstrap: {
      meshHashes: 0,
      skinHashes: 0,
      skinPartHashes: 0,
      sounds: 0,
      clientScriptModules: 0,
      uiNodes: 0,
      uiPictures: 0,
    },
  };
}

function configureProbeProtocol(options) {
  const { client, schema, state } = options;
  const protocol = client.protocol(schema);
  const handlers = Object.fromEntries(Object.keys(schema.client).map(name => [name, () => {}]));
  if (schema.name === "models") configureModelHandlers(handlers, state.bootstrap);
  if (schema.name === "game-net") {
    state.gameNetProtocol = protocol;
    handlers.syncClientScriptModules = values => captureClientScriptModules(values, state, options.onClientScriptModules);
  }
  if (schema.name === "sound") handlers.resetDictionary = values => { state.bootstrap.sounds = arrayLength(values); };
  if (schema.name === "game-terrain") {
    state.gameTerrainProtocol = protocol;
    handlers.reset = reset => handleTerrainReset(reset, options);
    handlers.chunkResponse = response => handleTerrainChunkResponse(response, state);
  }
  if (schema.name === "player-protocol") {
    handlers.playerJoin = value => capturePlayerLifecycle(value, state.playerJoins, "join");
    handlers.playerLeave = value => capturePlayerLifecycle(value, state.playerLeaves, "leave");
  }
  if (schema.name === "remote-channel") {
    state.remoteChannelProtocol = protocol;
    handlers.sendClientEvent = packet => captureRemoteEvent(packet, state, options.onRemoteEvent);
  }
  if (schema.name === "gameUI") {
    handlers.reset = value => {
      state.bootstrap.uiNodes = recordSize(value?.uiTree);
      state.bootstrap.uiPictures = recordSize(value?.pictureAssets);
    };
  }
  protocol.configure({
    message: handlers,
    raw: schema.name === "game-net" ? () => { state.gameNetRawFrames += 1; } : () => {},
  });
}

function captureClientScriptModules(values, state, onClientScriptModules) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Native Player client script modules must be a dictionary");
  }
  const entries = [];
  for (const [name, source] of Object.entries(values)) {
    if (typeof name !== "string" || name.length === 0 || typeof source !== "string") {
      throw new Error("Native Player client script module entry is invalid");
    }
    entries.push([name, source]);
  }
  const modules = Object.freeze(Object.fromEntries(entries));
  state.bootstrap.clientScriptModules = Object.keys(modules).length;
  onClientScriptModules(modules);
}

function configureModelHandlers(handlers, bootstrap) {
  handlers.appendMeshHashes = values => { bootstrap.meshHashes += arrayLength(values); };
  handlers.appendSkinHashes = values => { bootstrap.skinHashes += arrayLength(values); };
  handlers.appendSkinPartHashes = values => { bootstrap.skinPartHashes += arrayLength(values); };
}

function handleTerrainReset(reset, options) {
  const { afterTerrainReset, clientErrors, fetchTerrainChunks, finish, sessionId, settleMS, state } = options;
  if (state.terrainHandled) return;
  state.terrainHandled = true;
  let summary;
  try {
    summary = summarizeTerrainReset(reset);
  } catch (error) {
    finish(error);
    return;
  }
  Promise.resolve(fetchTerrainChunks ? fetchAllTerrainChunks(summary, state) : undefined).then(() => {
    const sendGameInput = input => sendNativeGameInput(input, state);
    const sendServerEvent = event => sendRemoteServerEvent(event, state);
    return afterTerrainReset(Object.freeze({ sendGameInput, sendServerEvent, sessionId }));
  }).then(() => {
    const drain = setTimeout(() => finish(clientErrors[0] ?? null, probeResult(summary, state)), settleMS);
    drain.unref?.();
  }).catch(finish);
}

function sendNativeGameInput(input, state) {
  if (!state.gameNetProtocol) throw new Error("Native Player game-net protocol is not connected");
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Native Player game-net input must be an object");
  }
  state.gameNetProtocol.server.message.input(structuredClone(input));
}

async function fetchAllTerrainChunks(summary, state) {
  if (!state.gameTerrainProtocol) throw new Error("Native Player game-terrain protocol is not connected");
  state.gameTerrainProtocol.server.message.ready(summary.resetCounter);
  await Promise.all(Array.from({ length: summary.chunkCount }, (_, chunkId) => fetchTerrainChunk(chunkId, state)));
}

function fetchTerrainChunk(chunkId, state) {
  const rpcId = chunkId + 1;
  return new Promise((resolve, reject) => {
    state.pendingTerrainChunks.set(rpcId, { chunkId, reject, resolve, rpcId });
    try {
      state.gameTerrainProtocol.server.message.fetchChunk({ chunkId, rpcId });
    } catch (error) {
      state.pendingTerrainChunks.delete(rpcId);
      reject(error);
    }
  });
}

function handleTerrainChunkResponse(response, state) {
  const pending = response && Number.isSafeInteger(response.rpcId)
    ? state.pendingTerrainChunks.get(response.rpcId)
    : undefined;
  if (!pending || !response || response.rpcId !== pending.rpcId || !Array.isArray(response.boxes)) {
    const error = new Error("Native Player terrain chunk response does not match its pending RPC");
    if (pending) pending.reject(error);
    if (pending) state.pendingTerrainChunks.delete(pending.rpcId);
    if (!pending) throw error;
    return;
  }
  state.pendingTerrainChunks.delete(pending.rpcId);
  state.terrainChunksFetched += 1;
  state.terrainBoxes += response.boxes.length;
  pending.resolve();
}

function sendRemoteServerEvent(event, state) {
  if (!state.remoteChannelProtocol) throw new Error("Native Player remote-channel protocol is not connected");
  let args;
  try {
    args = JSON.stringify(event);
  } catch (error) {
    throw new Error("Native Player remote-channel server event must be a JSON value", { cause: error });
  }
  if (args === undefined) throw new Error("Native Player remote-channel server event must be a JSON value");
  state.remoteServerTick += 1;
  state.remoteChannelProtocol.server.message.sendServerEvent({ tick: state.remoteServerTick, args });
}

function captureRemoteEvent(packet, state, onRemoteEvent) {
  if (!packet || !Number.isSafeInteger(packet.tick) || packet.tick < 0 || typeof packet.args !== "string") {
    throw new Error("Native Player remote-channel packet is invalid");
  }
  let event;
  try {
    event = JSON.parse(packet.args);
  } catch (error) {
    throw new Error("Native Player remote-channel packet contains invalid JSON", { cause: error });
  }
  state.remoteEvents.push(structuredClone(event));
  onRemoteEvent(structuredClone(event));
}

function capturePlayerLifecycle(value, target, kind) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 0) {
    throw new Error(`Native Player ${kind} packet has an invalid player id`);
  }
  target.push(Object.freeze({ id: value.id, position: Object.freeze(vectorTuple(value.position, kind)) }));
}

function vectorTuple(value, kind) {
  const tuple = Array.isArray(value) || ArrayBuffer.isView(value)
    ? Array.from(value)
    : value && typeof value === "object"
      ? [value.x, value.y, value.z]
      : [];
  if (tuple.length !== 3 || tuple.some(component => !Number.isFinite(component))) {
    throw new Error(`Native Player ${kind} packet has an invalid position`);
  }
  return tuple;
}

function probeResult(summary, state) {
  return Object.freeze({
    ...summary,
    gameNetRawFrames: state.gameNetRawFrames,
    ...state.bootstrap,
    playerJoins: Object.freeze([...state.playerJoins]),
    playerLeaves: Object.freeze([...state.playerLeaves]),
    remoteEvents: Object.freeze(state.remoteEvents.map(event => Object.freeze(event))),
    terrainBoxes: state.terrainBoxes,
    terrainChunksFetched: state.terrainChunksFetched,
  });
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function recordSize(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}

function summarizeTerrainReset(reset) {
  if (!reset || !Number.isSafeInteger(reset.nx) || !Number.isSafeInteger(reset.ny) || !Number.isSafeInteger(reset.nz) || !Array.isArray(reset.hashes)) {
    throw new Error("Native Player terrain reset payload is invalid");
  }
  return Object.freeze({
    shape: Object.freeze([reset.nx, reset.ny, reset.nz]),
    chunkCount: reset.hashes.length,
    resetCounter: reset.resetCounter,
  });
}

function installNodeWebSocketWindow() {
  if (typeof globalThis.WebSocket !== "function") throw new Error("Node WebSocket support is unavailable");
  if (windowLeaseCount === 0) {
    hadWindowBeforeProbe = Object.hasOwn(globalThis, "window");
    windowBeforeProbe = globalThis.window;
    globalThis.window = {
      Object,
      WebSocket: globalThis.WebSocket,
      addEventListener() {},
      removeEventListener() {},
    };
  }
  windowLeaseCount += 1;
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    windowLeaseCount -= 1;
    if (windowLeaseCount > 0) return;
    if (hadWindowBeforeProbe) {
      globalThis.window = windowBeforeProbe;
    } else {
      delete globalThis.window;
    }
    windowBeforeProbe = undefined;
  };
}

function requireProtocol(name) {
  const protocol = protocolEvidence[name];
  if (!protocol || typeof protocol.name !== "string" || !protocol.client || !protocol.server) {
    throw new Error(`Recovered Player protocol evidence is missing ${name}`);
  }
  return protocol;
}

function instrumentProtocol(protocol) {
  for (const [messageName, schema] of Object.entries(protocol.client)) {
    const patch = schema.patch;
    schema.patch = function patchWithProtocolContext(base, input) {
      try {
        return patch.call(this, base, input);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Native Player protocol decode failed for ${protocol.name}.${messageName}: ${detail}`, { cause: error });
      }
    };
  }
  return protocol;
}

function requireHttpOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Native Player probe baseUrl must use HTTP or HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

function requireFingerPrint(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 256
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("Native Player probe fingerPrint must be a non-empty string of at most 256 characters without control characters");
  }
  return value;
}
