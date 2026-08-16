import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const backend = await readFile(backendUrl, "utf8");

function loadGameNetPublicSessions() {
  const start = backend.indexOf("var GameNetPublicSessions = class {");
  const end = backend.indexOf("var defaultDamageState =", start);
  assert.notEqual(start, -1, "game-net PUBLIC session registry is missing");
  assert.notEqual(end, -1, "game-net PUBLIC session boundary is missing");
  const classSource = backend.slice(start, end).replace(
    "var GameNetPublicSessions = class {",
    "GameNetPublicSessions = class {",
  );
  const context = {
    GameNetPublicSessions: undefined,
    AuthoritativeGameRuntime: class {},
    NetPublicSchema: { free() {}, identity: {} },
    compareNumber: (left, right) => left - right,
    createPublicState: () => ({}),
    decodeTemporaryLegacyPositionTransformCommand: () => undefined,
    defaultDamageState: Object.freeze({ showHealthBar: true, hp: 100, maxHp: 100 }),
    gameTickMilliseconds: 64,
    matchesSessionLabel: (sessionId, label) => sessionId === label || `label:${sessionId}` === label,
    normalizeRuntimeDamageState: state => state,
    requireEntityId2() {},
    requireSessionId6(value) { if (!value) throw new Error("sessionId must not be empty"); },
    requireTick4() {},
    setInterval,
    clearInterval,
  };
  vm.runInNewContext(classSource, context);
  return context.GameNetPublicSessions;
}

test("player kick closes only the selected MuDB session", () => {
  const GameNetPublicSessions = loadGameNetPublicSessions();
  const sessions = new GameNetPublicSessions({ gameClock: {}, runtime: {}, schedule: () => 0, cancel() {} });
  const closed = [];
  sessions.sessions.set("first", { sessionId: "first", client: { close: () => closed.push("first") } });
  sessions.sessions.set("second", { sessionId: "second", client: { close: () => closed.push("second") } });

  assert.equal(sessions.kick("label:second"), true);
  assert.deepEqual(closed, ["second"]);
  assert.equal(sessions.kick("missing"), false);
  assert.deepEqual(closed, ["second"]);
});

test("backend exposes loopback-only player kick control ingress", () => {
  assert.match(backend, /kickPlayer\(sessionLabel\)[\s\S]*?gameNetPublicSessions\.kick\(sessionLabel\)/);
  assert.match(backend, /url\.pathname === "\/__nea\/control\/player-kick"/);
  assert.match(backend, /response\.statusCode = kicked \? 202 : 404/);
});
