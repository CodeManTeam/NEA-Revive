export const entityBoundsApiConformance = Object.freeze({
  canonicalApi: "GameEntity.bounds",
  signature: Object.freeze({ type: "GameVector3", readonly: true, semantics: "body-center half extents" }),
  historicalDefault: Object.freeze([1, 1, 1]),
  historicalZoneUse: "ScriptZoneWrapper tests position against zone bounds expanded by entity.bounds",
  runtimeEntity: Object.freeze({ read: "detached creation bounds copy", initialAuthoritativeReplica: true, write: false }),
  runtimePlayer: Object.freeze({ read: "authoritative boundsHalfExtents copy", write: false }),
  status: "partial",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameEntity.js",
    "origin/origin/origin/ScriptZoneWrapper.js",
    "Frontend/demo-map/src/runtime/script-runtime.mjs",
    "local-player/backend/box3-server.cjs",
  ]),
});
