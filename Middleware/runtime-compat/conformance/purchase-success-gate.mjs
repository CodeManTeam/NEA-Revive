export const purchaseSuccessGateContract = Object.freeze({
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameWorld/shopping.md",
    "origin/origin/origin/shell/MarketScriptShell.js",
    "origin/origin/origin/sync/ScriptWorldSync.js",
    "origin/server-protocols.json",
    "local-player/backend/box3-server.cjs",
  ]),
  eventFields: Object.freeze(["tick", "userId", "productId", "orderId"]),
  historicalTickConsumer: Object.freeze({
    collection: "event.purchaseSuccessEvents",
    inputFields: Object.freeze(["userId", "productId", "orderId", "messageId"]),
    publicFieldConversion: Object.freeze({ productId: "parseInt", orderId: "parseInt" }),
    acknowledgementField: "messageId",
  }),
  recoveredPlayerMarketProtocol: Object.freeze({
    clientReceives: Object.freeze(["openMarketplace"]),
    serverReceives: Object.freeze([]),
    browserEffect: "messageTool.openStore",
  }),
  recoveredMarketScriptDirections: Object.freeze(["openMarketplace", "ackPurchaseSuccessMsg"]),
  missingDirection: "purchase-success-to-server-script-runtime",
  launchState: "blocked",
  relatedEvidenceBlockedIngress: Object.freeze(["world.onChat", "storage.getGroupStorage"]),
});

export function canProducePurchaseSuccessEvent(messageName, payload) {
  if (messageName !== "purchaseSuccessEvents") return false;
  return payload !== null
    && typeof payload === "object"
    && typeof payload.userId === "string"
    && typeof payload.productId === "string"
    && typeof payload.orderId === "string"
    && typeof payload.messageId === "string";
}
