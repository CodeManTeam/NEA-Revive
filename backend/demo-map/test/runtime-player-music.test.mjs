import assert from "node:assert/strict";
import test from "node:test";
import { GameSoundEffect } from "../src/runtime/game-sound-effect.mjs";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

function makeRuntime(commands) {
  return new ScriptRuntime({
    projectRoot: process.cwd(),
    projectName: "player-music-test",
    entry: null,
    modules: {},
    tickRate: 20,
    runtimeApiVersion: "test",
    serverContract: "test",
    compatibilityLevel: "test",
    capabilities: ["server.world.events", "server.world.entities"],
    physics: {
      gravity: -20,
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
    sendSoundCommand: command => commands.push(command),
  });
}

test("player music projects a directed replaceable looping GameSoundEffect", () => {
  const commands = [];
  const runtime = makeRuntime(commands);
  const player = runtime.addPlayer({ id: "listener-1", name: "Listener" });

  assert.ok(player.music instanceof GameSoundEffect);
  player.music.sample = "audio/first.mp3";
  assert.deepEqual(commands, [{
    action: "play",
    soundId: 1,
    sample: "audio/first.mp3",
    gain: 1,
    pitch: 1,
    radius: 0,
    position: { type: "global" },
    targetPlayerId: "listener-1",
    loop: true,
  }]);

  player.music.gain = 0.4;
  assert.deepEqual(commands.slice(1).map(command => command.action), ["stop", "play"]);
  assert.equal(commands[2].soundId, 1);
  assert.equal(commands[2].gain, 0.4);

  player.music.pitch = 1.25;
  player.music.sample = "audio/second.mp3";
  assert.deepEqual(commands.slice(3).map(command => command.action), ["stop", "play", "stop", "play"]);
  assert.equal(commands.at(-1).sample, "audio/second.mp3");
  assert.equal(commands.at(-1).pitch, 1.25);

  player.music.sample = "";
  assert.equal(commands.at(-1).action, "stop");
  assert.equal(commands.at(-1).soundId, 1);
  assert.equal(commands.at(-1).targetPlayerId, "listener-1");
});

