import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEntitySound, normalizePlayerSound, normalizeWorldSound, Sound } from "../../../Frontend/demo-map/src/runtime/game-sound.mjs";
import { soundApiConformance } from "../conformance/sound-api.mjs";

test("sound argument normalization preserves recovered target types and defaults", () => {
  assert.deepEqual(normalizeWorldSound("audio/global.mp3"), {
    sample: "audio/global.mp3", position: { type: "global" }, gain: 1, pitch: 1, radius: 0,
  });
  assert.deepEqual(normalizeWorldSound({ sample: "audio/position.mp3", position: [1, 2, 3], radius: 64 }), {
    sample: "audio/position.mp3", position: { type: "position", data: [1, 2, 3] }, gain: 1, pitch: 1, radius: 64,
  });
  assert.deepEqual(normalizeEntitySound("audio/entity.mp3", 17), {
    sample: "audio/entity.mp3", position: { type: "entity", data: 17 }, gain: 1, pitch: 1, radius: 32,
  });
  assert.deepEqual(normalizePlayerSound("audio/player.mp3", 23), {
    sample: "audio/player.mp3", position: { type: "player", data: 23 }, gain: 1, pitch: 1, radius: 0,
  });
  assert.equal(soundApiConformance.status, "partial");
});

test("sound normalization rejects fabricated targets and invalid gain or pitch", () => {
  assert.throws(() => normalizeEntitySound("audio/entity.mp3", null), /projected backend entity/);
  assert.throws(() => normalizePlayerSound("audio/player.mp3", 0), /authoritative backend player/);
  assert.throws(() => normalizeWorldSound({ sample: "audio/test.mp3", gain: -1 }), /gain/);
  assert.throws(() => normalizeWorldSound({ sample: "audio/test.mp3", pitch: 0.05 }), /pitch/);
});

test("Sound delegates every recovered playback control", () => {
  const calls = [];
  const sound = new Sound(
    currentTime => calls.push(["resume", currentTime]),
    currentTime => calls.push(["setCurrentTime", currentTime]),
    () => calls.push(["pause"]),
    () => calls.push(["stop"]),
  );
  sound.resume();
  sound.resume(2.5);
  sound.setCurrentTime(4);
  sound.pause();
  sound.stop();
  assert.deepEqual(calls, [["resume", undefined], ["resume", 2.5], ["setCurrentTime", 4], ["pause"], ["stop"]]);
});
