import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const posture = JSON.parse(await readFile(new URL("../abi/physics-player-posture.json", import.meta.url), "utf8"));

test("Player posture state bits match the archived schema", () => {
  assert.deepEqual(posture.stateEncoding.PlayerFlyState, { shift: 0, bits: 1, mask: 1, values: { NOT_FLYING: 0, FLYING: 1 } });
  assert.deepEqual(posture.stateEncoding.PlayerWalkState, { shift: 2, bits: 2, mask: 12, values: { CROUCH: 0, WALK: 4, RUN: 8 } });
  assert.equal(posture.stateEncoding.PlayerButtonState.values.CROUCH, 64);
  assert.equal(posture.stateEncoding.PlayerFlags.ALLOW_CROUCH, 128);
});

test("unknown historical posture shapes use an explicit null contract", () => {
  assert.deepEqual(posture.standing.halfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(posture.standing.dimensions, [0.9, 2.2, 0.9]);
  assert.equal(posture.crouching.clientShapeMutation, "absent");
  assert.equal(posture.flying.clientShapeMutation, "absent");
  for (const state of [posture.crouching, posture.flying]) {
    assert.deepEqual(state.authoritativeShape, {
      status: "evidence-deferred",
      boundsHalfExtents: null,
      shapeHalfExtents: null,
      dimensions: null,
      wireFields: { rx: null, ry: null, rz: null, hsx: null, hsy: null, hsz: null },
    });
  }
  assert.deepEqual(posture.compatibilityPolicy, {
    onUnknownAuthoritativeShape: "preserve-current-collider",
    requireCompleteAuthoritativeShape: true,
    historicalClaim: false,
  });
  assert.equal(posture.authority.clientMotorMayWriteShape, false);
  assert.match(posture.authority.policy, /Do not synthesize/);
  assert.match(posture.authority.policy, /local compatibility policy/);
});
