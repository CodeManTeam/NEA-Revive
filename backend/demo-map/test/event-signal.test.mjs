import assert from "node:assert/strict";
import test from "node:test";
import { EventSignal } from "../src/runtime/event-signal.mjs";

test("event tokens implement cancel resume and active semantics", () => {
  const signal = new EventSignal();
  const received = [];
  const handler = event => received.push(event);
  const first = signal.on(handler);
  const second = signal.on(handler);
  assert.equal(first.active(), true);
  signal.emit(1);
  first.cancel();
  assert.equal(first.active(), false);
  signal.emit(2);
  first.resume();
  assert.equal(first.active(), true);
  signal.emit(3);
  second.cancel();
  signal.emit(4);
  assert.deepEqual(received, [1, 1, 2, 3, 3, 4]);
});

test("cleared event tokens cannot resume", () => {
  const signal = new EventSignal();
  const token = signal.on(() => {});
  signal.clear();
  token.resume();
  assert.equal(token.active(), false);
});

test("event futures wait for a matching recovered filter", async () => {
  const signal = new EventSignal();
  const order = [];
  signal.on(event => order.push(`handler:${event.id}`));
  const future = signal.next(event => {
    order.push(`filter:${event.id}`);
    return event.accept === true;
  });
  signal.emit({ id: 1, accept: false });
  let settled = false;
  future.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  const accepted = { id: 2, accept: true };
  signal.emit(accepted);
  assert.equal(await future, accepted);
  assert.deepEqual(order, ["handler:1", "filter:1", "handler:2", "filter:2"]);
});

test("event future filter errors are reported and still resolve the current event", async () => {
  const signal = new EventSignal();
  const errors = [];
  const event = { id: 3 };
  const future = signal.next(() => { throw new Error("filter failed"); });
  signal.emit(event, error => errors.push(error.message));
  assert.equal(await future, event);
  assert.deepEqual(errors, ["filter failed"]);
});

test("clearing a dispatcher rejects pending and future next calls", async () => {
  const signal = new EventSignal();
  const pending = signal.next(() => true);
  signal.clear("runtime stopped");
  await assert.rejects(pending, /runtime stopped/);
  await assert.rejects(signal.next(), /dispatcher destroyed/);
});
