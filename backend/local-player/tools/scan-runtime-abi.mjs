import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, pathToFileURL } from "node:path";
import { register } from "node:module";

const localRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(localRoot, "..", "..");
register(new URL("./legacy-ts-loader.mjs", import.meta.url), import.meta.url);

const protocolPath = process.env.NEA_PROTOCOL_EVIDENCE_PATH
  ? resolve(process.env.NEA_PROTOCOL_EVIDENCE_PATH)
  : join(projectRoot, "Middleware/runtime-compat/evidence/recovered-player-protocol.ts");
const playerModule = await import(pathToFileURL(protocolPath));
const scriptProtocols = JSON.parse(await readFile(join(projectRoot, "Evidence/origin/server-protocols.json"), "utf8"));

function describeSchema(schema, depth = 0) {
  if (!schema || typeof schema !== "object") return { type: typeof schema };
  const type = schema.muType || schema.type || "object";
  if (depth >= 10) return { type, truncated: true };
  const data = schema.muData;
  if (!data || typeof data !== "object") return { type };
  if (Array.isArray(data)) return { type, data: data.map((value) => describeSchema(value, depth + 1)) };
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && (value.muType || value.type)) fields[key] = describeSchema(value, depth + 1);
    else if (Array.isArray(value)) fields[key] = value.length <= 32 ? value : { length: value.length };
    else if (["string", "number", "boolean"].includes(typeof value) || value === null) fields[key] = value;
  }
  return Object.keys(fields).length ? { type, fields } : { type };
}

const protocolEntries = Array.isArray(playerModule.protocols)
  ? playerModule.protocols.map((protocol, index) => [`protocol_${index + 1}`, protocol])
  : Object.entries(playerModule);
const playerProtocols = protocolEntries
  .filter(([, value]) => value && typeof value === "object" && value.name && value.client && value.server)
  .map(([exportName, protocol]) => ({
    exportName,
    name: protocol.name,
    client: Object.fromEntries(Object.entries(protocol.client).map(([name, schema]) => [name, describeSchema(schema)])),
    server: Object.fromEntries(Object.entries(protocol.server).map(([name, schema]) => [name, describeSchema(schema)])),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const startupAbi = {
  http: [
    "GET /play/{gameName}?contentId={contentId}",
    "GET /p/{gameName}?contentId={contentId}",
    "GET /_next/{manifest asset}",
    "GET /block/{content hash}",
    "GET /engine/m/{content hash}",
    "GET /avatar/m/{content hash}",
    "GET /api/getMapInfo",
    "POST /api/createSession",
    "GET /content/auth/guest/{contentId}",
    "GET /content/view/increase/{contentId}",
    "GET /sticker/all?mapId={contentId}",
    "POST /statistics/content/online",
  ],
  createSession: {
    request: ["mode", "contentId", "fingerPrint", "serverId"],
    response: ["config.prefetchHashes", "config.sessionId", "config.socketServerUrl", "config.maxSockets", "config.configuredAudioHashes", "config.admin"],
  },
  iframeBridge: {
    transport: "window.postMessage / Penpal",
    handshake: ["syn", "synAck(methodNames=[emit])", "ack"],
    events: ["hashChange", "jumpTo", "loaded", "openStore", "openUserProfile", "playerContextmenu", "screenshot"],
  },
  websocket: {
    url: "{socketServerUrl}?sid={sessionId}",
    sockets: 3,
    firstServerFrame: "JSON text { reliable: boolean }",
    topology: "first socket reliable=true; remaining sockets reliable=false",
    observedReliableClientFrames: [86, 3531, 1, 32],
    observedFrameNotes: [
      "86-byte net-log frame: engine reports WebGL renderer initialization",
      "3531-byte net-log frame: engine reports user connection statistics",
      "1-byte frame: 0x07 control/protocol frame",
      "32-byte frame: engine started 0.31 log/control frame",
    ],
  },
};

const output = {
  generatedAt: new Date().toISOString(),
  startupAbi,
  playerProtocols,
  scriptProtocols,
  summary: {
    playerProtocols: playerProtocols.length,
    playerClientMessages: playerProtocols.reduce((sum, item) => sum + Object.keys(item.client).length, 0),
    playerServerMessages: playerProtocols.reduce((sum, item) => sum + Object.keys(item.server).length, 0),
    scriptProtocols: scriptProtocols.length,
    scriptClientMessages: scriptProtocols.reduce((sum, item) => sum + Object.keys(item.client || {}).length, 0),
    scriptServerMessages: scriptProtocols.reduce((sum, item) => sum + Object.keys(item.server || {}).length, 0),
  },
};

const lines = [
  "# DAO3 / Box3 Local Runtime ABI",
  "",
  `- Player protocols: ${output.summary.playerProtocols}`,
  `- Player messages: client ${output.summary.playerClientMessages}, server ${output.summary.playerServerMessages}`,
  `- Script runtime protocols: ${output.summary.scriptProtocols}`,
  `- Script messages: client ${output.summary.scriptClientMessages}, server ${output.summary.scriptServerMessages}`,
  "",
  "## Startup Flow",
  "",
  "1. Platform loads `/play/{gameName}` and creates the historical Player iframe.",
  "2. Iframe and parent complete the Penpal `syn` / `synAck` / `ack` bridge.",
  "3. Player loads manifest-verified Next.js chunks and content-addressed assets.",
  "4. Player calls `POST /api/createSession`.",
  "5. Player opens three WebSockets with the same `sid`.",
  "6. Server marks the first socket reliable and the other two unreliable.",
  "7. Reliable socket begins the binary MuDB protocol negotiation.",
  "",
  "## Player Protocols",
  "",
  ...playerProtocols.flatMap((protocol) => [
    `### ${protocol.name}`,
    "",
    `- Client receives: ${Object.keys(protocol.client).join(", ") || "none"}`,
    `- Server receives: ${Object.keys(protocol.server).join(", ") || "none"}`,
    "",
  ]),
  "## Script Runtime Protocols",
  "",
  ...scriptProtocols.flatMap((protocol) => [
    `### ${protocol.name}`,
    "",
    `- Client receives: ${Object.keys(protocol.client || {}).join(", ") || "none"}`,
    `- Server receives: ${Object.keys(protocol.server || {}).join(", ") || "none"}`,
    "",
  ]),
  "## Backend Gap",
  "",
  "- Implement MuDB protocol negotiation after the WebSocket reliability marker.",
  "- Register the 20 Player protocols in the captured order and byte-exact schemas.",
  "- Emit bootstrap model, sound, terrain, player, game-net, and clock state from the recovered bootstrap archive.",
  "- Serve terrain chunk/hash/light-map requests and authoritative input acknowledgements.",
  "- Connect the 12 Script runtime protocols to the recovered `origin` ScriptShell implementation.",
];

await mkdir(join(localRoot, "reports"), { recursive: true });
await writeFile(join(localRoot, "reports/runtime-abi.json"), `${JSON.stringify(output, null, 2)}\n`);
await writeFile(join(localRoot, "reports/runtime-abi.md"), `${lines.join("\n")}\n`);
console.log(JSON.stringify(output.summary, null, 2));
