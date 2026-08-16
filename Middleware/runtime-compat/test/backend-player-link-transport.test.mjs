import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const backendUrl = new URL("../../../Backend/local-player/backend/box3-server.cjs", import.meta.url);
const backend = await readFile(backendUrl, "utf8");

function loadRefSessions() {
  const start = backend.indexOf("var RefSessions = class {");
  const end = backend.indexOf("// legacy/box3-compat/src/game/terrain/terrain-sessions.ts", start);
  assert.notEqual(start, -1, "ref session registry is missing");
  assert.notEqual(end, -1, "ref session boundary is missing");
  const classSource = backend.slice(start, end).replace("var RefSessions = class {", "RefSessions = class {");
  const context = {
    RefSessions: undefined,
    matchesSessionLabel: (sessionId, label) => sessionId === label || `label:${sessionId}` === label,
  };
  vm.runInNewContext(classSource, context);
  return context.RefSessions;
}

test("ref sessions deliver recovered Player openLink packets", () => {
  const RefSessions = loadRefSessions();
  const sessions = new RefSessions();
  const packets = [];
  const first = { sessionId: "first", message: { openLink: packet => packets.push({ target: "first", packet: structuredClone(packet) }) } };
  const second = { sessionId: "second", message: { openLink: packet => packets.push({ target: "second", packet: structuredClone(packet) }) } };
  sessions.connect(first);
  sessions.connect(second);

  assert.equal(sessions.open("label:second", "https://example.test/default"), true);
  assert.equal(sessions.open("first", "https://example.test/custom", { isConfirm: false, isNewTab: false }), true);
  assert.equal(sessions.open("missing", "https://example.test"), false);
  assert.deepEqual(packets, [
    { target: "second", packet: { href: "https://example.test/default", isConfirm: true, isNewTab: true, warning: false } },
    { target: "first", packet: { href: "https://example.test/custom", isConfirm: false, isNewTab: false, warning: false } },
  ]);
});

test("ref sessions ignore stale disconnects after reconnect", () => {
  const RefSessions = loadRefSessions();
  const sessions = new RefSessions();
  const stale = { sessionId: "session", message: {} };
  const current = { sessionId: "session", message: {} };
  sessions.connect(stale);
  sessions.connect(current);
  assert.equal(sessions.disconnect(stale), false);
  assert.equal(sessions.clients.get("session"), current);
  assert.equal(sessions.disconnect(current), true);
});

test("backend exposes loopback-only Player link control ingress", () => {
  assert.match(backend, /if \(schema === ref\) context\.refSessions\.connect\(client\)/);
  assert.match(backend, /url\.pathname === "\/__nea\/control\/player-link"/);
  assert.match(backend, /server\.linkPlayer\(body\.session, body\.href, body\.options\)/);
});
