import assert from "node:assert/strict";
import test from "node:test";
import { retryControlRequest } from "../src/control-retry.mjs";

test("control retry retries matching failures until success", async () => {
  let attempts = 0;
  const result = await retryControlRequest({
    delayMS: 0,
    maxAttempts: 3,
    request: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("client not connected");
      return "delivered";
    },
    shouldRetry: error => String(error).includes("client not connected"),
  });
  assert.equal(result, "delivered");
  assert.equal(attempts, 3);
});

test("control retry stops on non-retryable failures and attempt exhaustion", async () => {
  let attempts = 0;
  await assert.rejects(retryControlRequest({
    delayMS: 0,
    maxAttempts: 3,
    request: async () => {
      attempts += 1;
      throw new Error("invalid request");
    },
    shouldRetry: error => String(error).includes("client not connected"),
  }), /invalid request/);
  assert.equal(attempts, 1);
});

test("control retry cancels pending waits", async () => {
  const controller = new AbortController();
  const pending = retryControlRequest({
    delayMS: 1_000,
    maxAttempts: 3,
    request: async () => { throw new Error("client not connected"); },
    shouldRetry: error => String(error).includes("client not connected"),
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(new Error("shutdown")), 10);
  await assert.rejects(pending, /shutdown/);
});
