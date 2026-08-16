export const gameBounds3ApiConformance = Object.freeze({
  canonicalType: "GameBounds3",
  compatible: Object.freeze(["GameBounds3", "lo", "hi", "fromPoints", "intersect", "contains", "containsBounds", "intersects", "set", "copy", "toString"]),
  partial: Object.freeze([]),
  boundaryPolicy: Object.freeze({
    contains: "inclusive",
    containsBounds: "inclusive",
    intersects: "strict-overlap; touching faces do not intersect",
  }),
  constructorCompatibility: "Recovered lo/hi reference identity is preserved for local GameVector3-compatible Vector3 values; array/object coercion is an additional local extension.",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameBounds3.js",
    "Frontend/demo-map/src/runtime/game-zones.mjs",
  ]),
});
