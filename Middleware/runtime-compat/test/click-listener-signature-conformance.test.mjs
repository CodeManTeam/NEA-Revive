import test from "node:test";
import assert from "node:assert/strict";
import { clickListenerSignatureContract } from "../conformance/click-listener-signature.mjs";

test("click listener and future retain their distinct recovered signatures", () => {
  assert.deepEqual(clickListenerSignatureContract.onClick, {
    parameters: ["handler"],
    filterSupported: false,
  });
  assert.deepEqual(clickListenerSignatureContract.nextClick, {
    parameters: ["filter?"],
    filterSupported: true,
  });
  assert.match(clickListenerSignatureContract.remainingGap, /authoritative backend entity binding/);
});
