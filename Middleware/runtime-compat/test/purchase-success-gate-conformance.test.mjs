import assert from "node:assert/strict";
import test from "node:test";
import { canProducePurchaseSuccessEvent, purchaseSuccessGateContract } from "../conformance/purchase-success-gate.mjs";

test("purchase success gate preserves recovered fields and missing ingress direction", () => {
  assert.deepEqual(purchaseSuccessGateContract.eventFields, ["tick", "userId", "productId", "orderId"]);
  assert.equal(purchaseSuccessGateContract.missingDirection, "purchase-success-to-server-script-runtime");
  assert.equal(purchaseSuccessGateContract.launchState, "blocked");
  assert.deepEqual(purchaseSuccessGateContract.recoveredPlayerMarketProtocol.serverReceives, []);
  assert.equal(purchaseSuccessGateContract.historicalTickConsumer.acknowledgementField, "messageId");
  assert.equal(canProducePurchaseSuccessEvent("openMarketplace", { productIds: ["1"] }), false);
  assert.equal(canProducePurchaseSuccessEvent("ackPurchaseSuccessMsg", { msgId: "message-1" }), false);
  assert.equal(canProducePurchaseSuccessEvent("purchaseSuccessEvents", {
    userId: "user-1",
    productId: "2",
    orderId: "3",
    messageId: "message-1",
  }), true);
});
