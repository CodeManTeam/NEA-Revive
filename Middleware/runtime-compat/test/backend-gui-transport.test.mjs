import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

function loadGuiSessions() {
  const start = backend.indexOf("var maximumGuiHandle = 4294967295;");
  const end = backend.indexOf("// legacy/box3-compat/src/session/game-chat-sessions.ts", start);
  assert.notEqual(start, -1, "GUI session transport is missing");
  assert.notEqual(end, -1, "GUI session transport boundary is missing");
  const source = backend.slice(start, end).replace("var GuiSessions = class {", "GuiSessions = class {");
  const context = {
    GuiSessions: undefined,
    matchesSessionLabel(sessionId, label) {
      return sessionId === label || `${sessionId.slice(0, 6)}...${sessionId.slice(-4)}` === label;
    },
  };
  vm.runInNewContext(source, context);
  return context.GuiSessions;
}

function client(sessionId, sent) {
  const message = {};
  for (const operation of ["init", "show", "remove", "getAttribute", "setAttribute"]) {
    message[operation] = packet => sent.push({ operation, packet: structuredClone(packet) });
  }
  return { sessionId, message };
}

test("GUI sessions send native Player protocol packets and resolve handle returns", async () => {
  const GuiSessions = loadGuiSessions();
  const sessions = new GuiSessions();
  const sent = [];
  const transport = client("session-1234567890", sent);
  sessions.connect(transport);

  const removal = sessions.command("sessio...7890", { operation: "remove", selector: "#old" });
  assert.deepEqual(sent[0], { operation: "remove", packet: { handle: 0, selector: "#old" } });
  assert.equal(sessions.resolve(transport, { handle: 0, value: "" }), true);
  assert.equal(await removal, undefined);

  const attribute = sessions.command("session-1234567890", { operation: "getAttribute", selector: "#score", name: "text" });
  assert.deepEqual(sent[1], { operation: "getAttribute", packet: { handle: 1, selector: "#score", name: "text" } });
  sessions.resolve(transport, { handle: 1, value: JSON.stringify({ value: "3" }) });
  assert.equal(JSON.stringify(await attribute), JSON.stringify({ value: "3" }));
});

test("GUI sessions serialize init/set values and reject native throw responses", async () => {
  const GuiSessions = loadGuiSessions();
  const sessions = new GuiSessions();
  const sent = [];
  const transport = client("session-a", sent);
  sessions.connect(transport);

  const init = sessions.command("session-a", { operation: "init", config: { name: "menu" } });
  assert.deepEqual(sent[0], { operation: "init", packet: { handle: 0, data: '{"name":"menu"}' } });
  sessions.resolve(transport, { handle: 0, value: "" });
  await init;

  const write = sessions.command("session-a", { operation: "setAttribute", selector: "#score", name: "text", value: 4 });
  assert.deepEqual(sent[1], { operation: "setAttribute", packet: { handle: 1, selector: "#score", name: "text", value: "4" } });
  sessions.reject(transport, { handle: 1, message: "missing node" });
  await assert.rejects(write, /missing node/);
});

test("backend registers GUI sessions, handlers, control ingress, and cleanup", () => {
  assert.ok(backend.includes("this.guiSessions = new GuiSessions();"));
  assert.ok(backend.includes("if (schema === gui) context.guiSessions.connect(client)"));
  assert.ok(backend.includes("if (schema === gui) return createGuiHandlers(context)[messageName]"));
  assert.ok(backend.includes("[gui:message]"));
  assert.ok(backend.includes("/__nea/control/gui-command"));
  assert.ok(backend.includes("this.guiSessions.dispose()"));
});
