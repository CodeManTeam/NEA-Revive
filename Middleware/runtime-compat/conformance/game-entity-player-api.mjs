export const gameEntityPlayerApiConformance = Object.freeze({
  canonicalId: "server.GameEntity.player",
  state: "partial",
  compatibleBehavior: Object.freeze([
    "Non-player RuntimeEntity values return undefined.",
    "RuntimePlayer values expose the GamePlayerEntity method/property surface through player.",
  ]),
  gap: "Recovered ScriptEntitySync creates a distinct GamePlayer facade and assigns it to GameEntity.player. The local Runtime merges the entity shell and player facade, so player returns the RuntimePlayer itself.",
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameEntity/isPlayer.md",
    "origin/origin/origin/sync/ScriptEntitySync.js",
    "Frontend/demo-map/src/runtime/script-runtime.mjs",
  ]),
});
