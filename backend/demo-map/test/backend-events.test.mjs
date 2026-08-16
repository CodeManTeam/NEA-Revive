import assert from "node:assert/strict";
import test from "node:test";
import { parseBackendEvent } from "../src/backend-events.mjs";

test("parses Player joins and unwraps remote-channel args", () => {
  const sessionLabel = `session-sha256-${"a".repeat(64)}`;
  assert.deepEqual(parseBackendEvent(`[session] join ${sessionLabel}`), {
    type: "player-join",
    sessionLabel,
  });
  assert.deepEqual(parseBackendEvent(`[remote-channel:event] ${sessionLabel} {"tick":7,"args":"{\\"type\\":\\"nea-demo:ready\\"}"}`), {
    type: "client-event",
    sessionLabel,
    tick: 7,
    event: { type: "nea-demo:ready" },
  });
  assert.deepEqual(parseBackendEvent(`[gui:message] ${sessionLabel} ${JSON.stringify({ name: "buy", payload: JSON.stringify({ id: 2 }) })}`), {
    type: "gui-message",
    sessionLabel,
    name: "buy",
    payload: { id: 2 },
  });
  assert.deepEqual(parseBackendEvent('[game-net:entity-map] {"entities":[{"entityIndex":2,"entityId":1000002}]}'), {
    type: "entity-map",
    entities: [{ entityIndex: 2, entityId: 1000002 }],
  });
  assert.deepEqual(parseBackendEvent(`[game-net:input] ${sessionLabel} {"tick":12,"events":[{"tick":11,"buttonState":1,"prevButtonState":0}]}`), {
    type: "input-events",
    sessionLabel,
    packet: { tick: 12, events: [{ tick: 11, buttonState: 1, prevButtonState: 0 }] },
  });
  assert.deepEqual(parseBackendEvent(`[entity-interact] ${sessionLabel} {"id":1000042,"tick":12.5}`), {
    type: "entity-interact",
    sessionLabel,
    entityId: 1000042,
    tick: 12.5,
  });
  assert.deepEqual(parseBackendEvent(`[game-net:keyboard] ${sessionLabel} {"tick":13,"keyDown":[65],"keyUp":[66]}`), {
    type: "keyboard-events",
    sessionLabel,
    tick: 13,
    keyDown: [65],
    keyUp: [66],
  });
  assert.deepEqual(parseBackendEvent(`[session] disconnected ${sessionLabel}`), {
    type: "player-leave",
    sessionLabel,
  });
  assert.equal(parseBackendEvent("[game-terrain] ready"), null);
  assert.throws(() => parseBackendEvent("[session] join local-...1234"), /stable session bridge label/);
  assert.throws(() => parseBackendEvent(`[game-net:keyboard] ${sessionLabel} {"tick":-1,"keyDown":[],"keyUp":[]}`), /requires a tick and key arrays/);
});
