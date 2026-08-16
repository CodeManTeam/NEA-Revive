export const entityAnchorOffsetEvidence = Object.freeze({
  canonicalApi: "GameEntity.anchorOffset",
  declaration: "GameVector3, documented writable",
  recoveredDefault: Object.freeze([0, 0, 0]),
  relatedResourceMetadata: Object.freeze(["meshRenderBoxOffset", "meshRigidBodyOffset"]),
  provenConsumers: Object.freeze(["rigid-body position conversion uses meshRigidBodyOffset", "Player mesh bootstrap carries renderBoxOffset"]),
  missingEvidence: Object.freeze(["which metadata source populates anchorOffset", "sign convention", "meshScale/orientation application", "mesh-change refresh lifecycle", "write synchronization behavior"]),
  localRuntimeValue: null,
  capabilityState: "blocked",
  status: "recovered-only",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameEntity.js",
    "origin/origin/origin/sync/ScriptResourceSync.js",
    "origin/origin/origin/ScriptParserAPI.js",
    "origin/server-protocols.json",
    "preservation-dump/editor-runtime-projection.mjs",
    "dao3-docs-mirror/markdown/api/GameEntity/appearance.md",
  ]),
});
