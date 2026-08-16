import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const sourcePath = "Frontend/demo-map/src/runtime/vector3.mjs";
const originPath = "origin/origin/origin/api/GameVector3.js";
const playerMathPath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/457.36bf26873ad51e54.js";
const boundsSourcePath = "Frontend/demo-map/src/runtime/game-zones.mjs";
const boundsOriginPath = "origin/origin/origin/api/GameBounds3.js";
const quaternionSourcePath = "Frontend/demo-map/src/runtime/quaternion.mjs";
const quaternionOriginPath = "origin/origin/origin/api/GameQuaternion.js";
const colorSourcePath = "Frontend/demo-map/src/runtime/colors.mjs";
const rgbOriginPath = "origin/origin/origin/api/GameRGBColor.js";
const rgbaOriginPath = "origin/origin/origin/api/GameRGBAColor.js";
const eventSignalSourcePath = "Frontend/demo-map/src/runtime/event-signal.mjs";
const eventTokenOriginPath = "origin/origin/origin/api/GameEventHandlerToken.js";
const dispatcherOriginPath = "origin/origin/origin/ScriptDispatcher.js";
const playerRuntimePath = "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js";
const source = await readFile(resolve(repositoryRoot, sourcePath), "utf8");
const originSource = await readFile(resolve(repositoryRoot, originPath), "utf8");
const playerMathSource = await readFile(resolve(repositoryRoot, playerMathPath), "utf8");
const boundsSource = await readFile(resolve(repositoryRoot, boundsSourcePath), "utf8");
const boundsOriginSource = await readFile(resolve(repositoryRoot, boundsOriginPath), "utf8");
const quaternionSource = await readFile(resolve(repositoryRoot, quaternionSourcePath), "utf8");
const quaternionOriginSource = await readFile(resolve(repositoryRoot, quaternionOriginPath), "utf8");
const colorSource = await readFile(resolve(repositoryRoot, colorSourcePath), "utf8");
const rgbOriginSource = await readFile(resolve(repositoryRoot, rgbOriginPath), "utf8");
const rgbaOriginSource = await readFile(resolve(repositoryRoot, rgbaOriginPath), "utf8");
const eventSignalSource = await readFile(resolve(repositoryRoot, eventSignalSourcePath), "utf8");
const eventTokenOriginSource = await readFile(resolve(repositoryRoot, eventTokenOriginPath), "utf8");
const dispatcherOriginSource = await readFile(resolve(repositoryRoot, dispatcherOriginPath), "utf8");
const playerRuntimeSource = await readFile(resolve(repositoryRoot, playerRuntimePath), "utf8");
const docs = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));

for (const marker of ["static fromPolar", "sub(value)", "mul(value)", "div(value)", "addEq(value)", "divEq(value)", "dot(value)", "cross(value)", "lerp(value, factor)", "normalize()", "angle(value)", "exactEquals(value)", "equals(value)", "export const GameVector3 = Vector3"]) {
  if (!source.includes(marker)) throw new Error(`Local shared Vector3 implementation missing ${marker}`);
}
for (const marker of ["static fromPolar(mag, phi, theta)", "divEq(v)", "towards(v)", "return `{ x:${this.x}, y:${this.y}, z:${this.z} }`;"]) {
  if (!originSource.includes(marker)) throw new Error(`Origin GameVector3 evidence missing ${marker}`);
}
if (!playerMathSource.includes('EPSILON:function(){return e}') || !playerMathSource.includes('var e=1e-6')) {
  throw new Error("Archived Player math epsilon evidence missing");
}
for (const marker of ["export class GameBounds3", "static fromPoints(...points)", "lo.x = lo.y = lo.z = Infinity", "hi.x = hi.y = hi.z = -Infinity", "this.lo = lo instanceof Vector3 ? lo : Vector3.from(lo)", "this.hi = hi instanceof Vector3 ? hi : Vector3.from(hi)", "intersect(bounds)", "contains(point)", "containsBounds(bounds)", "intersects(bounds)", "set(lox, loy, loz, hix, hiy, hiz)", "copy(bounds)", "toString()"]) {
  if (!boundsSource.includes(marker)) throw new Error(`Local GameBounds3 implementation missing ${marker}`);
}
for (const marker of ["class GameBounds3", "static fromPoints(...points)", "intersect(b)", "contains(b)", "containsBounds(b)", "intersects(b)", "set(lox, loy, loz, hix, hiy, hiz)", "copy(b)", "toString()", "this.lo = lo", "this.hi = hi"]) {
  if (!boundsOriginSource.includes(marker)) throw new Error(`Origin GameBounds3 evidence missing ${marker}`);
}
for (const marker of ["export class GameQuaternion", "static rotationBetween(a, b)", "static fromAxisAngle(axis, radians)", "static fromEuler(x, y, z)", "getAxisAngle(quaternion)", "new Vector3(q.x/s,q.y/s,q.z/s)", "rotateX(r)", "rotateY(r)", "rotateZ(r)", "dot(q)", "mul(q)", "inv()", "slerp(q,n)", "normalize()", "equals(q)", "toString()"]) {
  if (!quaternionSource.includes(marker)) throw new Error(`Local GameQuaternion implementation missing ${marker}`);
}
for (const marker of ["class GameQuaternion", "static rotationBetween(a, b)", "static fromAxisAngle(axis, rad)", "static fromEuler(x, y, z)", "getAxisAngle(_q)", "new GameVector3(q.x / s, q.y / s, q.z / s)", "rotateX(_rad)", "rotateY(_rad)", "rotateZ(_rad)", "dot(q)", "mul(q)", "inv()", "slerp(q, n)", "normalize()", "equals(q)", "toString()", "constructor(w, x, y, z)"]) {
  if (!quaternionOriginSource.includes(marker)) throw new Error(`Origin GameQuaternion evidence missing ${marker}`);
}
for (const marker of ["export class GameRGBColor", "static random()", "div(c)", "divEq(c)", "lerp(c,n)", "equals(c)", "toRGBA()", "export class GameRGBAColor", "blendEq(rgb)"]) {
  if (!colorSource.includes(marker)) throw new Error(`Local color implementation missing ${marker}`);
}
for (const marker of ["class GameRGBColor", "static random()", "div(rgb)", "divEq(rgb)", "lerp(rgb, n)", "equals(rgb)", "toRGBA()", "constructor(r, g, b)"]) {
  if (!rgbOriginSource.includes(marker)) throw new Error(`Origin GameRGBColor evidence missing ${marker}`);
}
for (const marker of ["class GameRGBAColor", "div(rgba)", "divEq(rgba)", "lerp(rgba, n)", "blendEq(rgb)", "equals(rgba)", "constructor(r, g, b, a)"]) {
  if (!rgbaOriginSource.includes(marker)) throw new Error(`Origin GameRGBAColor evidence missing ${marker}`);
}
for (const marker of ["export class GameEventHandlerToken", "this.cancel = cancel", "this.resume = resume", "this.active = active", "return new GameEventHandlerToken(", "record.finished = true", "record.finished = false", "if (!record.inQueue)", "() => !record.finished"]) {
  if (!eventSignalSource.includes(marker)) throw new Error(`Local event token implementation missing ${marker}`);
}
for (const marker of ["class GameEventHandlerToken", "this.cancel = cancel", "this.resume = resume", "this.active = active"]) {
  if (!eventTokenOriginSource.includes(marker)) throw new Error(`Origin GameEventHandlerToken evidence missing ${marker}`);
}
for (const marker of ["return new GameEventHandlerToken", "record.finished = true", "record.finished = false", "()=>!record.finished", "if (this.destroyed)"]) {
  if (!dispatcherOriginSource.includes(marker)) throw new Error(`Origin ScriptDispatcher token behavior missing ${marker}`);
}
if (!playerRuntimeSource.includes("GameEventHandlerToken=function")) throw new Error("Archived Player GameEventHandlerToken evidence missing");

const documented = docs.entries.filter(entry => entry.owner === "GameVector3");
if (documented.length !== 31) throw new Error(`Expected 31 documented GameVector3 entries, found ${documented.length}`);
const evidence = [
  { type: "local-source", path: sourcePath, symbol: "Vector3 / GameVector3 compatibility implementation", confidence: "direct" },
  { type: "origin-source", path: originPath, symbol: "GameVector3", confidence: "direct" },
];
const entries = documented.map(entry => ({
  ...structuredClone(entry),
  kind: entry.id === "shared.GameVector3.GameVector3" ? "constructor" : entry.kind,
  availability: entry.id === "shared.GameVector3.equals" ? "partial" : "confirmed",
  compatibility: "emulated",
  capability: "shared.math",
  since: "0.1.0",
  notes: [
    ...(entry.notes ?? []),
    entry.id === "shared.GameVector3.equals"
      ? "The origin formula is confirmed, but the EPSILON$2 binding was not present in the extracted origin class; the local 1e-6 tolerance is supported indirectly by the archived Player math bundle."
      : "Implemented from the documented signature and recovered origin GameVector3 formula.",
  ],
  evidence: [...(entry.evidence ?? []), ...evidence, ...(entry.id === "shared.GameVector3.equals" ? [{ type: "player-bundle", path: playerMathPath, symbol: "module 48388 EPSILON = 1e-6", confidence: "supporting" }] : [])],
}));

const documentedBounds = docs.entries.filter(entry => entry.owner === "GameBounds3");
if (documentedBounds.length !== 11) throw new Error(`Expected 11 documented GameBounds3 entries, found ${documentedBounds.length}`);
const boundsEvidence = [
  { type: "local-source", path: boundsSourcePath, symbol: "GameBounds3", confidence: "direct" },
  { type: "origin-source", path: boundsOriginPath, symbol: "GameBounds3", confidence: "direct" },
];
for (const entry of documentedBounds) {
  entries.push({
    ...structuredClone(entry),
    kind: entry.id === "shared.GameBounds3.GameBounds3" ? "constructor" : entry.kind,
    availability: "confirmed",
    compatibility: "emulated",
    capability: "shared.math",
    since: "0.1.0",
    notes: [
      ...(entry.notes ?? []),
      entry.id === "shared.GameBounds3.GameBounds3"
        ? "The recovered constructor reference semantics are preserved for GameVector3-compatible local Vector3 instances; array/object coercion remains a local compatibility extension."
        : "The local formula and mutation/return behavior match the recovered origin GameBounds3 source.",
    ],
    evidence: [...(entry.evidence ?? []), ...boundsEvidence],
  });
}

const documentedQuaternion = docs.entries.filter(entry => entry.owner === "GameQuaternion");
if (documentedQuaternion.length !== 28) throw new Error(`Expected 28 documented GameQuaternion entries, found ${documentedQuaternion.length}`);
const quaternionEpsilonMembers = new Set(["rotationBetween", "getAxisAngle", "inv", "slerp", "equals"]);
const quaternionEvidence = [
  { type: "local-source", path: quaternionSourcePath, symbol: "GameQuaternion", confidence: "direct" },
  { type: "origin-source", path: quaternionOriginPath, symbol: "GameQuaternion", confidence: "direct" },
];
for (const entry of documentedQuaternion) {
  const epsilonDependent = quaternionEpsilonMembers.has(entry.name);
  entries.push({
    ...structuredClone(entry),
    kind: entry.id === "shared.GameQuaternion.GameQuaternion" ? "constructor" : entry.kind,
    availability: epsilonDependent ? "partial" : "confirmed",
    compatibility: "emulated",
    capability: "shared.math",
    since: "0.1.0",
    notes: [
      ...(entry.notes ?? []),
      epsilonDependent
        ? "The recovered formula is implemented, but its EPSILON$2 binding is absent from the extracted origin class; the local 1e-6 value has only supporting archived-Player evidence."
        : "The local formula, argument order, return shape, and mutation behavior match the recovered origin GameQuaternion source.",
    ],
    evidence: [...(entry.evidence ?? []), ...quaternionEvidence, ...(epsilonDependent ? [{ type: "player-bundle", path: playerMathPath, symbol: "module 48388 EPSILON = 1e-6", confidence: "supporting" }] : [])],
  });
}

const documentedColors = docs.entries.filter(entry => entry.owner === "GameRGBColor" || entry.owner === "GameRGBAColor");
if (documentedColors.length !== 40) throw new Error(`Expected 40 documented color entries, found ${documentedColors.length}`);
const colorEvidence = owner => [
  { type: "local-source", path: colorSourcePath, symbol: owner, confidence: "direct" },
  { type: "origin-source", path: owner === "GameRGBColor" ? rgbOriginPath : rgbaOriginPath, symbol: owner, confidence: "direct" },
];
for (const entry of documentedColors) {
  const epsilonDependent = entry.name === "equals";
  entries.push({
    ...structuredClone(entry),
    kind: entry.id === `shared.${entry.owner}.${entry.owner}` ? "constructor" : entry.kind,
    availability: epsilonDependent ? "partial" : "confirmed",
    compatibility: "emulated",
    capability: "shared.math",
    since: "0.1.0",
    notes: [
      ...(entry.notes ?? []),
      epsilonDependent
        ? "The recovered equality formula is implemented, but its EPSILON$2 binding is absent from the extracted origin class; the local 1e-6 value has only supporting archived-Player evidence."
        : "The local component formula, zero-divisor behavior, return type, and mutation behavior match the recovered origin color source.",
    ],
    evidence: [...(entry.evidence ?? []), ...colorEvidence(entry.owner), ...(epsilonDependent ? [{ type: "player-bundle", path: playerMathPath, symbol: "module 48388 EPSILON = 1e-6", confidence: "supporting" }] : [])],
  });
}

const documentedEventToken = docs.entries.filter(entry => entry.owner === "GameEventHandlerToken");
if (documentedEventToken.length !== 3) throw new Error(`Expected 3 documented GameEventHandlerToken entries, found ${documentedEventToken.length}`);
const eventTokenEvidence = [
  { type: "local-source", path: eventSignalSourcePath, symbol: "GameEventHandlerToken / EventSignal.on", confidence: "direct" },
  { type: "origin-source", path: eventTokenOriginPath, symbol: "GameEventHandlerToken", confidence: "direct" },
  { type: "origin-source", path: dispatcherOriginPath, symbol: "ScriptDispatcher.channel", confidence: "direct" },
  { type: "player-bundle", path: playerRuntimePath, symbol: "GameEventHandlerToken", confidence: "direct" },
];
for (const entry of documentedEventToken) {
  entries.push({
    ...structuredClone(entry),
    availability: "confirmed",
    compatibility: "emulated",
    capability: "shared.events",
    since: "0.1.0",
    notes: [...(entry.notes ?? []), "The local token state machine matches recovered ScriptDispatcher cancel, resume, active, and dispatcher-destroy behavior."],
    evidence: [...(entry.evidence ?? []), ...eventTokenEvidence],
  });
}

entries.push(
  extension("shared.object.Vector3", "object", "Vector3", { declaration: "class" }),
  extension("shared.Vector3.from", "method", "from", { parameters: [{ name: "value", type: "Vector3Like" }], returns: "Vector3", static: true }),
  extension("shared.Vector3.subtract", "method", "subtract", { parameters: [{ name: "value", type: "Vector3Like" }], returns: "Vector3" }),
  extension("shared.Vector3.toArray", "method", "toArray", { parameters: [], returns: "number[3]" }),
);

const analysis = {
  format: "nea-local-shared-runtime-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: { path: sourcePath, bytes: Buffer.byteLength(source), sha256: createHash("sha256").update(source).digest("hex") },
  entries,
  summary: {
    canonicalEntries: documented.length + documentedBounds.length + documentedQuaternion.length + documentedColors.length + documentedEventToken.length,
    confirmedCanonical: entries.filter(entry => /^shared\.Game(?:Vector3|Bounds3|Quaternion|RGBColor|RGBAColor|EventHandlerToken)\./.test(entry.id) && entry.availability === "confirmed").length,
    partialCanonical: entries.filter(entry => /^shared\.Game(?:Vector3|Bounds3|Quaternion|RGBColor|RGBAColor|EventHandlerToken)\./.test(entry.id) && entry.availability === "partial").length,
    gameVector3: {
      entries: documented.length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameVector3.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameVector3.") && entry.availability === "partial").length,
    },
    gameBounds3: {
      entries: documentedBounds.length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameBounds3.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameBounds3.") && entry.availability === "partial").length,
    },
    gameQuaternion: {
      entries: documentedQuaternion.length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameQuaternion.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameQuaternion.") && entry.availability === "partial").length,
    },
    gameRGBColor: {
      entries: documentedColors.filter(entry => entry.owner === "GameRGBColor").length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameRGBColor.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameRGBColor.") && entry.availability === "partial").length,
    },
    gameRGBAColor: {
      entries: documentedColors.filter(entry => entry.owner === "GameRGBAColor").length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameRGBAColor.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameRGBAColor.") && entry.availability === "partial").length,
    },
    gameEventHandlerToken: {
      entries: documentedEventToken.length,
      confirmed: entries.filter(entry => entry.id.startsWith("shared.GameEventHandlerToken.") && entry.availability === "confirmed").length,
      partial: entries.filter(entry => entry.id.startsWith("shared.GameEventHandlerToken.") && entry.availability === "partial").length,
    },
    localExtensions: entries.filter(entry => entry.owner === "Vector3" || entry.id === "shared.object.Vector3").length,
  },
};

const outputPath = resolve(root, "generated", "local-shared-runtime-analysis.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(`Analyzed local shared Runtime; ${analysis.summary.confirmedCanonical} confirmed and ${analysis.summary.partialCanonical} partial shared value entries.`);

function extension(id, kind, name, signature) {
  return {
    id,
    side: "shared",
    kind,
    owner: kind === "object" ? null : "Vector3",
    name,
    signature,
    availability: "confirmed",
    compatibility: "emulated",
    capability: "shared.math",
    since: "0.1.0",
    notes: ["Local Vector3 compatibility extension; not a documented GameVector3 identifier."],
    evidence: [evidence[0]],
  };
}
