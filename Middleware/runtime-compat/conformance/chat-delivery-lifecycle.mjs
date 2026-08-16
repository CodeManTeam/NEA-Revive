export const chatDeliveryLifecycleContract = Object.freeze({
  historicalSources: Object.freeze([
    "origin/origin/origin/shell/ScriptShell.js:413",
    "origin/origin/origin/sync/ScriptEntitySync.js:56",
    "origin/origin/origin/sync/ScriptWorldSync.js:65",
  ]),
  invalidEndpointPolicy: "silent-drop",
  playerRemovalOrder: Object.freeze(["world.onPlayerLeave", "player.onDestroy", "world.onEntityDestroy"]),
  fifo: Object.freeze({
    immediatePrefix: "first MAX_CHATS_PER_TICK messages",
    overflow: "FIFO buffer",
    tickBoundary: "drain overflow before processing the next tick and reset the counter",
    transportBoundary: "one ordered deliveries array from Server Script Runtime to backend; backend projects each entry to the recovered Player game-chat.log message",
    localLimitDefault: null,
  }),
  unresolved: Object.freeze(["MAX_CHATS_PER_TICK value", "Player display acknowledgement"]),
});
