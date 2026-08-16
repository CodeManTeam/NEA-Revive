import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url), "utf8");

test("backend exposes authenticated dialog open and cancel-all control operations", () => {
  assert.match(backend, /\/__nea\/control\/dialog"/);
  assert.match(backend, /\/__nea\/control\/dialog-cancel-all/);
  assert.match(backend, /server\.openDialog\(body\.session, body\.config\)/);
  assert.match(backend, /server\.cancelDialogs\(body\.session\)/);
});

function loadDialogSessions() {
  const start = backend.indexOf("var maximumRpcId = 4294967295;");
  const end = backend.indexOf("// legacy/box3-compat/src/session/gui-sessions.ts", start);
  assert.notEqual(start, -1, "Dialog session transport is missing");
  assert.notEqual(end, -1, "Dialog session transport boundary is missing");
  const source = backend.slice(start, end).replace("var DialogSessions = class {", "DialogSessions = class {");
  const context = { DialogSessions: undefined };
  vm.runInNewContext(source, context);
  return context.DialogSessions;
}

test("Dialog sessions use native white backgrounds with opaque black default text", async () => {
  const DialogSessions = loadDialogSessions();
  const sessions = new DialogSessions();
  const sent = [];
  const client = {
    sessionId: "session-dialog-defaults",
    message: {
      open: packet => sent.push(structuredClone(packet)),
      cancelDialog() {},
      cancelDialogs() {}
    }
  };
  sessions.connect(client);

  const pending = sessions.open(client.sessionId, { type: "text", title: "Title", content: "Content" });
  const common = sent[0].config.data.common;
  assert.deepEqual(common.contentBackgroundColor, { r: 1, g: 1, b: 1, a: 1 });
  assert.deepEqual(common.titleBackgroundColor, { r: 1, g: 1, b: 1, a: 1 });
  assert.deepEqual(common.contentTextColor, { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(common.titleTextColor, { r: 0, g: 0, b: 0, a: 1 });

  sessions.close(client, { rpcId: pending.rpcId, result: { type: "text", data: "success" } });
  assert.equal(JSON.stringify(await pending.response), JSON.stringify({ type: "text", data: "success" }));
});

test("Dialog sessions preserve explicit RGBA values", () => {
  const DialogSessions = loadDialogSessions();
  const sessions = new DialogSessions();
  const sent = [];
  const client = {
    sessionId: "session-dialog-colors",
    message: {
      open: packet => sent.push(structuredClone(packet)),
      cancelDialog() {},
      cancelDialogs() {}
    }
  };
  sessions.connect(client);

  sessions.open(client.sessionId, {
    type: "select",
    content: "Choose",
    options: ["A"],
    contentBackgroundColor: { r: 0.1, g: 0.2, b: 0.3, a: 0.4 },
    contentTextColor: { r: 0.5, g: 0.6, b: 0.7, a: 0.8 },
    titleBackgroundColor: { r: 0.9, g: 0.8, b: 0.7, a: 0.6 },
    titleTextColor: { r: 0.4, g: 0.3, b: 0.2, a: 0.1 }
  });

  const common = sent[0].config.data.common;
  assert.deepEqual(common.contentBackgroundColor, { r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
  assert.deepEqual(common.contentTextColor, { r: 0.5, g: 0.6, b: 0.7, a: 0.8 });
  assert.deepEqual(common.titleBackgroundColor, { r: 0.9, g: 0.8, b: 0.7, a: 0.6 });
  assert.deepEqual(common.titleTextColor, { r: 0.4, g: 0.3, b: 0.2, a: 0.1 });
});

test("Dialog disconnect rejects callers without creating an unhandled rejection", async () => {
  const DialogSessions = loadDialogSessions();
  const sessions = new DialogSessions();
  const client = {
    sessionId: "session-dialog-disconnect",
    message: {
      open() {},
      cancelDialog() {},
      cancelDialogs() {}
    }
  };
  sessions.connect(client);

  const pending = sessions.open(client.sessionId, { type: "text", content: "Waiting" });
  sessions.disconnect(client);

  await assert.rejects(pending.response, /Dialog client disconnected/);
});
