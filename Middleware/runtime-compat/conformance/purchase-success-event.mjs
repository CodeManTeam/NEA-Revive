import { createGamePurchaseSuccessEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createPurchaseSuccessEventFixture(overrides = {}) {
  return createGamePurchaseSuccessEvent(
    overrides.tick ?? 41,
    overrides.userId ?? "user-1",
    overrides.productId ?? "product.asset",
    overrides.orderId ?? 12345,
  );
}
