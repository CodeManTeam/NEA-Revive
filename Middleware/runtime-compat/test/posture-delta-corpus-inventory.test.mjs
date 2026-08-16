import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const inventory = JSON.parse(await readFile(new URL("../generated/posture-delta-corpus-inventory.json", import.meta.url), "utf8"));

test("local MuDB captures contain only client-to-server binary traffic", () => {
  assert.equal(inventory.captures.count, 9);
  assert.equal(inventory.captures.traffic.clientToServerBinaryFrames, 1864);
  assert.equal(inventory.captures.traffic.serverToClientBinaryFrames, 0);
  assert.ok(inventory.captures.packetGroups.every(group => group.direction === "send"));
  const input = inventory.captures.packetGroups.find(group => group.protocol === "game-net" && group.message === "input");
  assert.equal(input.count, 1309);
  assert.equal(inventory.packetOrderEvidence.observedSha256, inventory.packetOrderEvidence.expectedSha256);
});

test("resource archives replay and connection cache do not masquerade as PUBLIC frames", () => {
  assert.equal(inventory.resourceArchives.count, 3);
  assert.equal(inventory.resourceArchives.frameCandidateEntries, 0);
  assert.equal(inventory.resourceArchives.classification, "resource-only");
  assert.deepEqual(inventory.bootstrap.rawPayloadFields, []);
  assert.equal(inventory.staticReplay.rawPayloadAvailable, false);
  assert.equal(inventory.websocketDiscovery.classification, "http-websocket-connection-discovery-metadata");
  assert.ok(inventory.websocketDiscovery.responses.every(response => response.dataProtocol === "wss:" && response.rawPayloadFields.length === 0));
});

test("posture delta corpus remains unresolved without inventing dimensions", () => {
  assert.equal(inventory.authoritativePostureDelta.status, "not-found-in-safe-local-frame-corpus");
  assert.equal(inventory.authoritativePostureDelta.candidateServerToClientBinaryFrames, 0);
  assert.deepEqual(inventory.authoritativePostureDelta.requiredFields, ["rx", "ry", "rz", "hsx", "hsy", "hsz"]);
  assert.deepEqual(inventory.safety, {
    payloadValuesIncluded: false,
    websocketUrlsIncluded: false,
    sessionIdentifiersIncluded: false,
    privateBrowserStoresRead: false,
  });
});
