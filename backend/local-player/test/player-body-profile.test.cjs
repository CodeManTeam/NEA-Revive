"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { parsePlayerBodyProfile } = require("../backend/player-body-profile.cjs");

test("returns undefined when the Player body profile is not configured", () => {
  assert.equal(parsePlayerBodyProfile(undefined), undefined);
  assert.equal(parsePlayerBodyProfile(""), undefined);
});

test("normalizes a Player body profile with explicit bounds and shape", () => {
  const profile = parsePlayerBodyProfile(JSON.stringify({
    profileId: "recovered-player",
    origin: "body-center",
    originStatus: "recovered",
    sizeStatus: "compatible",
    boundsHalfExtents: [0.5, 1, 0.5],
    shapeHalfExtents: [0.4, 0.9, 0.4],
  }));

  assert.deepEqual(profile, {
    profileId: "recovered-player",
    origin: "body-center",
    originStatus: "recovered",
    sizeStatus: "compatible",
    boundsHalfExtents: [0.5, 1, 0.5],
    shapeHalfExtents: [0.4, 0.9, 0.4],
    halfExtents: [0.4, 0.9, 0.4],
  });
  assert.equal(profile.halfExtents, profile.shapeHalfExtents);
  assert.equal(Object.isFrozen(profile), true);
});

test("accepts legacy half extents and applies the default origin status", () => {
  const profile = parsePlayerBodyProfile(JSON.stringify({
    profileId: "legacy-player",
    origin: "body-center",
    sizeStatus: "recovered-only",
    halfExtents: [0.5, 1, 0.5],
  }));

  assert.deepEqual(profile.boundsHalfExtents, [0.5, 1, 0.5]);
  assert.deepEqual(profile.shapeHalfExtents, [0.5, 1, 0.5]);
  assert.equal(profile.originStatus, "unknown");
});

test("rejects invalid Player body profiles", () => {
  const baseProfile = {
    profileId: "recovered-player",
    origin: "body-center",
    sizeStatus: "compatible",
    boundsHalfExtents: [0.5, 1, 0.5],
    shapeHalfExtents: [0.4, 0.9, 0.4],
  };

  assert.throws(
    () => parsePlayerBodyProfile(JSON.stringify({ ...baseProfile, origin: "feet" })),
    /origin must be body-center/,
  );
  assert.throws(
    () => parsePlayerBodyProfile(JSON.stringify({ ...baseProfile, boundsHalfExtents: [0.5, 4097, 0.5] })),
    /positive coordinates within the runtime bounds/,
  );
  assert.throws(
    () => parsePlayerBodyProfile(JSON.stringify({ ...baseProfile, shapeHalfExtents: [0.6, 0.9, 0.4] })),
    /shapeHalfExtents must fit inside boundsHalfExtents/,
  );
});
