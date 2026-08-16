import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const relativeBundlePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js";
const bundlePath = resolve(repositoryRoot, relativeBundlePath);
const source = await readFile(bundlePath, "utf8");
const sha256 = createHash("sha256").update(source).digest("hex");
const relativeReferencePath = process.env.NEA_EXTERNAL_REFERENCE_SOURCE ?? "Middleware/runtime-compat/evidence/player-body-source.ts";
const referenceSource = await readFile(resolve(repositoryRoot, relativeReferencePath), "utf8");
for (const marker of [
  "this.boundingBox = new Vector3Adapter(body, 'rx', 'ry', 'rz')",
  "this.halfExtents = new Vector3Adapter(body, 'hsx', 'hsy', 'hsz')",
  "return this.bodies.filter(v => v.id in playerIndex)",
]) {
  if (!referenceSource.includes(marker)) throw new Error(`Player body evidence no longer contains ${marker}`);
}
const moduleHeaders = [...source.matchAll(/(?:^|,)(\d+):function\(/g)].map(match => ({ id: Number(match[1]), start: match.index }));
const modules = new Map(moduleHeaders.map((header, index) => [
  header.id,
  source.slice(header.start, moduleHeaders[index + 1]?.start ?? source.length),
]));

const expected = {
  2534: ["RigidBodySchema", "r.rx=a&1<<O", "r.ry=a&2<<O", "r.rz=a&4<<O"],
  62864: ["P.minX=Math.min(l,I)-d", "P.minY=Math.min(h,E)-p", "P.minZ=Math.min(f,C)-g"],
  7166: ["f.physGround=!1", "if(2===p[M].axis)", "if(_.ny&&_.fy>S)", "PlayerWalkState.CROUCH", "t.PLAYER_WIDTH=.45", "t.PLAYER_HEIGHT=1.1"],
  51531: ["a.ry/p.PLAYER_HEIGHT", "var u=.5+a.ry"],
  70648: ["stepHeight:new x.MuQuantizedFloat", "1.25", "crouchSpeed"],
  89168: ["TERRAIN_Y_CONTACTS.pushMotor", "boxSweepIntersect"],
};

for (const [idText, needles] of Object.entries(expected)) {
  const id = Number(idText);
  const moduleSource = modules.get(id);
  if (!moduleSource) throw new Error(`Historical Player module ${id} was not found`);
  for (const needle of needles) {
    if (!moduleSource.includes(needle)) throw new Error(`Historical Player module ${id} no longer contains ${needle}`);
  }
}

const motorSource = modules.get(7166);
const rigidBodyWrites = [...source.matchAll(/([A-Za-z_$][\w$]*(?:\[[^\]]+\])?)\.(rx|ry|rz)\s*=\s*([^,;})]{1,120})/g)].map(match => ({
  offset: match.index,
  module: moduleAt(match.index),
  field: match[2],
  expression: match[3],
}));
const shapeHalfExtentWrites = [...source.matchAll(/([A-Za-z_$][\w$]*(?:\[[^\]]+\])?)\.(hsx|hsy|hsz)\s*=\s*([^,;})]{1,120})/g)].map(match => ({
  offset: match.index,
  module: moduleAt(match.index),
  field: match[2],
  expression: match[3],
}));
const motorShapeWrites = [...rigidBodyWrites, ...shapeHalfExtentWrites].filter(write => write.module === 7166);

const analysis = {
  format: "nea-player-physics-bundle-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: { path: relativeBundlePath, bytes: Buffer.byteLength(source), sha256 },
  corroboration: {
    externalReference: {
      path: relativeReferencePath,
      bytes: Buffer.byteLength(referenceSource),
      sha256: createHash("sha256").update(referenceSource).digest("hex"),
      playerBinding: "Body id is selected through state.playerIndex; self body id is state.secret.id.",
      boundsFields: ["rx", "ry", "rz"],
      shapeHalfExtentFields: ["hsx", "hsy", "hsz"],
    },
  },
  rigidBody: {
    schemaModule: 2534,
    boundsRepresentation: "axis-aligned-broadphase-half-extents-rx-ry-rz",
    shapeRepresentation: "local-shape-half-extents-hsx-hsy-hsz",
    positionRepresentation: "body-center-px-py-pz",
    wireQuantization: 1 / 256,
    boundsWriteSites: rigidBodyWrites,
    shapeWriteSites: shapeHalfExtentWrites,
    defaultPlayerProfile: {
      boundsHalfExtents: [0.45, 1.1, 0.45],
      shapeHalfExtents: [0.45, 1.1, 0.45],
      dimensions: [0.9, 2.2, 0.9],
      status: "confirmed",
      basis: "Player physics exports PLAYER_WIDTH=0.45 and PLAYER_HEIGHT=1.1; camera and animation normalize body.ry by PLAYER_HEIGHT, while broadphase and contact code use position plus/minus rx/ry/rz.",
    },
  },
  posture: {
    motorModule: 7166,
    clientMotorShapeWriteCount: motorShapeWrites.length,
    crouch: {
      confirmedEffects: ["crouch-speed", "crouch-acceleration", "edge-occupancy-limiting"],
      shapeMutation: motorShapeWrites.length === 0 ? "not-found-in-client-motor" : "present",
      conclusion: "No client-local rx/ry/rz write was found; server-authoritative body deltas may still change shape.",
    },
    flying: {
      confirmedEffects: ["gravity-flag", "collision-flag", "vertical-motor-force"],
      shapeMutation: motorShapeWrites.length === 0 ? "not-found-in-client-motor" : "present",
      conclusion: "No client-local rx/ry/rz write was found; server-authoritative body deltas may still change shape.",
    },
  },
  grounded: {
    updateModule: 7166,
    voxelRule: "voxel contact axis 2 sets physGround true",
    bodyRule: "a body contact with non-zero ny replaces support when fy exceeds the current support force",
    voxelPlatformVelocity: "weighted by absolute voxel fy",
    bodyPlatformVelocity: "copied from the strongest supporting body",
  },
  movement: {
    playerSchemaModule: 70648,
    defaultStepHeight: 1.25,
  },
  terrain: {
    contactModule: 89168,
    downwardYMode: "pushMotor",
    otherAxesMode: "push",
  },
  unresolved: [
    "server-authoritative crouch body deltas",
    "server-authoritative flying body deltas",
  ],
};

const outputPath = resolve(root, "generated", "player-physics-bundle-analysis.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Analyzed Player physics modules; ${rigidBodyWrites.length} rx/ry/rz writes, ${motorShapeWrites.length} in player motor.`);

function moduleAt(offset) {
  let low = 0;
  let high = moduleHeaders.length - 1;
  let selected = moduleHeaders[0];
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (moduleHeaders[middle].start <= offset) {
      selected = moduleHeaders[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return selected.id;
}
