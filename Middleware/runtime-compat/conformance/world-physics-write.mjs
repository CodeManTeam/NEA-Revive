export const worldPhysicsWriteContract = Object.freeze({
  api: Object.freeze(["server.GameWorld.gravity", "server.GameWorld.airFriction"]),
  historicalSources: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameWorld/physics.md:28",
    "origin/server-protocols.json",
    "dump/dump/view.goboxgame.com_734.8dcb480d99773395.js:1",
  ]),
  binding: Object.freeze({ gravity: "physics.gravity", airFriction: "physics.velocityDamping" }),
  velocityScale: "exp(-velocityDamping * deltaTicks)",
  accelerationFactor: "velocityDamping > 0 ? (1 - velocityScale) / velocityDamping : deltaTicks",
  scope: "runtime-owned-player-fixed-step",
  unresolved: Object.freeze(["Player game-net public physics is unused and has no recovered mutable channel", "generic RuntimeEntity rigid-body integration"]),
});
