import assert from "node:assert/strict";
import test from "node:test";
import { EventSignal, GameEventHandlerToken } from "../../../Frontend/demo-map/src/runtime/event-signal.mjs";
import { gameEventHandlerTokenApiConformance } from "../conformance/game-event-handler-token-api.mjs";

test("EventSignal returns the recovered GameEventHandlerToken lifecycle", () => {
  const signal = new EventSignal();
  const events = [];
  const token = signal.on(value => events.push(value));
  assert.ok(token instanceof GameEventHandlerToken);
  assert.equal(token.active(), true);
  token.cancel();
  assert.equal(token.active(), false);
  signal.emit("cancelled");
  token.resume();
  assert.equal(token.active(), true);
  signal.emit("resumed");
  assert.deepEqual(events, ["resumed"]);
  signal.clear();
  assert.equal(token.active(), false);
  token.resume();
  assert.equal(token.active(), false);
});

test("EventSignal preserves recovered dispatch-time queue behavior", () => {
  const signal = new EventSignal();
  const events = [];
  let secondToken;
  signal.on(() => {
    secondToken.resume();
    events.push("first");
  });
  secondToken = signal.on(() => events.push("second"));
  secondToken.cancel();
  signal.emit(null);
  assert.deepEqual(events, ["first", "second"]);
  assert.deepEqual(gameEventHandlerTokenApiConformance.compatible, ["cancel", "resume", "active"]);
});
