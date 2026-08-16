export const chatIngressBoundaryContract = Object.freeze({
  historicalConsumer: Object.freeze({
    path: "origin/origin/origin/shell/ScriptShell.js",
    collection: "event.chatEvents.chats",
    fields: Object.freeze(["senderId", "private", "message"]),
    publicOnly: true,
    dispatchOrder: Object.freeze(["world.onChat", "entity.onChat"]),
  }),
  recoveredPlayerProtocol: Object.freeze({
    id: "player.game-chat",
    serverToClient: Object.freeze(["log", "globalNotice"]),
    clientToServer: Object.freeze(["noticeMessage"]),
  }),
  recoveredBrowserSender: Object.freeze({
    path: "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js",
    method: "sendGlobalNotice",
    message: "noticeMessage",
    fields: Object.freeze(["title", "detail"]),
  }),
  compatibility: Object.freeze({
    noticeMessageProducesGameChatEvent: false,
    playerChatProducerRecovered: false,
    launchState: "blocked",
  }),
});

export function canProduceGameChatEvent(messageName, payload) {
  if (messageName !== "chatEvents.chats") return false;
  return payload !== null
    && typeof payload === "object"
    && Number.isInteger(payload.senderId)
    && typeof payload.private === "boolean"
    && typeof payload.message === "string";
}
