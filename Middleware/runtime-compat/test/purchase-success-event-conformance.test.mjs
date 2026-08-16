import assert from "node:assert/strict";
import test from "node:test";

import { buildRepositoryProjectCapabilityManifest } from "../../../Frontend/demo-map/src/project-capability.mjs";
import { RuntimePurchaseSuccessEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { createPurchaseSuccessEventFixture } from "../conformance/purchase-success-event.mjs";

test("RuntimePurchaseSuccessEvent preserves the recovered four-field shape", () => {
  const event = createPurchaseSuccessEventFixture();
  assert.ok(event instanceof RuntimePurchaseSuccessEvent);
  assert.deepEqual(Object.keys(event), ["tick", "userId", "productId", "orderId"]);
  assert.deepEqual(
    { tick: event.tick, userId: event.userId, productId: event.productId, orderId: event.orderId },
    { tick: 41, userId: "user-1", productId: "product.asset", orderId: 12345 },
  );
});

test("Capability Manifest types purchase payloads while retaining the ingress blocker", async () => {
  const manifest = await buildRepositoryProjectCapabilityManifest({
    apiVersion: "0.1.0",
    contracts: { client: "dao3-client-runtime/v1", server: "nea-server-runtime/v1" },
    projectIdentity: { projectName: "Conformance Project" },
    serverModules: [{ name: "server.js", source: `
      world.onPlayerPurchaseSuccess(event => { event.tick; event.userId; event.productId; event.orderId; });
      const product = event => event.productId === "product.asset";
      world.nextPlayerPurchaseSuccess(product);
    ` }],
    clientModules: [],
    serverCapabilities: ["server.world.events"],
    clientCapabilities: [], assets: [], entities: [], uiState: null,
  });

  assert.equal(manifest.status, "blocked");
  for (const usage of ["event.tick", "event.userId", "event.productId", "event.orderId"]) {
    assert.ok(manifest.requirements.some(item => item.usage === usage && item.owner === "GamePurchaseSuccessEvent" && item.state === "partial"), usage);
  }
  assert.equal(manifest.requirements.some(item => item.usage === "product.asset"), false);
  assert.ok(manifest.diagnostics.some(item => item.code === "purchase-success-ingress-unavailable" && item.state === "blocked"));
});
