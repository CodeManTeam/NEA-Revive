import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const inventory = JSON.parse(await readFile(new URL("../generated/player-profile-network-inventory.json", import.meta.url), "utf8"));

test("Player profile inventory does not expose secret browser stores", () => {
  assert.ok(inventory.source.excluded.length >= 4);
  assert.ok(inventory.serviceWorkerCache.entries.every(entry => !/cookie|login data|web data|history/i.test(entry.file)));
  assert.ok(inventory.serviceWorkerCache.entries.every(entry => entry.pathname.startsWith("/_next/static/") || entry.pathname.startsWith("[")));
  assert.ok(inventory.browserStores.every(store => !Object.hasOwn(store, "contents")));
});

test("static JavaScript companion streams are not classified as PUBLIC frames", () => {
  assert.ok(inventory.serviceWorkerCache.staticJavascriptResponses > 0);
  assert.ok(inventory.serviceWorkerCache.staticJavascriptBinaryCompanions > 0);
  assert.equal(inventory.publicFrameEvidence.serverToClientBinaryFrames, 0);
  assert.equal(inventory.publicFrameEvidence.status, "not-found");
  assert.ok(inventory.serviceWorkerCache.entries.every(entry => !entry.pathname.includes("?")));
  assert.equal(inventory.serviceWorkerCache.ignoredTemporaryFiles, 1);
  assert.ok(inventory.serviceWorkerCache.entries.every(entry => !entry.file.includes("todelete_")));
  const play = inventory.serviceWorkerCache.routeFamilies.find(entry => entry.routeFamily === "/play/[id]" && entry.streamIndex === 0);
  assert.equal(play.responseKind, "html");
  assert.ok(play.queryNames.includes("contentId"));
});
