import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("current ABI entries have unique identifiers and evidence", async () => {
  const catalog = JSON.parse(await readFile(resolve(root, "abi", "current-runtime.json"), "utf8"));
  const ids = catalog.entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of catalog.entries) {
    assert.ok(entry.evidence.length > 0, `${entry.id} must retain evidence`);
    assert.match(entry.id, /^(client|server|shared|transport|physics)\./);
  }
});

test("documentation declarations use canonical owners and unique identifiers", async () => {
  const catalog = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));
  const ids = catalog.entries.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("client.ClientWorld.rendering3d"));
  assert.ok(ids.includes("client.ClientScreen.resize"));
  assert.ok(ids.includes("server.GameEntity.bounds"));
  assert.ok(ids.includes("server.GameWorld.say"));
  assert.ok(ids.includes("server.GameWorld.onTick"));
  assert.ok(ids.includes("server.GameWorld.onPlayerJoin"));
  assert.ok(!ids.includes("client.input.rendering3d"));
  assert.ok(!ids.includes("server.physics.bounds"));
});

test("player body ABI confirms center origin and recovered upright default size", async () => {
  const profile = JSON.parse(await readFile(resolve(root, "abi", "physics-player-body.json"), "utf8"));
  assert.equal(profile.status, "partial");
  assert.equal(profile.coordinateOrigin, "body-center");
  assert.equal(profile.coordinateOriginStatus, "confirmed");
  assert.deepEqual(profile.dimensions, [0.9, 2.2, 0.9]);
  assert.deepEqual(profile.halfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(profile.bodyFields.bounds, ["rx", "ry", "rz"]);
  assert.deepEqual(profile.bodyFields.shapeHalfExtents, ["hsx", "hsy", "hsz"]);
  assert.deepEqual(profile.rejectedAssumptions[0].dimensions, [0.6, 1.8, 0.6]);
});

test("remote-channel schema stays symmetric", async () => {
  const catalog = JSON.parse(await readFile(resolve(root, "abi", "protocols.json"), "utf8"));
  const remote = catalog.protocols.find(protocol => protocol.id === "player.remote-channel");
  assert.deepEqual(remote.clientReceives.sendClientEvent.fields, remote.serverReceives.sendServerEvent.fields);
  assert.equal(remote.compatibility, "bridged");
  assert.equal(catalog.summary.playerProtocols, 20);
  assert.equal(catalog.summary.scriptProtocols, 12);
  const clientMessage = catalog.messages.find(message => message.id === "player.remote-channel.server-to-client.sendClientEvent");
  const serverMessage = catalog.messages.find(message => message.id === "player.remote-channel.client-to-server.sendServerEvent");
  assert.equal(clientMessage.receiver, "client");
  assert.equal(serverMessage.receiver, "server");
  assert.deepEqual(clientMessage.schema.fields, serverMessage.schema.fields);
});

test("generated client and server catalogs remain separated", async () => {
  const client = JSON.parse(await readFile(resolve(root, "abi", "client-runtime.json"), "utf8"));
  const server = JSON.parse(await readFile(resolve(root, "abi", "server-runtime.json"), "utf8"));
  assert.ok(client.entries.length > 0);
  assert.ok(server.entries.length > client.entries.length);
  assert.ok(client.entries.every(entry => entry.side === "client"));
  assert.ok(server.entries.every(entry => entry.side === "server"));
  assert.ok(server.entries.some(entry => entry.evidence.some(evidence => evidence.type === "origin-source")));
});

test("historical player motor does not locally rewrite body half extents", async () => {
  const analysis = JSON.parse(await readFile(resolve(root, "generated", "player-physics-bundle-analysis.json"), "utf8"));
  assert.equal(analysis.rigidBody.boundsRepresentation, "axis-aligned-broadphase-half-extents-rx-ry-rz");
  assert.equal(analysis.rigidBody.shapeRepresentation, "local-shape-half-extents-hsx-hsy-hsz");
  assert.deepEqual(analysis.rigidBody.defaultPlayerProfile.boundsHalfExtents, [0.45, 1.1, 0.45]);
  assert.deepEqual(analysis.rigidBody.defaultPlayerProfile.dimensions, [0.9, 2.2, 0.9]);
  const corroboration = Object.values(analysis.corroboration);
  assert.equal(corroboration.length, 1);
  assert.deepEqual(corroboration[0].boundsFields, ["rx", "ry", "rz"]);
  assert.deepEqual(corroboration[0].shapeHalfExtentFields, ["hsx", "hsy", "hsz"]);
  assert.equal(analysis.rigidBody.positionRepresentation, "body-center-px-py-pz");
  assert.equal(analysis.posture.clientMotorShapeWriteCount, 0);
  assert.equal(analysis.movement.defaultStepHeight, 1.25);
  assert.match(analysis.posture.crouch.conclusion, /server-authoritative body deltas/);
});

test("historical Player exposes a separate SES client Script Runtime", async () => {
  const analysis = JSON.parse(await readFile(resolve(root, "generated", "player-client-script-runtime-analysis.json"), "utf8"));
  assert.equal(analysis.execution.engine, "SES Compartment");
  assert.equal(analysis.execution.entryModule, "clientIndex.js");
  assert.equal(analysis.execution.deliveryMessage, "game-net.syncClientScriptModules");
  for (const name of ["ui", "input", "screen", "world", "http", "media", "remoteChannel"]) {
    assert.ok(analysis.globals.includes(name), `${name} must remain a confirmed client global`);
  }
  assert.ok(analysis.entries.some(entry => entry.id === "client.ClientMedia.startRecording" && entry.availability === "confirmed"));
  const resize = analysis.entries.find(entry => entry.id === "client.ClientScreen.resize");
  assert.equal(resize.kind, "event");
  assert.deepEqual(resize.binding, { eventBus: "screen.events", eventName: "resize" });
  const pointerLock = analysis.entries.find(entry => entry.id === "client.input.pointerlockchange");
  assert.equal(pointerLock.kind, "event");
  assert.deepEqual(pointerLock.binding, { eventBus: "input.pointerLockEvents", eventName: "pointerlockchange" });
  assert.ok(analysis.entries.some(entry => entry.id === "client.object.ClientRemoteChannel" && entry.compatibility === "native"));
});

test("legacy compatibility player body identity is excluded as size evidence", async () => {
  const evidence = JSON.parse(await readFile(resolve(root, "evidence", "legacy-player-body-producer.json"), "utf8"));
  assert.equal(evidence.finding.classification, "rejected-as-historical-player-size-evidence");
  assert.match(evidence.finding.dimensions, /generic RigidBody schema identity/);
});

test("gap report counts recovered Player and origin contracts", async () => {
  const report = JSON.parse(await readFile(resolve(root, "generated", "gap-report.json"), "utf8"));
  const serverCatalog = JSON.parse(await readFile(resolve(root, "abi", "server-runtime.json"), "utf8"));
  const serverStatus = {};
  for (const entry of serverCatalog.entries) {
    const key = `${entry.availability}/${entry.compatibility}`;
    serverStatus[key] = (serverStatus[key] ?? 0) + 1;
  }
  assert.ok(report.summary.currentContractEntries >= 70);
  assert.ok(report.summary.recoveredContractEntries >= 70);
  assert.ok(report.summary.exactIdMatches >= 20);
  assert.deepEqual(report.summary.catalogStatus.server, serverStatus);
  assert.ok(report.covered.includes("client.global.remoteChannel"));
  assert.ok(report.covered.includes("client.ClientMedia.startRecording"));
  assert.equal(report.evidenceGaps.playerPostureShapes.status, "not-found-in-indexed-local-evidence");
  assert.equal(report.evidenceGaps.playerPostureShapes.representationStatus, "evidence-deferred");
  assert.deepEqual(report.evidenceGaps.playerPostureShapes.unknownWireFields, ["rx", "ry", "rz", "hsx", "hsy", "hsz"]);
  assert.equal(report.evidenceGaps.playerPostureShapes.compatibilityPolicy.onUnknownAuthoritativeShape, "preserve-current-collider");
  assert.equal(report.evidenceGaps.playerPostureShapes.compatibilityPolicy.historicalClaim, false);
  assert.equal(report.evidenceGaps.playerPostureShapes.blockingCurrentPhase, false);
  assert.equal(report.deferredEvidence[0].blocking, false);
  assert.equal(report.evidenceGaps.contactBinding.status, "reference-only");
  assert.equal(report.evidenceGaps.contactBinding.perContactForceProduction, "confirmed-historical-production-local-compatible");
  assert.equal(report.evidenceGaps.contactBinding.aggregateContactForce, "unresolved");
  assert.ok(report.immediatePriorities.every(priority => !priority.includes("Recover the authoritative fx/fy/fz producer")));
  assert.ok(report.immediatePriorities.every(priority => !priority.includes("PUBLIC body delta")));
  const compatibilityTotal = Object.values(report.summary.compatibilityStatus).reduce((sum, count) => sum + count, 0);
  assert.equal(compatibilityTotal, 599);
  assert.equal(report.summary.compatibilityStatus.native, 125);
  assert.ok(report.summary.compatibilityStatus.compatible >= 46);
  assert.ok(report.summary.compatibilityStatus.partial >= 19);
});

test("documentation ABI preserves same-name method property and event variants", async () => {
  const catalog = JSON.parse(await readFile(resolve(root, "generated", "docs-api-index.json"), "utf8"));
  assert.equal(catalog.version, 2);
  assert.equal(catalog.signatureModel, "member-variants-v1");
  const byId = new Map(catalog.entries.map(entry => [entry.id, entry]));
  assert.deepEqual(byId.get("client.UiInput.focus").kinds, ["method", "event"]);
  assert.deepEqual(byId.get("client.UiInput.blur").kinds, ["method", "event"]);
  assert.deepEqual(byId.get("client.Audio.error").kinds, ["property", "event"]);
  assert.equal(byId.get("client.UiInput.focus").kindCollision, true);
  assert.ok(byId.get("client.UiInput.focus").memberVariants.some(variant => variant.kind === "method" && variant.signature.returns === "void"));
  assert.ok(byId.get("client.UiInput.focus").memberVariants.some(variant => variant.kind === "event" && variant.signature.type === "UiEvent\u2039UiInput\u203a"));
  assert.ok(byId.get("client.Audio.error").memberVariants.some(variant => variant.kind === "property" && variant.signature.type === "MediaError| null"));
  assert.ok(byId.get("client.Audio.error").memberVariants.some(variant => variant.kind === "event" && variant.signature.type === "UiEvent\u2039Audio\u203a"));
});

test("local Server Runtime adapter map distinguishes compatible and partial behavior", async () => {
  const analysis = JSON.parse(await readFile(resolve(root, "generated", "local-server-runtime-analysis.json"), "utf8"));
  assert.ok(analysis.entries.length >= 20);
  const currentTick = analysis.entries.find(entry => entry.id === "server.world.currentTick");
  assert.deepEqual(currentTick.implements, ["server.GameWorld.currentTick"]);
  const tickAdapter = analysis.adapters.find(adapter => adapter.localId === "server.world.onTick");
  assert.equal(tickAdapter.status, "partial");
  assert.ok(tickAdapter.gaps.some(gap => gap.includes("skip = tick - prevTick > 1 formula are implemented")));
  assert.ok(tickAdapter.gaps.some(gap => gap.includes("delayed-frame catch-up behavior remains unavailable")));
  const remoteAdapter = analysis.adapters.find(adapter => adapter.localId === "server.remoteChannel.sendClientEvent");
  assert.equal(remoteAdapter.status, "compatible");
  assert.ok(remoteAdapter.gaps.some(gap => gap.includes("RuntimePlayer")));
  assert.equal(analysis.adapters.find(adapter => adapter.localId === "server.remoteChannel.onServerEvent")?.status, "compatible");
  assert.equal(analysis.adapters.find(adapter => adapter.localId === "server.remoteChannel.broadcastClientEvent")?.status, "compatible");
  for (const id of ["server.global.voxels", "server.GameVoxels.getVoxelId", "server.GameVoxels.setVoxelId", "server.GameVoxels.id", "server.GameVoxels.setVoxel", "server.GameVoxels.getVoxel", "server.GameVoxels.name", "server.GameVoxels.getVoxelRotation", "server.GameVoxels.shape", "server.GameVoxels.VoxelTypes"]) {
    assert.equal(analysis.adapters.find(adapter => adapter.localId === id)?.status, "compatible");
    assert.ok(analysis.entries.find(entry => entry.id === id)?.evidence.some(item => item.type === "evidence-map"));
  }
  const implementedEntries = analysis.entries.filter(entry => entry.implements);
  assert.ok(implementedEntries.some(entry => entry.id === "server.world.raycast"));
  assert.ok(implementedEntries.some(entry => entry.id === "server.world.onChat"));
  assert.equal(analysis.adapters.find(adapter => adapter.localId === "server.GameHttpAPI.fetch")?.status, "partial");
  assert.ok(analysis.entries.find(entry => entry.id === "server.GameHttpAPI.fetch")?.evidence.some(item => item.path.endsWith("game-http.mjs")));
  for (const id of [
    "server.GameHttpFetchResponse.ok",
    "server.GameHttpFetchResponse.status",
    "server.GameHttpFetchResponse.statusText",
    "server.GameHttpFetchResponse.headers",
    "server.GameHttpFetchResponse.json",
    "server.GameHttpFetchResponse.text",
    "server.GameHttpFetchResponse.arrayBuffer",
    "server.GameHttpFetchResponse.close",
  ]) assert.equal(analysis.adapters.find(adapter => adapter.localId === id)?.status, "partial", id);
  for (const id of [
    "server.RuntimeVoxelContactEvent.tick",
    "server.RuntimeVoxelContactEvent.entity",
    "server.RuntimeVoxelContactEvent.x",
    "server.RuntimeVoxelContactEvent.y",
    "server.RuntimeVoxelContactEvent.z",
    "server.RuntimeVoxelContactEvent.voxel",
    "server.RuntimeVoxelContactEvent.axis",
    "server.RuntimeVoxelContactEvent.force",
    "server.RuntimeFluidContactEvent.tick",
    "server.RuntimeFluidContactEvent.entity",
    "server.RuntimeFluidContactEvent.voxel",
  ]) assert.equal(analysis.adapters.find(adapter => adapter.localId === id)?.status, "partial", id);
  for (const id of [
    "server.RuntimeRaycastResult.hit",
    "server.RuntimeRaycastResult.hitEntity",
    "server.RuntimeRaycastResult.hitVoxel",
    "server.RuntimeRaycastResult.origin",
    "server.RuntimeRaycastResult.direction",
    "server.RuntimeRaycastResult.distance",
    "server.RuntimeRaycastResult.hitPosition",
    "server.RuntimeRaycastResult.normal",
    "server.RuntimeRaycastResult.voxelIndex",
  ]) assert.equal(analysis.adapters.find(adapter => adapter.localId === id)?.status, "partial", id);
  assert.equal(analysis.adapters.find(adapter => adapter.localId === "server.world.raycast")?.canonicalId, "server.GameWorld.raycast");
  assert.equal(analysis.adapters.find(adapter => adapter.localId === "server.world.onChat")?.canonicalId, "server.GameWorld.onChat");
  const token = analysis.entries.find(entry => entry.id === "server.object.GameEventHandlerToken");
  assert.deepEqual(token.signature.methods, ["cancel(): void", "resume(): void", "active(): boolean"]);
});

test("catalog composition propagates direct local compatibility", async () => {
  const serverCatalog = JSON.parse(await readFile(resolve(root, "abi", "server-runtime.json"), "utf8"));
  const serverEntries = new Map(serverCatalog.entries.map(entry => [entry.id, entry]));
  for (const id of [
    "server.GameGUI.getAttribute",
    "server.GameGUI.init",
    "server.GameGUI.onMessage",
    "server.GameGUI.remove",
    "server.GameGUI.setAttribute",
    "server.GameGUI.show",
    "server.GameGUI.ui",
  ]) {
    assert.equal(serverEntries.get(id)?.compatibility, "compatible", `${id} should preserve local runtime compatibility`);
  }
  for (const [id, compatibility] of [
    ["server.GameDataStorage.get", "partial"],
    ["server.GameEntity.addTag", "compatible"],
    ["server.GameWorld.onTick", "partial"],
    ["server.GameWorld.raycast", "partial"],
  ]) {
    const entry = serverEntries.get(id);
    assert.equal(entry?.compatibility, compatibility, `${id} should inherit local runtime compatibility`);
    assert.ok(entry?.evidence.some(item => item.type === "local-source"), `${id} should retain local implementation evidence`);
  }
  for (const [id, compatibility] of [
    ["server.GameWorld.onTakeDamage", "partial"],
    ["server.GameWorld.onPlayerJoin", "partial"],
    ["server.GameEntity.onTakeDamage", "partial"],
    ["server.remoteChannel.onServerEvent", "compatible"],
  ]) {
    const entry = serverEntries.get(id);
    assert.equal(entry?.compatibility, compatibility, `${id} should inherit adapter compatibility`);
    assert.ok(entry?.evidence.some(item => item.type === "local-source"), `${id} should retain adapter source evidence`);
  }
});
