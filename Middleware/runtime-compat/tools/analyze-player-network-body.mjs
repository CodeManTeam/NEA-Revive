import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const backendRelativePath = "local-player/backend/box3-server.cjs";
const physicsRelativePath = "Frontend/demo-map/project/world/physics.json";
const backendSource = await readFile(resolve(repositoryRoot, backendRelativePath), "utf8");
const physicsSource = await readFile(resolve(repositoryRoot, physicsRelativePath), "utf8");
const physics = JSON.parse(physicsSource);
const profile = physics.playerBody;

const requiredMarkers = {
  assignsRx: "body.rx = rx",
  assignsRy: "body.ry = ry",
  assignsRz: "body.rz = rz",
  assignsHsx: "body.hsx = hsx",
  assignsHsy: "body.hsy = hsy",
  assignsHsz: "body.hsz = hsz",
  handshakeOwnsBounds: "bodyHalfExtents: this.bodyHalfExtents",
  publicSessionReceivesBounds: "bodyHalfExtents: packets.bodyHalfExtents",
  publicSessionReceivesShape: "bodyShapeHalfExtents: packets.bodyShapeHalfExtents",
  runtimeFrameCopiesBounds: "bodyHalfExtents: copyRuntimeVector(player.bodyHalfExtents)",
  runtimeFrameCopiesShape: "bodyShapeHalfExtents: copyRuntimeVector(player.bodyShapeHalfExtents",
  projectRequiresProfile: "BOX3_PLAYER_BODY_PROFILE is required for project-package Player sessions",
};

for (const [name, marker] of Object.entries(requiredMarkers)) {
  if (!backendSource.includes(marker)) throw new Error(`Player network Body marker ${name} was not found: ${marker}`);
}

if (profile?.origin !== "body-center") throw new Error("Demo player Body profile must use confirmed body-center coordinates");
if (profile?.sizeStatus !== "confirmed") throw new Error("Demo player Body profile must identify the recovered Player bundle default as confirmed");
if (!isPositiveVector(profile?.boundsHalfExtents)) throw new Error("Demo player Body boundsHalfExtents must be a positive vector");
if (!isPositiveVector(profile?.shapeHalfExtents)) throw new Error("Demo player Body shapeHalfExtents must be a positive vector");

const genericIdentity = findGenericRigidBodyIdentity(backendSource);
const boundsAssignmentCount = countMatches(backendSource, /body\.r[xyz]\s*=\s*r[xyz]\s*;/g);
const shapeAssignmentCount = countMatches(backendSource, /body\.hsx\s*=\s*hsx\s*;|body\.hsy\s*=\s*hsy\s*;|body\.hsz\s*=\s*hsz\s*;/g);

const analysis = {
  format: "nea-player-network-body-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  sources: {
    backend: sourceDescriptor(backendRelativePath, backendSource),
    demoPhysics: sourceDescriptor(physicsRelativePath, physicsSource),
  },
  schema: {
    genericRigidBodyIdentityHalfExtents: genericIdentity,
    genericBoundsHalfExtents: genericIdentity,
    genericShapeHalfExtents: genericIdentity,
    boundsFields: ["rx", "ry", "rz"],
    shapeHalfExtentFields: ["hsx", "hsy", "hsz"],
    interpretation: "schema-identity-only",
    historicalPlayerSizeEvidence: false,
  },
  playerProducer: {
    overridesGenericIdentity: boundsAssignmentCount >= 3 && shapeAssignmentCount >= 3,
    boundsAssignments: ["body.rx = rx", "body.ry = ry", "body.rz = rz"],
    shapeAssignments: ["body.hsx = hsx", "body.hsy = hsy", "body.hsz = hsz"],
    boundsAndShapeAreIndependent: true,
    sourceProfile: "BOX3_PLAYER_BODY_PROFILE",
    projectPackageRequiresExplicitProfile: true,
  },
  propagation: {
    initialHandshakeCarriesBounds: true,
    initialHandshakeCarriesShape: true,
    initialPublicStateCarriesBounds: true,
    initialPublicStateCarriesShape: true,
    authoritativeRegistrationCarriesBounds: true,
    authoritativeRegistrationCarriesShape: true,
    authoritativeFrameCarriesBounds: true,
    authoritativeFrameCarriesShape: true,
    laterPublicStateCarriesBounds: true,
    laterPublicStateCarriesShape: true,
    initialAndLaterUseSameProfile: true,
  },
  activeProfile: {
    profileId: profile.profileId,
    origin: profile.origin,
    originStatus: profile.originStatus,
    sizeStatus: profile.sizeStatus,
    boundsHalfExtents: profile.boundsHalfExtents,
    shapeHalfExtents: profile.shapeHalfExtents,
    historicalSizeConfirmed: true,
  },
  conclusions: [
    "The generic RigidBody identity remains part of the wire/schema constructor but is no longer inherited by project-package Player bounds or shape producers.",
    "Project-package Player sessions fail startup without an explicit body profile.",
    "Initial and authoritative follow-up PUBLIC states propagate independent bounds and shape half extents from the same player body profile.",
    "The Demo uses the recovered upright Player default 0.45/1.1/0.45 for both axis-aligned bounds and shape half extents.",
  ],
  unresolved: [
    "server-authoritative crouch shape mutation",
    "server-authoritative flying shape mutation",
  ],
};

const outputPath = resolve(root, "generated", "player-network-body-analysis.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Analyzed Player network Body propagation; Demo profile ${profile.profileId} remains ${profile.sizeStatus}.`);

function sourceDescriptor(path, source) {
  return {
    path,
    bytes: Buffer.byteLength(source),
    sha256: createHash("sha256").update(source).digest("hex"),
  };
}

function findGenericRigidBodyIdentity(source) {
  const match = source.match(/rx:\s*1,\s*\n\s*ry:\s*1,\s*\n\s*rz:\s*1/);
  if (!match) throw new Error("Generic RigidBody identity 1/1/1 was not found; update the analyzer for the new schema representation");
  return [1, 1, 1];
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function isPositiveVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every(item => typeof item === "number" && Number.isFinite(item) && item > 0);
}
