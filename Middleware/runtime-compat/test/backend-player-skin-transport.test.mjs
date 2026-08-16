import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const backend = await readFile(backendUrl, "utf8");
const bodyParts = [
  "head", "hips", "leftFoot", "leftHand", "leftLowerArm", "leftLowerLeg", "leftShoulder", "leftUpperArm", "leftUpperLeg",
  "neck", "rightFoot", "rightHand", "rightLowerArm", "rightLowerLeg", "rightShoulder", "rightUpperArm", "rightUpperLeg", "torso",
];

function loadPlayerRegistry() {
  const start = backend.indexOf("function copyRuntimeVector(vector2)");
  const end = backend.indexOf("// legacy/box3-compat/src/game/runtime/authoritative-game-runtime.ts", start);
  assert.notEqual(start, -1, "runtime snapshot helpers are missing");
  assert.notEqual(end, -1, "player registry boundary is missing");
  const source = backend.slice(start, end).replace("var PlayerRegistry = class {", "PlayerRegistry = class {");
  const context = {
    PlayerRegistry: undefined,
    bodyParts,
    defaultRuntimePlayerInputState: 0,
    normalizePositiveVector: value => value,
  };
  vm.runInNewContext(source, context);
  return context.PlayerRegistry;
}

function avatarSkin(id) {
  return Object.fromEntries(bodyParts.map(bodyPart => [bodyPart, id]));
}

test("authoritative Player state preserves complete avatar skin ids", () => {
  const PlayerRegistry = loadPlayerRegistry();
  const players = new PlayerRegistry();
  players.join({ sessionId: "session", playerId: 7, spawn: [0, 1, 0], bodyHalfExtents: [0.4, 0.9, 0.4] });
  const expected = avatarSkin(23);
  assert.equal(players.enqueueInput("session", 1, { kind: "temporary-legacy-position-transform", position: [0, 1, 0], avatarSkin: expected }), true);
  expected.head = 99;
  players.applyInputsAt(1);
  assert.deepEqual(structuredClone(players.snapshot()[0].avatarSkin), avatarSkin(23));
});

test("Player public-state and control boundaries validate and project avatar skin ids", () => {
  assert.match(backend, /command\.avatarSkin === void 0 \|\| isRuntimeAvatarSkin\(command\.avatarSkin\)/);
  assert.match(backend, /display\.avatarSkin\[bodyParts\[index\]\] = player\.avatarSkin\?\.\[bodyParts\[index\]\] \?\? localAvatarSkinPartIds\[index\]/);
  assert.match(backend, /avatarSkin must contain unsigned ids for every body part/);
  assert.match(backend, /state\.avatarSkin = copyRuntimeAvatarSkin\(source\.avatarSkin\)/);
});
