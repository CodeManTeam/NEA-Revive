import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const docs = await readJson("generated/docs-api-index.json");
const origin = await readJson("generated/origin-server-api.json");
const playerTypePath = "dao3-docs-mirror/markdown/api/GameEntity/isPlayer.md";
const syncPath = "origin/origin/origin/sync/ScriptEntitySync.js";
const playerTypeSource = await readFile(resolve(repositoryRoot, playerTypePath), "utf8");
const syncSource = await readFile(resolve(repositoryRoot, syncPath), "utf8");

for (const marker of ["declare type GamePlayerEntity = GameEntity & {", "player: GamePlayerEntity;", "isPlayer: true;"]) {
  if (!playerTypeSource.includes(marker)) throw new Error(`Player entity composition evidence missing: ${marker}`);
}
for (const marker of ["entity.player = new GamePlayer", "entity.isPlayer = true", "WRAPPER_PLAYER_INDEX.set(entity.player, wrapper)"]) {
  if (!syncSource.includes(marker)) throw new Error(`Origin player component attachment evidence missing: ${marker}`);
}

const sharedTypes = ["GameVector3", "GameQuaternion", "GameBounds3", "GameRGBColor", "GameRGBAColor", "GameAnimation", "GameEventHandlerToken", "Sound"];
const model = {
  format: "nea-server-object-model",
  version: 1,
  generatedAt: new Date().toISOString(),
  entities: {
    GameEntity: describe("GameEntity", "GameEntity"),
    GamePlayerEntity: describe("GamePlayerEntity", "GamePlayer"),
  },
  playerComposition: {
    representation: "intersection-and-component",
    typeExpression: "GameEntity & { player: GamePlayerEntity; isPlayer: true }",
    entityDiscriminator: "server.GameEntity.isPlayer",
    componentAccessor: "server.GameEntity.player",
    documentedComponent: "server.object.GamePlayerEntity",
    originComponentClass: "GamePlayer",
    originAttachment: "entity.player = new GamePlayer(...) followed by entity.isPlayer = true",
    classicalInheritance: false,
    status: "confirmed",
    evidence: [
      { type: "docs", path: playerTypePath, symbol: "declare type GamePlayerEntity = GameEntity & { player: GamePlayerEntity; isPlayer: true }", confidence: "direct" },
      { type: "origin-source", path: syncPath, symbol: "ScriptEntitySync._preTickServerPlayerBinding", confidence: "direct" },
    ],
  },
  aliases: [{ documented: "GamePlayerEntity", origin: "GamePlayer", relation: "implementation-name", status: "confirmed" }],
  sharedTypes: sharedTypes.map(name => describe(name, name, "shared")),
  invariants: [
    "GamePlayerEntity is not modeled as a JavaScript subclass of GameEntity.",
    "Player scripts reach player-only state through GameEntity.player after GameEntity.isPlayer becomes true.",
    "RuntimePlayer remains a local composite adapter until entity and player-component wrappers are separated.",
  ],
};

const outputPath = resolve(root, "abi", "server-object-model.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(model, null, 2)}\n`);
console.log(`Built server object model with ${model.sharedTypes.length} shared dependencies.`);

function describe(documentedOwner, originOwner, side = "server") {
  const documentedEntries = docs.entries.filter(entry => entry.side === side && (entry.owner === documentedOwner || entry.id === `${side}.object.${documentedOwner}`));
  const originEntries = origin.entries.filter(entry => entry.owner === originOwner);
  if (documentedEntries.length === 0) throw new Error(`${documentedOwner} missing from documentation catalog`);
  if (originEntries.length === 0) throw new Error(`${originOwner} missing from origin catalog`);
  return {
    documentedOwner,
    originOwner,
    documentedMembers: countKinds(documentedEntries),
    originMembers: countKinds(originEntries),
    dependencies: sharedTypesFrom(documentedEntries),
    availability: "confirmed-in-origin-shell",
    compatibility: "not-implemented-by-local-runtime",
  };
}

function countKinds(entries) {
  return Object.fromEntries(["object", "property", "method", "event"].map(kind => [kind, entries.filter(entry => entry.kind === kind).length]));
}

function sharedTypesFrom(entries) {
  const serialized = JSON.stringify(entries.map(entry => entry.signature));
  return sharedTypes.filter(name => serialized.includes(name));
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
