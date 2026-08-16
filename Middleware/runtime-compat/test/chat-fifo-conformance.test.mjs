import assert from "node:assert/strict";
import test from "node:test";
import { HistoricalChatFifo } from "../conformance/chat-fifo.mjs";

test("historical chat FIFO sends the configured prefix and buffers overflow", () => {
  const fifo = new HistoricalChatFifo(2);
  assert.deepEqual(fifo.enqueue("a"), ["a"]);
  assert.deepEqual(fifo.enqueue("b"), ["b"]);
  assert.deepEqual(fifo.enqueue("c"), []);
  assert.deepEqual(fifo.enqueue("d"), []);
  assert.deepEqual(fifo.diagnostics(), { limit: 2, remaining: 0, buffered: 2 });
  assert.deepEqual(fifo.drainTickBoundary(), ["c", "d"]);
  assert.deepEqual(fifo.diagnostics(), { limit: 2, remaining: 2, buffered: 0 });
});

test("unknown historical chat limit preserves delivery without inventing a number", () => {
  const fifo = new HistoricalChatFifo(null);
  assert.deepEqual(fifo.enqueue("a"), ["a"]);
  assert.deepEqual(fifo.enqueue("b"), ["b"]);
  assert.deepEqual(fifo.drainTickBoundary(), []);
  assert.deepEqual(fifo.diagnostics(), { limit: null, remaining: null, buffered: 0 });
});

test("chat FIFO rejects fabricated or ambiguous limits", () => {
  for (const value of [-1, 1.5, Number.POSITIVE_INFINITY, "4"]) {
    assert.throws(() => new HistoricalChatFifo(value), /non-negative safe integer or null/);
  }
});
