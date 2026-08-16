import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const sources = {
  worldDocs: "dao3-docs-mirror/markdown/api/GameWorld/input.md",
  entityPhysicsDocs: "dao3-docs-mirror/markdown/api/GameEntity/physics.md",
  entityContact: "origin/origin/origin/api/GameEntityContact.js",
  voxelContact: "origin/origin/origin/api/GameVoxelContact.js",
  shell: "origin/origin/origin/shell/ScriptShell.js",
  entitySync: "origin/origin/origin/sync/ScriptEntitySync.js",
  contactSchema: "Middleware/runtime-compat/evidence/contact/cube-axis.js",
  cubeAxis: "Middleware/runtime-compat/evidence/contact/custom-schema.ts",
  localRuntime: "Frontend/demo-map/src/runtime/script-runtime.mjs",
  localPhysics: "Frontend/demo-map/src/runtime/physics/fixed-step-physics.mjs",
  conformance: "Middleware/runtime-compat/conformance/contact-state.mjs",
};
const text = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, path]) => [
  key,
  await readFile(resolve(repositoryRoot, path), "utf8"),
])));
const forceProduction = JSON.parse(await readFile(resolve(root, "generated", "contact-force-production-analysis.json"), "utf8"));
if (forceProduction.solverForce.status !== "confirmed") throw new Error("Historical contact force production is not confirmed");

requireMarkers("world contact documentation", text.worldDocs, [
  "#### GameEntityContactEvent",
  "| axis | [GameVector3]",
  "| entity | [GameEntity]",
  "| force | [GameVector3]",
  "| other | [GameEntity]",
  "| tick | number",
  "#### GameVoxelContactEvent",
  "| voxel | number",
  "| x | number",
  "| y | number",
  "| z | number",
]);
requireMarkers("active entity contact", text.entityContact, [
  "constructor(other, force, axis)",
  "this.other = other",
  "this.force = force",
  "this.axis = axis",
]);
requireMarkers("active voxel contact", text.voxelContact, [
  "constructor(x, y, z, voxel, force, axis)",
  "this.voxel = voxel",
  "this.force = force",
  "this.axis = axis",
]);
requireMarkers("origin event reconstruction", text.shell, [
  "event.physicsEvents.bodyContact.forEach",
  "new GameEntityContactEvent(ev.tick, entity.entity, other.entity, new GameVector3(ev.nx, ev.ny, ev.nz), new GameVector3(ev.fx, ev.fy, ev.fz))",
  "event.physicsEvents.voxelContact.forEach",
  "const normal = unpackAxis(ev.axis)",
  "new GameVoxelContactEvent(ev.tick, entity.entity, ev.x, ev.y, ev.z, b, normal, new GameVector3(ev.fx, ev.fy, ev.fz))",
]);
requireMarkers("authoritative contact state synchronization", text.entitySync, [
  "this._preTickComponent(ContactBinding, state.contact)",
]);
requireMarkers("contact state schema", text.contactSchema, [
  "t.BodyContactSchema = new a.MuStruct",
  "otherId: new a.MuVarint()",
  "nx: new a.MuFloat32()",
  "fx: new a.MuFloat32()",
  "t.VoxelContactSchema = new a.MuStruct",
  "axis: new a.MuInt8()",
  "t.ContactRecordSchema = new a.MuStruct",
  "body: t.BodyContactSetSchema",
  "voxel: t.VoxelContactSetSchema",
  "fluidVoxels: new a.MuArray",
  "fluidVolumeFraction: new a.MuArray",
]);
requireMarkers("cube axis mapping", text.cubeAxis, [
  "[ 1,  0,  0]",
  "[-1,  0,  0]",
  "[ 0,  1,  0]",
  "[ 0, -1,  0]",
  "[ 0,  0,  1]",
  "[ 0,  0, -1]",
]);
requireMarkers("local contact payload", text.localRuntime, [
  "export function createContactEvent(tick, entity, contact)",
  "const force = Vector3.from(contact.force ?? [0, 0, 0])",
  "force,",
  "collider.kind === \"voxel\" ? [] : [\"other\"]",
]);
requireMarkers("local impulse-derived force", text.localPhysics, [
  "(body.velocity[axis] - incoming) * body.mass / deltaTime",
  "(body.velocity.x - beforeX) * body.mass / deltaTime",
  "(body.velocity.z - beforeZ) * body.mass / deltaTime",
]);
requireMarkers("contact state conformance", text.conformance, [
  "export function unpackCubeAxis(axis)",
  "export function reconstructActiveContacts(record, entityIndex = new Map())",
  "contactForce: null",
]);

const evidence = Object.fromEntries(Object.entries(sources).map(([key, path]) => [key, { path, confidence: "direct" }]));
const model = {
  format: "nea-contact-event-model",
  version: 3,
  generatedAt: new Date().toISOString(),
  scope: "Server Script Runtime collision events and active contact value objects",
  canonicalEvents: [
    schema("GameEntityContactEvent", ["tick", "entity", "other", "axis", "force"], {
      wire: ["tick", "id", "otherId", "nx", "ny", "nz", "fx", "fy", "fz"],
      localStatus: "partial",
      unresolved: ["other: local static colliders are not GameEntity instances"],
      evidence: [evidence.worldDocs, evidence.shell],
    }),
    schema("GameVoxelContactEvent", ["tick", "entity", "x", "y", "z", "voxel", "axis", "force"], {
      wire: ["tick", "id", "x", "y", "z", "axis", "fx", "fy", "fz"],
      localStatus: "compatible",
      unresolved: [],
      evidence: [evidence.worldDocs, evidence.shell, evidence.localRuntime],
    }),
  ],
  activeContacts: [
    schema("GameEntityContact", ["other", "force", "axis"], { localStatus: "missing", unresolved: ["RuntimeEntity active contact storage is not implemented"], evidence: [evidence.entityContact, evidence.entityPhysicsDocs] }),
    schema("GameVoxelContact", ["x", "y", "z", "voxel", "force", "axis"], { localStatus: "missing", unresolved: ["RuntimeEntity active contact storage is not implemented"], evidence: [evidence.voxelContact, evidence.entityPhysicsDocs] }),
  ],
  authoritativeState: {
    schema: "ContactIndexSchema = sorted ContactRecordSchema[] by entity id",
    synchronization: "ScriptEntitySync.preTick applies ContactBinding to state.contact after RigidBodyBinding and DamageBinding",
    records: {
      ContactRecord: ["id", "body", "voxel", "fluidVoxels", "fluidVolumeFraction"],
      BodyContact: ["otherId", "nx", "ny", "nz", "fx", "fy", "fz"],
      VoxelContact: ["x", "y", "z", "b", "axis", "fx", "fy", "fz"],
      FluidContact: ["b", "volumeFraction"],
    },
    status: "confirmed-schema-partial-binding",
    unresolved: [
      "ContactBinding implementation is absent from the recovered origin tree.",
      "The exact GameEntity.contactForce aggregation rule across active contact records is not yet recovered.",
      "The exact construction and reuse policy for active contact value objects is not yet recovered.",
    ],
    evidence: [evidence.contactSchema, evidence.entitySync],
    conformance: {
      status: "covered",
      fixture: sources.conformance,
      tests: "Middleware/runtime-compat/test/contact-state-conformance.test.mjs",
      coveredMappings: ["body contact fields", "voxel contact fields", "fluid contact fields", "cube axis decoding"],
      excludedMappings: ["GameEntity.contactForce aggregation"],
    },
  },
  axis: {
    entityWire: "nx/ny/nz are reconstructed directly as GameVector3",
    voxelWire: "packed axis is passed through origin unpackAxis before event construction",
    local: "sweep contact normal is exposed as canonical axis and retained as the normal extension alias",
    packedMapping: {
      0: [1, 0, 0],
      1: [-1, 0, 0],
      2: [0, 1, 0],
      3: [0, -1, 0],
      4: [0, 0, 1],
      5: [0, 0, -1],
    },
    status: "confirmed",
    evidence: [evidence.contactSchema, evidence.cubeAxis, evidence.shell],
  },
  force: {
    wire: "fx/fy/fz are reconstructed as GameVector3",
    schema: "BodyContactSchema and VoxelContactSchema store fx/fy/fz as unquantized MuFloat32 fields",
    local: "The sweep solver projects its actual collision and ground-friction velocity deltas through force = mass * deltaVelocity / deltaTime, distributing simultaneous contacts evenly before GameVector3 event reconstruction.",
    status: "confirmed-historical-production-local-compatible",
    solver: forceProduction.solverForce,
    bodyProjection: forceProduction.bodyContactProjection,
    voxelProjection: forceProduction.voxelContactProjection,
    aggregateContactForce: forceProduction.contactForceProperty,
    evidence: [{ path: "Middleware/runtime-compat/generated/contact-force-production-analysis.json", confidence: "direct" }],
    policy: "Per-contact event force follows the recovered impulse-per-fixed-step formula; do not invent GameEntity.contactForce aggregation without ContactBinding evidence.",
  },
  localExtensions: {
    eventFields: ["player", "collider", "normal", "compatibility"],
    events: ["world.onContact", "world.onContactSeparate", "world.onTriggerEnter", "world.onTriggerLeave"],
    status: "extension",
  },
  evidence,
};

await mkdir(resolve(root, "abi"), { recursive: true });
await writeFile(resolve(root, "abi", "contact-event-model.json"), `${JSON.stringify(model, null, 2)}\n`);
console.log(`Built contact event model with ${model.canonicalEvents.length} canonical event schemas.`);

function schema(id, fields, details) {
  return { id, fields, ...details };
}

function requireMarkers(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} evidence missing: ${marker}`);
  }
}
