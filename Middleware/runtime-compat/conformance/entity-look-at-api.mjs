export const entityLookAtApiConformance = Object.freeze({
  canonicalApi: "GameEntity.lookAt",
  signature: Object.freeze({ parameters: ["GameVector3", "X | Y | Z = Z", "GameVector3 = (0,1,0)"], returns: "void" }),
  historicalComponentOrder: "gl-matrix [x,y,z,w] is passed directly to GameQuaternion.set(w,x,y,z)",
  invalidFacing: "warn and fall back to Z",
  degenerateDirection: "zero target direction falls back to +Z; parallel up is perturbed by 0.0001",
  projection: "RuntimeEntity meshOrientation whole-property authoritative update",
  status: "partial",
  gaps: Object.freeze(["RuntimePlayer lookAt/model orientation binding is unavailable", "nested quaternion mutation is not projected"]),
  evidence: Object.freeze([
    "origin/origin/origin/ScriptEntityWrapper.js",
    "origin/origin/origin/api/GameEntity.js",
    "dao3-docs-mirror/markdown/api/GameEntity/appearance.md",
    "Frontend/demo-map/src/runtime/entity-look-at.mjs",
  ]),
});
