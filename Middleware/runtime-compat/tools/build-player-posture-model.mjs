import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const bundlePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js";
const bundle = await readFile(resolve(repositoryRoot, bundlePath), "utf8");
const physics = await readJson("generated/player-physics-bundle-analysis.json");
const captures = await readJson("generated/local-capture-inventory.json");
const profileInventory = await readJson("generated/player-profile-network-inventory.json");
const legacyInventory = await readJson("generated/legacy-worktree-posture-inventory.json");
const evidenceCoverage = await readJson("generated/authoritative-runtime-evidence-coverage.json");
const stateModule = webpackModule(bundle, 70648);
const motorModule = webpackModule(bundle, 7166);

for (const marker of [
  'c[c.FLYING=1]="FLYING"',
  'l[l.MASK=12]="MASK"',
  'l[l.CROUCH=0]="CROUCH"',
  'l[l.WALK=4]="WALK"',
  'l[l.RUN=8]="RUN"',
  'f[f.CROUCH=64]="CROUCH"',
  'S[S.ALLOW_FLIGHT=2]="ALLOW_FLIGHT"',
  'S[S.ALLOW_CROUCH=128]="ALLOW_CROUCH"',
]) if (!stateModule.includes(marker)) throw new Error(`Player state ABI evidence missing: ${marker}`);
for (const marker of [
  "t.PLAYER_WIDTH=.45",
  "t.PLAYER_HEIGHT=1.1",
  "PlayerWalkState.CROUCH",
  "t.crouchSpeed",
  "t.crouchAcceleration",
  "t.flySpeed",
  "t.flyAcceleration",
]) if (!motorModule.includes(marker)) throw new Error(`Player posture motor evidence missing: ${marker}`);
if (physics.posture.clientMotorShapeWriteCount !== 0) throw new Error("Client motor now contains shape writes; posture model requires re-audit");
if (!captures.captures.every(capture => capture.hasReceivedBinary === false)) throw new Error("A server-to-client binary capture is now available; posture model requires decoding");
if (profileInventory.publicFrameEvidence.serverToClientBinaryFrames !== 0) throw new Error("A Player profile PUBLIC frame is now available; posture model requires decoding");
if (legacyInventory.localArtifacts.serverToClientPublicFrameCount !== 0) throw new Error("A legacy-worktree PUBLIC frame is now available; posture model requires decoding");
if (legacyInventory.archivedPlayerMotor.bodyShapeWrites.length !== 0) throw new Error("Legacy archived motor now contains shape writes; posture model requires re-audit");
if (evidenceCoverage.postureShapeProducer.status !== "not-found-in-indexed-local-evidence") throw new Error("An authoritative posture producer candidate is now available; posture model requires re-audit");

const model = {
  format: "nea-physics-player-posture-abi",
  version: 2,
  generatedAt: new Date().toISOString(),
  stateEncoding: {
    PlayerFlyState: { shift: 0, bits: 1, mask: 1, values: { NOT_FLYING: 0, FLYING: 1 } },
    PlayerWalkState: { shift: 2, bits: 2, mask: 12, values: { CROUCH: 0, WALK: 4, RUN: 8 } },
    PlayerButtonState: { shift: 4, bits: 5, mask: 496, values: { WALK: 16, JUMP: 32, CROUCH: 64, ACTION_0: 128, ACTION_1: 256 } },
    PlayerJumpState: { shift: 9, bits: 3, mask: 3584, values: { GROUND: 0, SWIM: 512, JUMP: 1024, FALL: 1536, DOUBLE_JUMP: 2048 } },
    PlayerFlags: { ALLOW_FLIGHT: 2, ALLOW_MOVE: 4, ALLOW_JUMP: 32, ALLOW_DOUBLE_JUMP: 64, ALLOW_CROUCH: 128 },
  },
  standing: {
    status: "confirmed",
    halfExtents: physics.rigidBody.defaultPlayerProfile.boundsHalfExtents,
    dimensions: physics.rigidBody.defaultPlayerProfile.dimensions,
    origin: "body-center",
  },
  crouching: {
    stateStatus: "confirmed",
    confirmedClientEffects: physics.posture.crouch.confirmedEffects,
    clientShapeMutation: "absent",
    authoritativeShape: evidenceDeferredShape(),
  },
  flying: {
    stateStatus: "confirmed",
    confirmedClientEffects: physics.posture.flying.confirmedEffects,
    clientShapeMutation: "absent",
    authoritativeShape: evidenceDeferredShape(),
  },
  compatibilityPolicy: {
    onUnknownAuthoritativeShape: "preserve-current-collider",
    requireCompleteAuthoritativeShape: true,
    historicalClaim: false,
  },
  authority: {
    bodyShapeOwner: "authoritative-game-runtime",
    clientMotorMayWriteShape: false,
    evidenceAvailable: "The explicit captures, inspected Player profile stores, and legacy worktree contain no historical binary server-to-client PUBLIC body frame.",
    policy: "Do not synthesize crouch or flying half extents. Keep their historical fields null; preserving the current collider is a local compatibility policy, not a recovered historical value.",
  },
  evidence: [
    { type: "player-bundle", path: bundlePath, module: 70648, sha256: createHash("sha256").update(stateModule).digest("hex"), finding: "Player state and capability bit assignments." },
    { type: "player-bundle", path: bundlePath, module: 7166, sha256: createHash("sha256").update(motorModule).digest("hex"), finding: "Standing dimensions and posture motor behavior; no shape writes." },
    { type: "derived", path: "Middleware/runtime-compat/generated/player-physics-bundle-analysis.json", finding: "Client motor shape write inventory." },
    { type: "derived", path: "Middleware/runtime-compat/generated/local-capture-inventory.json", finding: "No binary server-to-client PUBLIC frames are available." },
    { type: "derived", path: "Middleware/runtime-compat/generated/player-profile-network-inventory.json", finding: "Service Worker cache and browser state stores contain no persisted server-to-client MuDB PUBLIC frame." },
    { type: "derived", path: "Middleware/runtime-compat/generated/legacy-worktree-posture-inventory.json", finding: "The old worktree contains client-side posture consumers and a synthetic incomplete producer, but no authoritative posture delta." },
    { type: "derived", path: "Middleware/runtime-compat/generated/authoritative-runtime-evidence-coverage.json", finding: "Origin, external reference evidence, backend, archived Player, browser profile and legacy worktree contain no indexed crouch/fly-conditioned authoritative shape producer." },
  ],
};

await writeFile(resolve(root, "abi", "physics-player-posture.json"), `${JSON.stringify(model, null, 2)}\n`);
console.log("Built Player posture ABI; unknown authoritative posture shapes are explicit null fields.");

function evidenceDeferredShape() {
  return {
    status: "evidence-deferred",
    boundsHalfExtents: null,
    shapeHalfExtents: null,
    dimensions: null,
    wireFields: {
      rx: null,
      ry: null,
      rz: null,
      hsx: null,
      hsy: null,
      hsz: null,
    },
  };
}

function webpackModule(source, id) {
  const headers = [...source.matchAll(/(?:^|,)(\d+):function\(/g)].map(match => ({ id: Number(match[1]), start: match.index }));
  const index = headers.findIndex(header => header.id === id);
  if (index < 0) throw new Error(`Webpack module ${id} not found`);
  return source.slice(headers[index].start, headers[index + 1]?.start ?? source.length);
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
