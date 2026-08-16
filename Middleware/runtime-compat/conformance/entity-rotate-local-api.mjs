export const entityRotateLocalApiConformance = Object.freeze({
  canonicalApi: "GameEntity.rotateLocal",
  signature: Object.freeze({ parameters: ["GameVector3", "X | Y | Z", "number radians"], returns: "void" }),
  pivotInvariant: "position + transformedLocalPivot is unchanged",
  transformOrder: "meshScale then historical meshOrientation matrix",
  orientation: "axis rotation followed by quaternion normalization",
  invalidAxis: "throws; no historical fallback exists",
  projection: Object.freeze(["meshOrientation whole-property", "position whole-property"]),
  status: "partial",
  gaps: Object.freeze(["RuntimePlayer rotateLocal/model orientation binding is unavailable", "nested position/quaternion mutation is not projected"]),
  evidence: Object.freeze([
    "origin/origin/origin/ScriptEntityWrapper.js",
    "origin/origin/origin/api/GameEntity.js",
    "dao3-docs-mirror/markdown/api/GameEntity/appearance.md",
    "Frontend/demo-map/src/runtime/entity-look-at.mjs",
  ]),
});
