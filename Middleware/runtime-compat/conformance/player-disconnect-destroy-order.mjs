export const playerDisconnectDestroyOrderConformance = Object.freeze({
  ingress: "player.game-net.session disconnect",
  runtimeEntry: "ScriptRuntime.removePlayer",
  eventType: "GameEntityEvent",
  payload: Object.freeze(["tick", "entity"]),
  order: Object.freeze(["world.onPlayerLeave", "player.onDestroy", "world.onEntityDestroy"]),
  historicalEvidence: "origin/origin/origin/sync/ScriptWorldSync.js:_onEntityDestroy",
  localEvidence: "Frontend/demo-map/src/runtime/script-runtime.mjs:removePlayer",
  behavioralEvidence: "Frontend/demo-map/test/runtime.test.mjs:destroyed chat endpoints are silent and player removal emits recovered destroy ordering",
  remainingGap: "Independent engine destruction sources other than the recovered disconnect path remain unverified.",
});
