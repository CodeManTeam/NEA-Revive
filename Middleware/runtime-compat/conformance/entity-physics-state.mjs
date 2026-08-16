export const entityPhysicsStateContract = Object.freeze({
  properties: Object.freeze(["collides", "fixed", "gravity", "mass", "friction", "restitution"]),
  scriptRuntime: "whole-property-write",
  transport: "loopback-entity-state",
  authoritativeProjection: "replica.body",
  physicsSolver: "unavailable-for-generic-runtime-entities",
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameEntity/physics.md",
    "origin/origin/origin/api/GameEntity.js",
    "Frontend/demo-map/src/runtime/script-runtime.mjs",
    "local-player/backend/box3-server.cjs",
  ]),
});
