import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("runtime architecture preserves five explicit layers", async () => {
  const architecture = await readJson("abi/runtime-contracts.json");
  assert.deepEqual(architecture.layers.map(layer => layer.id), [
    "project-package",
    "client-script-runtime",
    "server-script-runtime",
    "mudb-transport",
    "authoritative-game-runtime",
  ]);
  assert.equal(architecture.transport.remoteChannelEnvelope.argsEncoding, "JSON-text");
  assert.equal(architecture.authoritativeRuntime.bodyProfileRequired, true);
  assert.equal(architecture.authoritativeRuntime.bodyProfileSizeStatus, "confirmed");
  assert.deepEqual(architecture.authoritativeRuntime.postureShapeStatus, {
    standing: "confirmed",
    crouching: "evidence-deferred",
    flying: "evidence-deferred",
  });
  assert.deepEqual(architecture.authoritativeRuntime.postureShapeCompatibilityPolicy, {
    onUnknownAuthoritativeShape: "preserve-current-collider",
    requireCompleteAuthoritativeShape: true,
    historicalClaim: false,
  });
  assert.equal(architecture.objectModels.server.playerRepresentation, "intersection-and-component");
  assert.equal(architecture.objectModels.server.classicalPlayerInheritance, false);
  assert.deepEqual(architecture.objectModels.server.localAdapters.map(adapter => adapter.object), [
    "server.object.RuntimeEntity",
    "server.object.RuntimePlayer",
  ]);
  assert.equal(architecture.sharedValues.catalog, "runtime-compat/abi/shared-runtime.json");
  assert.equal(architecture.sharedValues.capability, "shared.math");
  assert.deepEqual(architecture.sharedValues.capabilities, ["shared.events", "shared.math"]);
  assert.equal(architecture.sharedValues.confirmedGameVector3Entries, 30);
  assert.equal(architecture.sharedValues.partialGameVector3Entries, 1);
  assert.equal(architecture.sharedValues.confirmedGameBounds3Entries, 11);
  assert.equal(architecture.sharedValues.partialGameBounds3Entries, 0);
  assert.equal(architecture.sharedValues.confirmedGameQuaternionEntries, 23);
  assert.equal(architecture.sharedValues.partialGameQuaternionEntries, 5);
  assert.equal(architecture.sharedValues.confirmedGameRGBColorEntries, 19);
  assert.equal(architecture.sharedValues.partialGameRGBColorEntries, 1);
  assert.equal(architecture.sharedValues.confirmedGameRGBAColorEntries, 19);
  assert.equal(architecture.sharedValues.partialGameRGBAColorEntries, 1);
  assert.equal(architecture.sharedValues.confirmedGameEventHandlerTokenEntries, 3);
  assert.equal(architecture.sharedValues.partialGameEventHandlerTokenEntries, 0);
});

test("current ABI is composed from executable client server and shared analyses", async () => {
  const current = await readJson("abi/current-runtime.json");
  const client = await readJson("generated/player-client-script-runtime-analysis.json");
  const server = await readJson("generated/local-server-runtime-analysis.json");
  const shared = await readJson("generated/local-shared-runtime-analysis.json");
  const ids = new Set(current.entries.map(entry => entry.id));
  for (const entry of [...client.entries, ...server.entries, ...shared.entries]) assert.ok(ids.has(entry.id), `${entry.id} missing from current ABI`);
  assert.ok(ids.has("server.RuntimePlayer.position"));
  assert.ok(ids.has("server.RuntimePlayer.applyImpulse"));
  assert.ok(current.entries.filter(entry => entry.capability).every(entry => entry.capability.startsWith(`${entry.side}.`)));
});

test("Demo client and server scripts resolve only side-qualified capabilities", async () => {
  const architecture = await readJson("abi/runtime-contracts.json");
  for (const binding of architecture.demo.bindings) {
    assert.equal(binding.resolved, true, `${binding.side}: ${binding.errors.join("; ")}`);
    assert.deepEqual(binding.errors, []);
    assert.ok(binding.requestedCapabilities.every(capability => capability.startsWith(`${binding.side}.`)));
    for (const required of binding.observedUsage.requiredCapabilities) {
      assert.ok(binding.requestedCapabilities.includes(required), `${binding.side} script did not declare ${required}`);
    }
    assert.ok(binding.resolvedEntries.length > 0);
  }
});

test("transport and authoritative flows remain separate from script contracts", async () => {
  const architecture = await readJson("abi/runtime-contracts.json");
  assert.deepEqual(architecture.contracts.map(contract => contract.side).sort(), ["client", "server"]);
  assert.ok(architecture.transport.requiredProtocols.includes("player.game-net"));
  assert.ok(architecture.transport.requiredProtocols.includes("player.remote-channel"));
  assert.ok(architecture.transport.requiredProtocols.includes("player.gui"));
  assert.ok(architecture.transport.requiredProtocols.includes("player.game-chat"));
  assert.ok(architecture.transport.requiredProtocols.includes("player.dialog"));
  assert.ok(architecture.transport.requiredProtocols.includes("player.entity-interact"));
  const gui = architecture.flows.find(flow => flow.id === "gui-command");
  assert.equal(gui.from, "server-script-runtime");
  assert.equal(gui.to, "client-script-runtime");
  assert.equal(gui.protocol, "player.gui");
  const chat = architecture.flows.find(flow => flow.id === "chat-delivery");
  assert.equal(chat.from, "server-script-runtime");
  assert.equal(chat.to, "client-script-runtime");
  assert.equal(chat.protocol, "player.game-chat.log");
  assert.ok(chat.evidence.some(item => item.path === "runtime-compat/test/backend-chat-transport.test.mjs"));
  const inputEvents = architecture.flows.find(flow => flow.id === "input-event-ingress");
  assert.equal(inputEvents.from, "player-browser-client");
  assert.equal(inputEvents.to, "server-script-runtime");
  assert.equal(inputEvents.protocol, "player.game-net.input");
  assert.ok(inputEvents.evidence.some(item => item.path === "origin/origin/origin/shell/ScriptShell.js"));
  assert.ok(inputEvents.evidence.some(item => item.path === "demo-map/test/runtime.test.mjs"));
  const interact = architecture.flows.find(flow => flow.id === "entity-interact-ingress");
  assert.equal(interact.from, "player-browser-client");
  assert.equal(interact.to, "server-script-runtime");
  assert.equal(interact.protocol, "player.entity-interact");
  assert.ok(interact.evidence.some(item => item.path === "origin/origin/origin/shell/ScriptShell.js"));
  assert.ok(interact.evidence.some(item => item.path === "demo-map/test/runtime.test.mjs"));
  const damage = architecture.flows.find(flow => flow.id === "damage-state-projection");
  assert.equal(damage.from, "server-script-runtime");
  assert.equal(damage.to, "authoritative-game-runtime");
  assert.equal(damage.protocol, "player.game-net.PUBLIC.damage");
  assert.ok(damage.evidence.some(item => item.path === "runtime-compat/test/backend-damage-transport.test.mjs"));
  const runtimeEntity = architecture.flows.find(flow => flow.id === "runtime-entity-projection");
  assert.equal(runtimeEntity.from, "server-script-runtime");
  assert.equal(runtimeEntity.to, "authoritative-game-runtime");
  assert.equal(runtimeEntity.protocol, "nea-control.runtime-entity");
  assert.ok(runtimeEntity.evidence.some(item => item.path === "demo-map/test/runtime.test.mjs"));
  const dialog = architecture.flows.find(flow => flow.id === "dialog-rpc");
  assert.equal(dialog.from, "server-script-runtime");
  assert.equal(dialog.to, "player-browser-client");
  assert.equal(dialog.protocol, "player.dialog");
  assert.ok(dialog.evidence.some(item => item.path === "runtime-compat/test/backend-dialog-transport.test.mjs"));
  const playerLifecycle = architecture.flows.find(flow => flow.id === "player-session-lifecycle");
  assert.equal(playerLifecycle.from, "player-browser-client");
  assert.equal(playerLifecycle.to, "server-script-runtime");
  assert.equal(playerLifecycle.protocol, "player.game-net.session");
  assert.ok(playerLifecycle.evidence.some(item => item.path === "demo-map/test/backend-events.test.mjs"));
  assert.ok(playerLifecycle.evidence.some(item => item.path === "runtime-compat/test/player-disconnect-destroy-order-conformance.test.mjs"));
  assert.match(playerLifecycle.payload, /world\.onPlayerLeave, player\.onDestroy, then world\.onEntityDestroy/);
  const publicState = architecture.flows.find(flow => flow.id === "public-state");
  assert.equal(publicState.from, "authoritative-game-runtime");
  assert.equal(publicState.to, "client-script-runtime");
});

test("authoritative contact state remains separate from script event payloads", async () => {
  const architecture = await readJson("abi/runtime-contracts.json");
  assert.equal(architecture.contactEvents.authoritativeStateStatus, "confirmed-schema-partial-binding");
  assert.equal(architecture.contactEvents.packedVoxelAxisStatus, "confirmed");
  assert.equal(architecture.contactEvents.conformance.status, "covered");
  assert.ok(architecture.contactEvents.conformance.excludedMappings.includes("GameEntity.contactForce aggregation"));
});

test("client documentation keeps concrete UI and audio owners", async () => {
  const docs = await readJson("generated/docs-api-index.json");
  const ids = new Set(docs.entries.map(entry => entry.id));
  for (const id of [
    "client.UiNode.name",
    "client.UiRenderable.position",
    "client.UiScreen.getAllScreen",
    "client.EventEmitter.on",
    "client.Audio.play",
    "client.MediaError.code",
  ]) assert.ok(ids.has(id), `${id} missing from canonical documentation index`);
  assert.equal(docs.entries.some(entry => entry.id.startsWith("client.ClientUI.")), false);
  assert.equal(docs.entries.some(entry => entry.id.startsWith("client.ClientAudio.")), false);
  assert.equal(docs.entries.some(entry => entry.id.startsWith("client.mediaError.")), false);
});

test("runtime architecture records the Capability Manifest v14 launch gate", async () => {
  const architecture = await readJson("abi/runtime-contracts.json");
  const gate = architecture.projectCapabilityManifest;
  assert.equal(gate.format, "nea-project-capability-manifest");
  assert.equal(gate.version, 14);
  for (const binding of ["server-modules", "client-modules", "server-capability-grants", "client-capability-grants", "client-ui-state", "asset-file-evidence", "entity-projection-evidence", "storage-group-scope", "project-identity", "world-config", "runtime-abi-artifacts"]) assert.ok(gate.inputBindings.includes(binding), binding);
  assert.ok(gate.integrityChecks.includes("asset-file-bytes-sha256"));
  assert.ok(gate.integrityChecks.includes("storage-scope-semantic-digest"));
  assert.ok(gate.integrityChecks.includes("project-identity-semantic-digest"));
  assert.ok(gate.integrityChecks.includes("runtime-abi-semantic-digest"));
  const lifecycleRefinement = gate.projectRefinements.find(item => item.id === "player-lifecycle-event-payload");
  assert.equal(lifecycleRefinement.globalCompatibility, "partial");
  assert.equal(lifecycleRefinement.projectState, "ready");
  assert.match(lifecycleRefinement.condition, /independently gated/);
  for (const stage of ["client-script-publication", "client-ui-publication", "server-script-runtime-construction", "backend-spawn", "player-navigation"]) assert.ok(gate.launchBefore.includes(stage), stage);
});

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
