import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const siblingRoot = resolve(repositoryRoot, "..");
const captureRoot = resolve(process.env.NEA_REFERENCE_CAPTURE_ROOT ?? resolve(siblingRoot, "runtime-compat", "evidence", "captures"));
const packetAnalyzerPath = resolve(process.env.NEA_REFERENCE_ANALYZER_PATH ?? resolve(siblingRoot, "runtime-compat", "evidence", "packet-analysis.ts"));
const outputPath = resolve(root, "generated", "posture-delta-corpus-inventory.json");
const runtimeAbi = await readJson(resolve(repositoryRoot, "local-player", "reports", "runtime-abi.json"));
const profile = await readJson(resolve(root, "generated", "player-profile-network-inventory.json"));
const legacy = await readJson(resolve(root, "generated", "legacy-worktree-posture-inventory.json"));
const legacyRoot = await locateLegacyRoot();

const protocolOrder = [
  "netLog", "models", "gameNet", "gameClock", "input", "sound", "gameTerrain",
  "gameChat", "playerProtocol", "entityInteract", "dialog", "navigator", "ref",
  "rtc", "gui", "market", "teleport", "remoteChannel", "gameUI", "admin",
];
const sendTable = buildPacketTable("server");
const receiveTable = buildPacketTable("client");
const captures = await inventoryCaptures();
const archives = await inventoryResourceArchives();
const bootstrap = await inventoryBootstrap();
const staticReplay = await inventoryStaticReplay();
const websocketDiscovery = await inventoryWebsocketDiscovery();
const packetGroups = aggregatePacketGroups(captures.flatMap(capture => capture.packetGroups));
const traffic = sumTraffic(captures);
const candidateFrames = traffic.serverToClientBinaryFrames
  + profile.publicFrameEvidence.serverToClientBinaryFrames
  + legacy.localArtifacts.serverToClientPublicFrameCount;
const archiveFrameCandidates = archives.reduce((total, archive) => total + archive.frameCandidateEntries, 0);

const inventory = {
  format: "nea-posture-delta-corpus-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceSets: [
    { id: "external-reference-captures", path: "Middleware/runtime-compat/evidence/captures", files: captures.length, available: captures.length > 0 },
    { id: "external-reference-resource-archives", path: "Middleware/runtime-compat/evidence/captures", files: archives.length, available: archives.length > 0 },
    { id: "local-player-bootstrap", path: bootstrap.path, files: 1, available: bootstrap.available },
    { id: "local-player-websocket-discovery-cache", path: "local-player/runtime", files: websocketDiscovery.responses.length, available: websocketDiscovery.responses.length > 0 },
    { id: "legacy-static-replay", path: staticReplay.path, files: 1, available: staticReplay.available },
    { id: "player-browser-profile", path: profile.source.path, files: profile.serviceWorkerCache.parsedEntries, available: true },
    { id: "legacy-binary-candidates", path: "sibling-local-worktree", files: legacy.localArtifacts.binaryCandidates.length, available: true },
  ],
  packetOrderEvidence: {
    path: "Middleware/runtime-compat/evidence/packet-analysis.ts",
    expectedSha256: "3925a75e3a48beadd5d0b415f72aa5a95e2efa6e693a7c86c060e2100c883f8c",
    observedSha256: await optionalSha256(packetAnalyzerPath),
    protocolOrder,
  },
  captures: {
    count: captures.length,
    traffic,
    packetGroups,
    files: captures,
  },
  resourceArchives: {
    count: archives.length,
    frameCandidateEntries: archiveFrameCandidates,
    files: archives,
    classification: archiveFrameCandidates === 0 ? "resource-only" : "frame-candidates-present",
  },
  bootstrap,
  staticReplay,
  websocketDiscovery,
  browserProfile: {
    canonicalCacheStreams: profile.serviceWorkerCache.parsedEntries,
    serverToClientBinaryFrames: profile.publicFrameEvidence.serverToClientBinaryFrames,
    classification: "http-cache-without-websocket-public-frames",
  },
  legacyArtifacts: {
    binaryCandidates: legacy.localArtifacts.binaryCandidates.length,
    serverToClientPublicFrames: legacy.localArtifacts.serverToClientPublicFrameCount,
  },
  authoritativePostureDelta: {
    status: candidateFrames === 0 ? "not-found-in-safe-local-frame-corpus" : "candidate-frames-present",
    candidateServerToClientBinaryFrames: candidateFrames,
    archiveFrameCandidateEntries: archiveFrameCandidates,
    requiredDirection: "server-to-client",
    requiredProtocol: "gameNet PUBLIC body delta or equivalent authoritative state frame",
    requiredFields: ["rx", "ry", "rz", "hsx", "hsy", "hsz"],
    rawReplayPayloadAvailable: staticReplay.rawPayloadAvailable,
    conclusion: candidateFrames === 0
      ? "The safe local frame corpus contains only client-to-server MuDB binary traffic, decoded initialization replay values, HTTP connection metadata and resource archives; it contains no authoritative posture body delta."
      : "The corpus contains server-to-client binary candidates that require schema decoding before posture dimensions can be classified.",
  },
  safety: {
    payloadValuesIncluded: false,
    websocketUrlsIncluded: false,
    sessionIdentifiersIncluded: false,
    privateBrowserStoresRead: false,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Inventoried posture delta corpus: ${captures.length} captures, ${archives.length} resource archives, ${candidateFrames} server-to-client binary frame candidates.`);

async function inventoryCaptures() {
  let names;
  try {
    names = (await readdir(captureRoot)).filter(name => /^(?:reference|capture)-(?:browser-)?\d.*\.json$/u.test(name)).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const output = [];
  for (const name of names) {
    const path = resolve(captureRoot, name);
    const bytes = await readFile(path);
    const capture = JSON.parse(bytes.toString("utf8"));
    const messages = Array.isArray(capture.messages) ? capture.messages : [];
    const messageCounts = countBy(messages, message => `${message.direction ?? "unknown"}:${message.kind ?? "unknown"}`);
    const groups = new Map();
    for (const message of messages) {
      if (message.kind !== "binary" || !message.base64 || !["send", "receive"].includes(message.direction)) continue;
      const payload = Buffer.from(message.base64, "base64");
      const id = readVarint(payload);
      if (id === null) continue;
      const table = message.direction === "send" ? sendTable : receiveTable;
      const packet = table[id] ?? { id, protocol: "unknown", message: "unknown" };
      const key = `${message.direction}:${id}`;
      const group = groups.get(key) ?? { direction: message.direction, id, protocol: packet.protocol, message: packet.message, count: 0, bytes: 0 };
      group.count += 1;
      group.bytes += payload.length;
      groups.set(key, group);
    }
    output.push({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      format: capture.format ?? "unknown",
      version: capture.version ?? null,
      socketCount: Array.isArray(capture.sockets) ? capture.sockets.length : 0,
      messageCount: messages.length,
      messageCounts,
      packetGroups: [...groups.values()].sort(packetGroupOrder),
    });
  }
  return output;
}

async function inventoryResourceArchives() {
  let names;
  try {
    names = (await readdir(captureRoot)).filter(name => /^box3-dump-\d+\.zip$/u.test(name)).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const output = [];
  for (const name of names) {
    const bytes = await readFile(resolve(captureRoot, name));
    const entries = zipDirectory(bytes);
    const frameEntries = entries.filter(entry => isFrameCandidate(entry.name) && isSafePath(entry.name));
    output.push({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      entries: entries.length,
      frameCandidateEntries: frameEntries.length,
      frameCandidates: frameEntries.map(entry => ({ path: entry.name, bytes: entry.bytes })),
    });
  }
  return output;
}

async function inventoryBootstrap() {
  const path = resolve(repositoryRoot, "local-player", "archive", "project", "bedwars", "bootstrap", "bootstrap.json");
  try {
    const bytes = await readFile(path);
    const value = JSON.parse(bytes.toString("utf8"));
    const messages = Array.isArray(value.sourceMessages) ? value.sourceMessages : [];
    return {
      path: "local-player/archive/project/bedwars/bootstrap/bootstrap.json",
      available: true,
      bytes: bytes.length,
      sha256: sha256(bytes),
      sourceMessages: messages.filter(message => typeof message === "string" && /^[A-Za-z0-9_.-]+$/u.test(message)),
      rawPayloadFields: messages.filter(message => message && typeof message === "object").flatMap(message => Object.keys(message).filter(key => /raw|base64|bytes|buffer|binary|payload/iu.test(key))),
      classification: "decoded-initialization-message-index",
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { path: "local-player/archive/project/bedwars/bootstrap/bootstrap.json", available: false, sourceMessages: [], rawPayloadFields: [] };
    throw error;
  }
}

async function inventoryStaticReplay() {
  const path = resolve(legacyRoot, "runtime-compat", "evidence", "legacy", "replay-data.ts");
  try {
    const bytes = await readFile(path);
    const source = bytes.toString("utf8");
    const pairs = [...source.matchAll(/proto:\s*"([^"]+)",\s*msg:\s*"([^"]+)"/gu)].map(match => `${match[1]}/${match[2]}`);
    const rawMarkers = {
      base64: markerCount(source, /base64/giu),
      uint8Array: markerCount(source, /Uint8Array/gu),
      arrayBuffer: markerCount(source, /ArrayBuffer/gu),
      raw: markerCount(source, /\braw\b/giu),
    };
    return {
      path: "Middleware/runtime-compat/evidence/legacy/replay-data.ts",
      available: true,
      bytes: bytes.length,
      sha256: sha256(bytes),
      decodedMessages: pairs.length,
      byMessage: countBy(pairs, value => value),
      rawMarkers,
      rawPayloadAvailable: Object.values(rawMarkers).some(value => value > 0),
      classification: "decoded-static-replay-without-wire-bytes",
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { path: "Middleware/runtime-compat/evidence/legacy/replay-data.ts", available: false, decodedMessages: 0, byMessage: {}, rawPayloadAvailable: false };
    throw error;
  }
}

async function inventoryWebsocketDiscovery() {
  const paths = [
    "local-player/runtime/responses/code-api-pc.dao3.fun/_websocket_server-269.json",
    "local-player/runtime/http-cache/code-api-pc.dao3.fun/167-_websocket_se-stream1.json",
  ];
  const responses = [];
  for (const localPath of paths) {
    try {
      const bytes = await readFile(resolve(repositoryRoot, localPath));
      const value = JSON.parse(bytes.toString("utf8"));
      const dataProtocol = typeof value.data === "string" ? safeProtocol(value.data) : null;
      responses.push({
        path: localPath,
        bytes: bytes.length,
        sha256: sha256(bytes),
        keys: Object.keys(value).sort(),
        dataProtocol,
        traceIdentifierPresent: typeof value.traceId === "string" && value.traceId.length > 0,
        rawPayloadFields: Object.keys(value).filter(key => /raw|base64|bytes|buffer|binary|payload/iu.test(key)),
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return { classification: "http-websocket-connection-discovery-metadata", responses };
}

function buildPacketTable(side) {
  const byExportName = new Map(runtimeAbi.playerProtocols.map(protocol => [protocol.exportName, protocol]));
  const table = [];
  for (const exportName of protocolOrder) {
    const protocol = byExportName.get(exportName);
    if (!protocol) continue;
    for (const message of Object.keys(protocol[side] ?? {}).sort()) table.push({ id: table.length, protocol: protocol.name, message });
    table.push({ id: table.length, protocol: protocol.name, message: "raw" });
  }
  return table;
}

function sumTraffic(values) {
  const output = {
    messages: 0,
    clientToServerTextFrames: 0,
    clientToServerBinaryFrames: 0,
    serverToClientTextFrames: 0,
    serverToClientBinaryFrames: 0,
  };
  for (const capture of values) {
    output.messages += capture.messageCount;
    output.clientToServerTextFrames += capture.messageCounts["send:text"] ?? 0;
    output.clientToServerBinaryFrames += capture.messageCounts["send:binary"] ?? 0;
    output.serverToClientTextFrames += capture.messageCounts["receive:text"] ?? 0;
    output.serverToClientBinaryFrames += capture.messageCounts["receive:binary"] ?? 0;
  }
  return output;
}

function aggregatePacketGroups(values) {
  const groups = new Map();
  for (const value of values) {
    const key = `${value.direction}:${value.id}`;
    const group = groups.get(key) ?? { ...value, count: 0, bytes: 0 };
    group.count += value.count;
    group.bytes += value.bytes;
    groups.set(key, group);
  }
  return [...groups.values()].sort(packetGroupOrder);
}

function packetGroupOrder(left, right) {
  return right.count - left.count || left.direction.localeCompare(right.direction) || left.id - right.id;
}

function readVarint(bytes) {
  let value = 0;
  let shift = 0;
  for (let index = 0; index < Math.min(bytes.length, 5); index += 1) {
    const byte = bytes[index];
    value |= (byte & 0x7f) << shift;
    if (byte < 0x80) return value >>> 0;
    shift += 7;
  }
  return null;
}

function zipDirectory(bytes) {
  const signature = 0x06054b50;
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === signature) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("ZIP end-of-central-directory record not found");
  const totalEntries = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < totalEntries; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error(`ZIP central-directory entry ${index} is invalid`);
    const uncompressedBytes = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8").replaceAll("\\", "/");
    entries.push({ name, bytes: uncompressedBytes });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function isFrameCandidate(name) {
  return /(?:^|[\/_.-])(?:capture|packet|frame|websocket|public-body|public-frame)(?:[\/_.-]|$)/iu.test(name)
    || /\.(?:bin|dat|dump|dmp|mdmp|core|trace|har|pcap|pcapng|ndjson|jsonl|heapsnapshot|packet|replay)$/iu.test(name);
}

function isSafePath(path) {
  return !/(?:^|\/)(?:private|\.profile|cookies?|sessions?|tokens?)(?:\/|$)|(?:Login Data|Web Data|History)/iu.test(path);
}

function safeProtocol(value) {
  try {
    const protocol = new URL(value).protocol;
    return ["ws:", "wss:", "http:", "https:"].includes(protocol) ? protocol : "other";
  } catch {
    return "invalid";
  }
}

function markerCount(source, expression) {
  return [...source.matchAll(expression)].length;
}

function countBy(values, selector) {
  const output = {};
  for (const value of values) {
    const key = selector(value);
    output[key] = (output[key] ?? 0) + 1;
  }
  return output;
}

async function optionalSha256(path) {
  try {
    return sha256(await readFile(path));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function locateLegacyRoot() {
  if (process.env.NEA_LEGACY_WORKTREE_ROOT) return resolve(process.env.NEA_LEGACY_WORKTREE_ROOT);
  const marker = "legacy/box3-compat/src/wire/net-public-state.ts";
  for (const entry of await readdir(siblingRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "NEA-Project") continue;
    const candidate = resolve(siblingRoot, entry.name);
    try {
      await access(resolve(candidate, marker));
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Legacy worktree not found; set NEA_LEGACY_WORKTREE_ROOT to its local path");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
