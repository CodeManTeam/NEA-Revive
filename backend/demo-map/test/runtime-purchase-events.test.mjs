import assert from "node:assert/strict";
import test from "node:test";
import { ScriptRuntime } from "../src/runtime/script-runtime.mjs";

function makeRuntime() {
  return new ScriptRuntime({
    projectRoot: process.cwd(), projectName: "purchase-events-test", entry: null, modules: {},
    tickRate: 20, runtimeApiVersion: "test", serverContract: "test", compatibilityLevel: "test",
    capabilities: ["server.world.events"], physics: { gravity: -20, playerBody: {
      origin: "body-center", boundsHalfExtents: [0.45, 1.1, 0.45], shapeHalfExtents: [0.45, 1.1, 0.45],
    } }, shape: [16, 16, 16], blockCatalog: [{ id: 1, name: "air" }], voxels: [], validatedSkinIds: {},
  });
}

test("purchase success dispatch reaches world handler with normalized payload", () => {
  const runtime = makeRuntime();
  assert.equal(runtime.dispatchPlayerPurchaseSuccess({ userId: "7", productId: "12", orderId: " order-1 " }), true);
  assert.equal(runtime.dispatchPlayerPurchaseSuccess({ userId: "bad", productId: 12, orderId: "x" }), false);
});
