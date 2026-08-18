import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPreservedBlockCatalog } from "../../../Backend/local-player/src/block-info.mjs";
import { importMapProject } from "../src/import-project.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

// Parkour-derived conformance fixture.
// API call shapes traced from a private parkour live capture (works/private/parkour):
//   voxels.id(name) / voxels.getVoxel(x,y,z) / voxels.setVoxel(x,y,z,name)
//   world.onChat / world.onPlayerJoin / world.onVoxelContact
//   world.querySelectorAll(selector) / world.say(entity|string)
// The script below is a REDACTED fixture: it reuses only the API call shapes,
// none of the original map content.
const SERVER_SCRIPT = `console.log("parkour fixture server loaded");
const courseBlock = voxels.id("sand");
const courseX = 8, courseY = 6, courseZ = 8; // block replaces the ground layer at the landing spot
world.onPlayerJoin(({ player }) => {
  world.say(player.name + " joined");
});
world.onChat(async ({ entity, message }) => {
  world.say("echo " + message);
});
world.onVoxelContact(({ player, voxel, axis }) => {
  if (axis.y !== 1) return;
  world.say("contact " + voxel);
});
world.onTick(({ tick }) => {
  if (tick !== 1) return;
  // parkour-style voxel writes/reads, including the OUTERMOST map layer
  // (regression: world coordinates are 0..shape-1 inclusive).
  voxels.setVoxel(courseX, courseY - 1, courseZ, "sand");
  const below = voxels.getVoxel(courseX, courseY - 1, courseZ);
  const edgeX = 63, edgeY = 0, edgeZ = 63;
  voxels.setVoxel(edgeX, edgeY, edgeZ, courseBlock ? "sand" : "air");
  const edge = voxels.getVoxel(edgeX, edgeY, edgeZ);
  const beacon = world.querySelector(".demo-beacon");
  if (beacon) beacon.addTag("course");
  // Selector engine supports .tag / #id / entity / * (game-selector.mjs);
  // attribute syntax like [tag=x] is not part of the recovered grammar.
  const found = world.querySelectorAll(".course");
  world.say("below " + below);
  world.say("edge " + edge);
  world.say("found " + found.length);
});
`;

const MANIFEST = {
  formatVersion: "nea-map/v1",
  id: "parkour-fixture",
  display: { name: "Parkour Fixture (redacted)" },
  runtime: {
    apiVersion: "0.1.0",
    tickRate: 20,
    clientContract: "dao3-client-runtime/v1",
    serverContract: "nea-server-runtime/v1",
    compatibilityLevel: "experimental",
  },
  world: {
    shape: [64, 32, 64],
    spawn: [32, 8, 38],
    entityLimit: 3400,
    terrain: "world/terrain.json",
    entities: "world/entities.json",
    physics: "world/physics.json",
  },
  scripts: {
    server: "scripts/server.js",
    client: "scripts/client.js",
    serverCapabilities: [
      "server.world.events",
      "server.world.chat",
      "server.world.entities",
      "server.world.voxels",
      "server.world.config",
      "server.storage",
      "server.player.write",
      "server.remote-channel",
    ],
    clientCapabilities: ["client.core", "client.ui", "client.remote-channel"],
  },
};

const demoProject = resolve(fileURLToPath(new URL("../project", import.meta.url)));
const archiveRoot = resolve(fileURLToPath(new URL("../../../Backend/local-player/archive", import.meta.url)));
const blockCatalog = await loadPreservedBlockCatalog(archiveRoot, "world-bedwars.json");
const sand = blockCatalog.find((entry) => entry.name === "sand");
assert.ok(sand, "preserved catalog contains sand");

test("parkour call shapes: join/chat/voxel-contact events, voxels id+setVoxel(name), edge coords, selectors, say", async () => {
  const output = join(await mkdtemp(join(tmpdir(), "nea-parkour-")), "project");
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "nea.map.json"), JSON.stringify(MANIFEST, null, 2));
  await cp(join(demoProject, "scripts"), join(output, "scripts"), { recursive: true });
  await cp(join(demoProject, "world"), join(output, "world"), { recursive: true });
  await writeFile(join(output, "scripts", "server.js"), SERVER_SCRIPT);
  const compiled = join(await mkdtemp(join(tmpdir(), "nea-parkour-built-")), "project");
  await importMapProject(output, compiled);

  const delivered = [];
  const runtime = await ScriptRuntime.load(compiled, {
    blockCatalog,
    logger: { info() {}, warn() {}, error() {} },
    sendChatMessage: (_sessionId, message) => delivered.push(message),
    sendChatMessages: (batch) => batch.forEach((entry) => delivered.push(entry.message)),
  });
  await runtime.start();
  const player = runtime.addPlayer({ id: "player-1", name: "Runner", position: [32, 8, 38] });
  runtime.tick(); // tick 1: block placement, edge write/read, selector, say
  runtime.tick();

  const texts = () => delivered.map((d) => String(d?.text ?? ""));
  assert.ok(texts().some((t) => t.includes("Runner joined")), "onPlayerJoin + world.say(player)");
  assert.ok(texts().some((t) => t.includes("below " + sand.id)), "getVoxel reads placed course block");
  assert.ok(texts().some((t) => t.includes("edge " + sand.id)), "outermost map layer readable (bounds fix)");
  assert.ok(texts().some((t) => t.includes("found 1")), "querySelectorAll .tag finds tagged entity");

  // world.onChat echo
  runtime.dispatchChat(player.id, "hello");
  runtime.tick();
  await new Promise((resolve2) => setImmediate(resolve2)); // flush chat delivery microtasks
  assert.ok(texts().some((t) => t.includes("echo hello")), "world.onChat handler ran and echoed via world.say");

  // world.onVoxelContact: drop the player onto the placed course block at (8,3,8).
  const courseX = 8, courseZ = 8;
  player.position = { x: courseX + 0.5, y: 8, z: courseZ + 0.5 };
  player.velocity = { x: 0, y: -40, z: 0 };
  for (let i = 0; i < 40; i += 1) runtime.tick();
  await new Promise((resolve2) => setImmediate(resolve2)); // flush contact chat deliveries
  assert.ok(texts().some((t) => t.includes("contact " + sand.id)), "onVoxelContact fired when landing on the block");
  runtime.stop();
});

test("GameVoxels outermost coordinate regression (shape [64,32,64] includes layer 63)", async () => {
  const { GameVoxelsRuntime } = await import("../src/runtime/game-voxels.mjs");
  const { VoxelCollisionWorld } = await import("../src/runtime/physics/voxel-collision-world.mjs");
  const world = new VoxelCollisionWorld();
  const voxels = new GameVoxelsRuntime({ shape: [64, 32, 64], catalog: blockCatalog, collisionWorld: world });
  assert.equal(voxels.shape.x, 63);
  assert.equal(voxels.shape.y, 31);
  assert.equal(voxels.shape.z, 63);
  const edge = voxels.setVoxel(63, 31, 63, sand.name);
  assert.notEqual(edge, 0, "setVoxel at the outermost coordinate must succeed");
  assert.equal(voxels.getVoxel(63, 31, 63), sand.id);
  assert.equal(voxels.getVoxel(63.9, 31.9, 63.9), sand.id, "floored reads at the outer layer work");
  assert.equal(voxels.getVoxel(64, 0, 0), 0, "one past the shape is still out of bounds");
});
