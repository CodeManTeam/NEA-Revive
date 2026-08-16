import assert from "node:assert/strict";
import test from "node:test";
import { createBackendEventBridge } from "../src/backend-event-bridge.mjs";

test("backend event bridge maps Player lifecycle events to runtime players", () => {
  const fixture = createFixture();
  assert.equal(fixture.dispatch({ type: "player-join", sessionLabel: "session-a" }), true);
  assert.equal(fixture.dispatch({ type: "player-join", sessionLabel: "session-a" }), false);
  assert.deepEqual(fixture.calls.addPlayer, [{ id: "player-1", name: "Guest", position: [3, 4, 5], authority: "backend" }]);
  assert.equal(fixture.sessionPlayers.get("session-a"), "player-1");
  assert.equal(fixture.playerSessions.get("player-1"), "session-a");
  assert.equal(fixture.dispatch({ type: "player-leave", sessionLabel: "session-a" }), true);
  assert.deepEqual(fixture.calls.removePlayer, ["player-1"]);
  assert.equal(fixture.sessionPlayers.size, 0);
  assert.equal(fixture.playerSessions.size, 0);
});

test("backend event bridge dispatches parsed Player events without transport claims", () => {
  const fixture = createFixture({ sessionPlayers: new Map([["session-a", "player-1"]]) });
  assert.equal(fixture.dispatch({ type: "entity-map", entities: [{ entityIndex: 2, entityId: 7 }] }), true);
  assert.equal(fixture.dispatch({ type: "input-events", sessionLabel: "session-a", packet: { tick: 3, events: [] } }), true);
  assert.equal(fixture.dispatch({ type: "entity-interact", sessionLabel: "session-a", entityId: 7, tick: 3.5 }), true);
  assert.equal(fixture.dispatch({ type: "keyboard-events", sessionLabel: "session-a", tick: 4, keyDown: [65], keyUp: [66] }), true);
  assert.equal(fixture.dispatch({ type: "gui-message", sessionLabel: "session-a", name: "buy", payload: { id: 2 } }), true);
  assert.equal(fixture.dispatch({ type: "client-event", sessionLabel: "missing", event: { type: "script-owned" } }), true);
  assert.deepEqual(fixture.calls, {
    addPlayer: [],
    bindBackendEntities: [[{ entityIndex: 2, entityId: 7 }]],
    dispatchClientEvent: [["player-1", { type: "script-owned" }]],
    dispatchGuiMessage: [["player-1", "buy", { id: 2 }]],
    dispatchInputEvents: [["player-1", { tick: 3, events: [] }]],
    dispatchInteract: [["player-1", 7, 3.5]],
    dispatchKeyboardEvent: [["keyDown", "player-1", 4, 65], ["keyUp", "player-1", 4, 66]],
    removePlayer: [],
  });
  assert.match(fixture.logs[0], /bound 1\/1 backend entities/);
  assert.match(fixture.logs[1], /script-owned/);
});

test("backend event bridge ignores unknown events and missing Player sessions", () => {
  const fixture = createFixture();
  assert.equal(fixture.dispatch(null), false);
  assert.equal(fixture.dispatch({ type: "unknown" }), false);
  assert.equal(fixture.dispatch({ type: "input-events", sessionLabel: "missing", packet: {} }), false);
  assert.equal(fixture.dispatch({ type: "client-event", sessionLabel: "missing", event: {} }), false);
});

function createFixture(options = {}) {
  const calls = {
    addPlayer: [],
    bindBackendEntities: [],
    dispatchClientEvent: [],
    dispatchGuiMessage: [],
    dispatchInputEvents: [],
    dispatchInteract: [],
    dispatchKeyboardEvent: [],
    removePlayer: [],
  };
  const logs = [];
  const sessionPlayers = options.sessionPlayers ?? new Map();
  const playerSessions = options.playerSessions ?? new Map();
  const runtime = {
    addPlayer: player => calls.addPlayer.push(player),
    bindBackendEntities: entities => {
      calls.bindBackendEntities.push(entities);
      return entities.length;
    },
    dispatchClientEvent: (playerId, event) => calls.dispatchClientEvent.push([playerId, event]),
    dispatchGuiMessage: (playerId, name, payload) => calls.dispatchGuiMessage.push([playerId, name, payload]),
    dispatchInputEvents: (playerId, packet) => calls.dispatchInputEvents.push([playerId, packet]),
    dispatchInteract: (playerId, entityId, tick) => calls.dispatchInteract.push([playerId, entityId, tick]),
    dispatchKeyboardEvent: (type, playerId, tick, keyCode) => calls.dispatchKeyboardEvent.push([type, playerId, tick, keyCode]),
    removePlayer: playerId => calls.removePlayer.push(playerId),
  };
  return {
    calls,
    dispatch: createBackendEventBridge({ logger: { log: message => logs.push(message) }, playerSessions, runtime, sessionPlayers, spawnPoint: [3, 4, 5] }),
    logs,
    playerSessions,
    sessionPlayers,
  };
}
