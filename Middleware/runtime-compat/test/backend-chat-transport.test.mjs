import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

function loadGameChatSessions() {
  const start = backend.indexOf("var GameChatSessions = class {");
  const end = backend.indexOf("// legacy/box3-compat/src/session/game-clock.ts", start);
  assert.notEqual(start, -1, "game-chat session transport is missing");
  assert.notEqual(end, -1, "game-chat session transport boundary is missing");
  const source = backend.slice(start, end).replace("var GameChatSessions = class {", "GameChatSessions = class {");
  const context = { GameChatSessions: undefined };
  vm.runInNewContext(source, context);
  return context.GameChatSessions;
}

function client(sessionId, sent) {
  return { sessionId, message: { log: packet => sent.push(structuredClone(packet)), globalNotice() {} } };
}

test("game-chat sessions emit recovered broadcast and private log packets", () => {
  const GameChatSessions = loadGameChatSessions();
  const sessions = new GameChatSessions();
  const first = [];
  const second = [];
  sessions.connect(client("session-a", first));
  sessions.connect(client("session-b", second));

  assert.equal(sessions.broadcastLog({ text: "broadcast", senderId: 0, private: false, duration: 0, hideFloat: false }), 2);
  assert.equal(sessions.sendLog("session-b", { text: "private", senderId: 41, private: true, duration: -1, hideFloat: true }), true);
  assert.equal(sessions.sendLog("missing", { text: "ignored", private: true }), false);

  assert.deepEqual(first, [{ duration: 0, id: 0, msgType: 0, hideFloat: false, private: false, valid: true, i18nPrefix: "", i18nSuffix: "", text: "broadcast" }]);
  assert.deepEqual(second, [
    { duration: 0, id: 0, msgType: 0, hideFloat: false, private: false, valid: true, i18nPrefix: "", i18nSuffix: "", text: "broadcast" },
    { duration: -1, id: 41, msgType: 0, hideFloat: true, private: true, valid: true, i18nPrefix: "", i18nSuffix: "", text: "private" },
  ]);
});

test("backend preserves game-chat sessions and authenticated control ingress", () => {
  assert.ok(backend.includes("this.gameChatSessions = new GameChatSessions();"));
  assert.ok(backend.includes("/__nea/control/chat-message"));
  assert.ok(backend.includes("return this.historicalProjectInstance?.sendChatMessage(sessionId, message) ?? false;"));
  assert.ok(backend.includes("return this.historicalProjectInstance?.sendChatMessages(deliveries) ?? false;"));
  assert.ok(backend.includes("server.sendChatMessage(body.session, body.message)"));
  assert.ok(backend.includes("server.sendChatMessages(body.deliveries)"));
  assert.match(backend, /sendChatMessages\(deliveries\)/);
  assert.ok(backend.includes("if (schema === gameChat) context.gameChatSessions.connect(client)"));
});
