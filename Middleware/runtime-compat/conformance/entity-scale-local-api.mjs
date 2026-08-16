export const entityScaleLocalApiConformance = Object.freeze({
  canonicalApi: "GameEntity.scaleLocal",
  signature: Object.freeze({ parameters: ["GameVector3 localPosition", "GameVector3 scale"], returns: "void" }),
  pivotInvariant: "position + transformedLocalPivot is unchanged",
  behavior: "replace meshScale, then compensate position by old/new transformed pivot difference",
  projection: Object.freeze(["meshScale whole-property", "position whole-property"]),
  status: "partial",
  gaps: Object.freeze(["RuntimePlayer scaleLocal/model scale binding is unavailable", "nested scale/position mutation is not projected"]),
  evidence: Object.freeze([
    "origin/origin/origin/ScriptEntityWrapper.js",
    "origin/origin/origin/api/GameEntity.js",
    "dao3-docs-mirror/markdown/api/GameEntity/appearance.md",
    "Frontend/demo-map/src/runtime/entity-look-at.mjs",
  ]),
});
