import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("client UI inheritance is cataloged under concrete owners", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of [
    "client.object.UiNode",
    "client.UiNode.parent",
    "client.UiNode.children",
    "client.UiRenderable.position",
    "client.UiRenderable.rotation",
    "client.UiScreen.create",
    "client.UiScreen.getAllScreen",
  ]) {
    assert.equal(entries.get(id)?.capability, "client.ui", `${id} missing from client.ui`);
    assert.ok(entries.get(id)?.evidence.some(item => item.symbol === "modules 2524 / 65549 / 592 UiNode inheritance wrappers"));
  }
  assert.equal(entries.has("client.ClientUI.name"), false);
});

test("UI EventEmitter methods remain a nested client object surface", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const method of ["add", "emit", "off", "on", "once", "remove", "removeAll"]) {
    const entry = entries.get(`client.EventEmitter.${method}`);
    assert.equal(entry?.kind, "method");
    assert.equal(entry?.capability, "client.ui");
    assert.ok(entry?.evidence.some(item => item.symbol === "module 53601 UI EventEmitter wrapper"));
  }
});

test("Audio and MediaError preserve constructor property and event distinctions", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  assert.equal(entries.get("client.Audio.Audio")?.kind, "constructor");
  assert.equal(entries.get("client.Audio.loadeddata")?.kind, "event");
  assert.equal(entries.get("client.Audio.ended")?.kind, "event");
  assert.equal(entries.get("client.Audio.error")?.kind, "property");
  assert.equal(entries.get("client.MediaError.MediaError")?.kind, "constructor");
  for (const id of ["client.Audio.play", "client.Audio.pause", "client.Audio.src", "client.Audio.volume", "client.MediaError.code", "client.MediaError.message"]) {
    assert.equal(entries.get(id)?.capability, "client.media", `${id} missing from client.media`);
  }
});

test("UiInput exposes only wrapper-backed documented members", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entries = new Map(analysis.entries.map(entry => [entry.id, entry]));
  for (const id of ["client.UiInput.blur", "client.UiInput.create", "client.UiInput.focus", "client.UiInput.isFocus", "client.UiInput.placeholder", "client.UiInput.placeholderColor"]) {
    assert.equal(entries.get(id)?.capability, "client.ui", `${id} missing from client.ui`);
    assert.ok(entries.get(id)?.evidence.some(item => item.symbol === "module 21031 UiInput wrapper and input focus events"));
  }
  assert.equal(entries.has("client.UiInput.placeholderOpacity"), false);
  const unavailable = analysis.unavailable.find(item => item.id === "client.UiInput.placeholderOpacity");
  assert.equal(unavailable.status, "confirmed-wrapper-absent");
  assert.ok(unavailable.reason.includes("hardens the UiInput constructor"));
  assert.equal(unavailable.evidence.length, 3);
});

test("RemoteChannel receive registration is separate from server runtime events", async () => {
  const analysis = await readJson("generated/player-client-script-runtime-analysis.json");
  const entry = analysis.entries.find(item => item.id === "client.remoteChannel.onClientEvent");
  assert.equal(entry?.side, "client");
  assert.equal(entry?.capability, "client.remote-channel");
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
