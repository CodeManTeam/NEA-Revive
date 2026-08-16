import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const backend = await readFile(backendUrl, "utf8");

function loadKeyboardInteractionService() {
  const start = backend.indexOf("var KeyboardInteractionService = class {");
  const end = backend.indexOf("function keyCodes(value)", start);
  assert.notEqual(start, -1, "keyboard interaction service is missing");
  assert.notEqual(end, -1, "keyboard interaction boundary is missing");
  const source = backend.slice(start, end).replace("var KeyboardInteractionService = class {", "KeyboardInteractionService = class {");
  const context = { KeyboardInteractionService: undefined, keyCodes: value => Array.isArray(value) && value.length <= 64 && value.every(item => Number.isInteger(item) && item >= 0 && item <= 255) ? value : undefined, isRecord4: value => value !== null && typeof value === "object" };
  vm.runInNewContext(source, context);
  return context.KeyboardInteractionService;
}

test("keyboard interaction emits key-down and key-up set differences", () => {
  const KeyboardInteractionService = loadKeyboardInteractionService();
  const pressed = [];
  const transitions = [];
  const service = new KeyboardInteractionService({
    playerIdForSession: () => 7,
    onKeyPress: (sessionId, keyCode) => pressed.push([sessionId, keyCode]),
    onTransitions: (sessionId, value) => transitions.push([sessionId, structuredClone(value)]),
  });

  assert.equal(service.handle("session", { id: 7, tick: 12, keyDownState: [65, 67, 67], prevKeyDownState: [65, 66] }), 2);
  assert.deepEqual(pressed, [["session", 67]]);
  assert.deepEqual(transitions, [["session", { tick: 12, keyDown: [67], keyUp: [66] }]]);
  assert.equal(service.handle("session", { id: 7, tick: -1, keyDownState: [], prevKeyDownState: [] }), 0);
});

test("backend emits an anonymous structured keyboard bridge event", () => {
  assert.match(backend, /\[game-net:keyboard\] \$\{sessionBridgeLabel\(sessionId\)\}/);
  assert.match(backend, /prevKeyDownState/);
});
