import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const legacyRoot = await locateLegacyRoot();
const outputPath = resolve(root, "generated", "legacy-worktree-posture-inventory.json");

const paths = {
  archivedBundle: "archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js",
  beautifiedBundle: "Middleware/runtime-compat/evidence/legacy/734.8dcb480d99773395.js",
  replayData: "Middleware/runtime-compat/evidence/legacy/replay-data.ts",
  fakeServer: "Middleware/runtime-compat/evidence/legacy/fake-server.ts",
  publicProducer: "legacy/box3-compat/src/wire/net-public-state.ts",
  playerMotor: "legacy/box3-compat/src/game/runtime/player-motor.ts",
  fixedPreparation: "legacy/box3-compat/src/game/runtime/historical-physics-fixed-preparation.ts",
  activePreparation: "legacy/box3-compat/src/game/runtime/historical-physics-active-preparation.ts",
};

const sources = {};
for (const [name, path] of Object.entries(paths)) sources[name] = await sourceEvidence(path);

const archivedBundle = await text(paths.archivedBundle);
const beautifiedBundle = await text(paths.beautifiedBundle);
const archivedMotor = webpackModule(archivedBundle, 7166, "minified");
const beautifiedMotor = webpackModule(beautifiedBundle, 7166, "beautified");
const motorShapeWrites = shapeWrites(beautifiedMotor);
const crouchBoundsReads = ["rx", "ry", "rz"].filter(field => new RegExp(`\\b[A-Za-z_$][\\w$]*\\.${field}\\b`).test(crouchBranch(beautifiedMotor)));

const publicProducer = await text(paths.publicProducer);
const playerProducer = sliceBetween(publicProducer, "for (const player of input.players)", "for (const entity of input.entities ?? [])");
const entityProducer = publicProducer.slice(publicProducer.indexOf("for (const entity of input.entities ?? [])"));

const fixedPreparation = await text(paths.fixedPreparation);
const activePreparation = await text(paths.activePreparation);
const replayData = await text(paths.replayData);
const replayMessages = [...replayData.matchAll(/proto:\s*"([^"]+)",\s*msg:\s*"([^"]+)"/g)]
  .map(match => `${match[1]}/${match[2]}`);
const logInventory = await inventoryLogs("logs");
const binaryCandidates = await inventoryBinaryCandidates([
  "fixtures",
  "logs",
  "test-results",
  "Middleware/runtime-compat/evidence/legacy",
  "dump",
]);

const inventory = {
  format: "nea-legacy-worktree-posture-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot: "sibling-local-worktree",
  sources,
  archivedPlayerMotor: {
    module: 7166,
    archivedModuleSha256: sha256(archivedMotor),
    beautifiedModuleSha256: sha256(beautifiedMotor.replace(/\s+/g, "")),
    standingConstants: {
      width: markerNumber(beautifiedMotor, /PLAYER_WIDTH\s*=\s*([0-9.]+)/),
      height: markerNumber(beautifiedMotor, /PLAYER_HEIGHT\s*=\s*([0-9.]+)/),
    },
    postureStatePresent: {
      crouch: beautifiedMotor.includes("PlayerWalkState.CROUCH"),
      flying: beautifiedMotor.includes("PlayerFlyState.FLYING"),
    },
    bodyShapeWrites: motorShapeWrites,
    crouchGroundedBranch: {
      present: crouchBranch(beautifiedMotor).length > 0,
      boundsFieldsRead: crouchBoundsReads,
      purpose: "edge-occupancy-query",
      shapeMutation: motorShapeWrites.length > 0 ? "present" : "absent",
    },
    conclusion: "The archived client motor reads the current body bounds while crouching to restrict edge movement, but does not write rx/ry/rz or hsx/hsy/hsz.",
  },
  historicalPhysicsPreparation: {
    activeBodyFieldCopies: copiedBodyFields(activePreparation),
    fixedBodyFieldCopies: copiedBodyFields(fixedPreparation),
    classification: "consumer-only",
    conclusion: "The recovered preparation stages copy existing body bounds and shape fields into solver scratch arrays; they do not determine posture-specific values.",
  },
  legacyPublicProducer: {
    playerBodyWrites: shapeWrites(playerProducer),
    entityBodyWrites: shapeWrites(entityProducer),
    playerUsesRigidBodyIdentity: playerProducer.includes("RigidBodySchema.clone(RigidBodySchema.identity)"),
    classification: "local-reproduction-not-historical-evidence",
    conclusion: "The old local player producer leaves all six size fields at generic schema identity; only its entity path writes rx/ry/rz.",
  },
  replayData: {
    messageCount: replayMessages.length,
    messages: [...new Set(replayMessages)].sort(),
    hasGameNetRawFrame: false,
    hasPublicBodyDelta: false,
    conclusion: "The replay is an already-decoded initialization-message list. It contains no raw gameNet frame and no PUBLIC body delta.",
  },
  localArtifacts: {
    logs: logInventory,
    binaryCandidates,
    serverToClientPublicFrameCount: 0,
  },
  authoritativePostureDelta: {
    status: "unresolved",
    missingFields: ["rx", "ry", "rz", "hsx", "hsy", "hsz"],
    requiredEvidence: "historical server-to-client PUBLIC body delta or equivalent authoritative server producer",
  },
  safety: {
    excludedPaths: ["dump/private", ".git", "node_modules"],
    emittedContent: "metadata-hashes-marker-counts-only",
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log("Inventoried legacy worktree posture evidence; authoritative crouch/fly body deltas remain unresolved.");

async function sourceEvidence(path) {
  const absolute = resolve(legacyRoot, path);
  try {
    const bytes = await readFile(absolute);
    return { path: normalize(path), bytes: bytes.length, sha256: sha256(bytes) };
  } catch (error) {
    if (error?.code === "ENOENT") return { path: normalize(path), missing: true };
    throw error;
  }
}

async function text(path) {
  return readFile(resolve(legacyRoot, path), "utf8");
}

function webpackModule(source, id, style) {
  const expression = style === "beautified"
    ? /^\s*(\d+):\s*function\s*\(/gm
    : /(?:^|,)(\d+):function\(/g;
  const headers = [...source.matchAll(expression)].map(match => ({ id: Number(match[1]), start: match.index }));
  const index = headers.findIndex(header => header.id === id);
  if (index < 0) throw new Error(`Webpack module ${id} not found in ${style} bundle`);
  return source.slice(headers[index].start, headers[index + 1]?.start ?? source.length);
}

function shapeWrites(source) {
  return [...source.matchAll(/\b([A-Za-z_$][\w$]*)\.(rx|ry|rz|hsx|hsy|hsz)\s*=/g)]
    .map(match => ({ receiver: match[1], field: match[2] }));
}

function crouchBranch(source) {
  const start = source.indexOf("PlayerWalkState.CROUCH");
  if (start < 0) return "";
  return source.slice(Math.max(0, start - 400), Math.min(source.length, start + 1800));
}

function copiedBodyFields(source) {
  return [...new Set([...source.matchAll(/body\.(rx|ry|rz|hsx|hsy|hsz)\b/g)].map(match => match[1]))].sort();
}

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) throw new Error(`Unable to slice producer between ${startNeedle} and ${endNeedle}`);
  return source.slice(start, end);
}

function markerNumber(source, expression) {
  const match = source.match(expression);
  if (!match) throw new Error(`Numeric marker missing: ${expression}`);
  return Number(match[1]);
}

async function inventoryLogs(path) {
  const absolute = resolve(legacyRoot, path);
  const files = await readdir(absolute, { withFileTypes: true });
  const result = [];
  for (const entry of files.filter(value => value.isFile()).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = resolve(absolute, entry.name);
    const value = await readFile(file, "utf8");
    result.push({
      file: normalize(relative(legacyRoot, file)),
      bytes: (await stat(file)).size,
      sha256: sha256(value),
      markerCounts: Object.fromEntries(["PUBLIC", "BIN(", "raw", "rx", "hsx", "crouch", "fly"].map(marker => [marker, countMarker(value, marker)])),
    });
  }
  return result;
}

async function inventoryBinaryCandidates(roots) {
  const result = [];
  for (const rootPath of roots) await walk(resolve(legacyRoot, rootPath), result);
  return result.sort((a, b) => a.file.localeCompare(b.file));
}

async function walk(directory, result) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    const local = normalize(relative(legacyRoot, absolute));
    if (local === "dump/private" || local.startsWith("dump/private/") || entry.name === ".git" || entry.name === "node_modules") continue;
    if (entry.isDirectory()) {
      await walk(absolute, result);
      continue;
    }
    if (!entry.isFile() || !isBinaryCandidate(entry.name)) continue;
    const bytes = await readFile(absolute);
    result.push({ file: local, bytes: bytes.length, sha256: sha256(bytes) });
  }
}

function isBinaryCandidate(name) {
  return /\.(?:bin|dat|dump|dmp|mdmp|core|trace|har|pcap|pcapng|ndjson|jsonl|heapsnapshot|packet|replay)$/i.test(name)
    || /(?:capture|packet|frame|websocket|public-body|public-frame)/i.test(name);
}

function countMarker(source, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(escaped, "gi"))].length;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}

async function locateLegacyRoot() {
  if (process.env.NEA_LEGACY_WORKTREE_ROOT) return resolve(process.env.NEA_LEGACY_WORKTREE_ROOT);
  const parent = resolve(repositoryRoot, "..");
  const marker = "legacy/box3-compat/src/wire/net-public-state.ts";
  for (const entry of await readdir(parent, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "NEA-Project") continue;
    const candidate = resolve(parent, entry.name);
    try {
      await access(resolve(candidate, marker));
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Legacy worktree not found; set NEA_LEGACY_WORKTREE_ROOT to its local path");
}
