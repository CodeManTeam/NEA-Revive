import assert from "node:assert/strict";
import test from "node:test";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

function makeRuntime() {
  return new ScriptRuntime({
    projectRoot: process.cwd(),
    projectName: "world-entity-contact-test",
    entry: "server.js",
    modules: {
      "server.js": `
        world.onEntityContact(() => world.say("entity-enter"));
        world.onEntitySeparate(() => world.say("entity-leave"));
        world.say("listeners-registered");
      `,
    },
    tickRate: 20,
    runtimeApiVersion: "test",
    serverContract: "test",
    compatibilityLevel: "test",
    capabilities: ["server.world.events", "server.world.chat", "server.world.config", "server.player.write"],
    physics: {
      gravity: 0,
      playerBody: {
        origin: "body-center",
        boundsHalfExtents: [0.45, 1.1, 0.45],
        shapeHalfExtents: [0.45, 1.1, 0.45],
      },
    },
    shape: [16, 16, 16],
    blockCatalog: [{ id: 1, name: "air" }],
    voxels: [],
    validatedSkinIds: {},
    entities: [{
      id: "trigger-box",
      name: "Trigger",
      position: [0, 0, 0],
      bounds: [10, 10, 10],
      collides: true,
      fixed: true,
    }],
  });
}

test("world entity contact and separate events follow overlap edges", async () => {
  const runtime = makeRuntime();
  await runtime.start();
  runtime.stop();
  const player = runtime.addPlayer({ id: "p1", position: [0, 0, 0] });

  runtime.tick();
  assert.deepEqual(runtime.snapshot().messages.map(message => message.text), ["listeners-registered"]);

  runtime.tick();
  assert.equal(runtime.snapshot().messages.length, 1, "contact is edge-triggered");

  player.position = [12, 2, 12];
  runtime.tick();
  assert.deepEqual(runtime.snapshot().messages.map(message => message.text), ["listeners-registered"]);
});
