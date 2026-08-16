"use strict";

function parsePlayerBodyProfile(value) {
  if (value === undefined || value === "") return undefined;

  const record = JSON.parse(value);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("BOX3_PLAYER_BODY_PROFILE must be a JSON object");
  }
  if (record.origin !== "body-center") {
    throw new Error("BOX3_PLAYER_BODY_PROFILE origin must be body-center");
  }
  if (typeof record.profileId !== "string" || record.profileId.length < 1) {
    throw new Error("BOX3_PLAYER_BODY_PROFILE profileId is required");
  }
  if (typeof record.sizeStatus !== "string" || record.sizeStatus.length < 1) {
    throw new Error("BOX3_PLAYER_BODY_PROFILE sizeStatus is required");
  }

  const legacyHalfExtents = record.halfExtents;
  const boundsHalfExtents = normalizePositiveVector(
    record.boundsHalfExtents ?? legacyHalfExtents,
    "BOX3_PLAYER_BODY_PROFILE boundsHalfExtents",
  );
  const shapeHalfExtents = normalizePositiveVector(
    record.shapeHalfExtents ?? legacyHalfExtents,
    "BOX3_PLAYER_BODY_PROFILE shapeHalfExtents",
  );

  if (shapeHalfExtents.some((component, index) => component > boundsHalfExtents[index])) {
    throw new Error("BOX3_PLAYER_BODY_PROFILE shapeHalfExtents must fit inside boundsHalfExtents");
  }

  return Object.freeze({
    profileId: record.profileId,
    origin: record.origin,
    originStatus: String(record.originStatus ?? "unknown"),
    sizeStatus: record.sizeStatus,
    boundsHalfExtents,
    shapeHalfExtents,
    halfExtents: shapeHalfExtents,
  });
}

function normalizePositiveVector(value, name) {
  const vector = normalizeVector(value, name);
  if (vector.some(coordinate => coordinate <= 0 || coordinate > 4096)) {
    throw new RangeError(name + " must contain three positive coordinates within the runtime bounds");
  }
  return vector;
}

function normalizeVector(value, name) {
  if (value.length !== 3 || value.some(coordinate => !Number.isFinite(coordinate))) {
    throw new RangeError(name + " must contain three finite coordinates");
  }
  return [value[0], value[1], value[2]];
}

module.exports = { parsePlayerBodyProfile };
