export const worldCollisionFilterApiConformance = Object.freeze({
  canonicalApis: Object.freeze([
    "GameWorld.addCollisionFilter",
    "GameWorld.removeCollisionFilter",
    "GameWorld.clearCollisionFilters",
    "GameWorld.collisionFilters",
  ]),
  storage: "ordered selector-pair registry keyed by JSON tuple",
  duplicatePolicy: "same ordered pair replaces the prior entry",
  removalPolicy: "ordered pair must match exactly",
  listPolicy: "returns fresh outer and inner arrays",
  historicalEvidence: "origin/origin/origin/sync/ScriptWorldSync.js collision filter closures",
  declarationEvidence: "dao3-docs-mirror/markdown/api/GameWorld/physics.md",
  localEvidence: "Frontend/demo-map/src/runtime/script-runtime.mjs:#collisionFilters",
  compatibility: "partial",
  remainingGap: "The local physics solver does not consume registered selector pairs.",
});
