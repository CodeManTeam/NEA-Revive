import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const current = JSON.parse(await readFile(resolve(root, "abi", "current-runtime.json"), "utf8"));
const protocols = JSON.parse(await readFile(resolve(root, "abi", "protocols.json"), "utf8"));
const serverObjectModel = JSON.parse(await readFile(resolve(root, "abi", "server-object-model.json"), "utf8"));
const runtimeEntityAdapters = JSON.parse(await readFile(resolve(root, "abi", "runtime-entity-adapter-map.json"), "utf8"));
const runtimePlayerAdapters = JSON.parse(await readFile(resolve(root, "abi", "runtime-player-adapter-map.json"), "utf8"));
const contactEventModel = JSON.parse(await readFile(resolve(root, "abi", "contact-event-model.json"), "utf8"));
const scriptRuntimeBoundaries = JSON.parse(await readFile(resolve(root, "abi", "script-runtime-boundaries.json"), "utf8"));
const playerPosture = JSON.parse(await readFile(resolve(root, "abi", "physics-player-posture.json"), "utf8"));
const compatibilityMatrix = JSON.parse(await readFile(resolve(root, "abi", "compatibility-matrix.json"), "utf8"));
const sharedRuntime = JSON.parse(await readFile(resolve(root, "generated", "local-shared-runtime-analysis.json"), "utf8"));
const projectPath = "Frontend/demo-map/project/nea.map.json";
const clientScriptPath = "Frontend/demo-map/project/scripts/client.js";
const serverScriptPath = "Frontend/demo-map/project/scripts/server.js";
const backendPath = "Backend/local-player/backend/box3-server.cjs";
const backendEventsPath = "Frontend/demo-map/src/backend-events.mjs";
const backendEventBridgePath = "Frontend/demo-map/src/backend-event-bridge.mjs";
const demoServerPath = "Frontend/demo-map/src/server.mjs";
const capabilityManifestPath = "Frontend/demo-map/src/capability-manifest.mjs";
const capabilityLaunchGatePath = "Frontend/demo-map/src/capability-launch-gate.mjs";
const capabilityInputDigestPath = "Frontend/demo-map/src/capability-input-digest.mjs";
const capabilityInputNormalizePath = "Frontend/demo-map/src/capability-input-normalize.mjs";
const controlClientPath = "Frontend/demo-map/src/control-client.mjs";
const historicalScriptShellPath = "Evidence/origin/origin/origin/shell/ScriptShell.js";
const projectSource = await readFile(resolve(repositoryRoot, projectPath), "utf8");
const clientSource = await readFile(resolve(repositoryRoot, clientScriptPath), "utf8");
const serverSource = await readFile(resolve(repositoryRoot, serverScriptPath), "utf8");
const backendSource = await readFile(resolve(repositoryRoot, backendPath), "utf8");
const backendEventsSource = await readFile(resolve(repositoryRoot, backendEventsPath), "utf8");
const backendEventBridgeSource = await readFile(resolve(repositoryRoot, backendEventBridgePath), "utf8");
const demoServerSource = await readFile(resolve(repositoryRoot, demoServerPath), "utf8");
const capabilityManifestSource = await readFile(resolve(repositoryRoot, capabilityManifestPath), "utf8");
const capabilityLaunchGateSource = await readFile(resolve(repositoryRoot, capabilityLaunchGatePath), "utf8");
const controlClientSource = await readFile(resolve(repositoryRoot, controlClientPath), "utf8");
const historicalScriptShellSource = await readFile(resolve(repositoryRoot, historicalScriptShellPath), "utf8");
const project = JSON.parse(projectSource);

for (const marker of ["version: 14", "inputs: Object.freeze", "normalizeCapabilityAssets", "normalizeCapabilityEntities", "normalizeCapabilityStorageScope", "normalizeCapabilityProjectIdentity", "normalizeCapabilityWorldConfig", "normalizeCapabilityRuntimeAbi", "collectStaticServerSoundReferences"]) {
  if (!capabilityManifestSource.includes(marker)) throw new Error(`Capability Manifest v14 producer marker is missing: ${marker}`);
}
for (const marker of ["CAPABILITY_MANIFEST_VERSION = 14", "verifyProjectCapabilityModuleInputs", "verifyProjectCapabilityGrants", "verifyProjectCapabilityUiInput", "verifyProjectCapabilityAssetFiles", "verifyProjectCapabilityAssetInput", "verifyProjectCapabilityEntityInput", "verifyProjectCapabilityStorageScopeInput", "verifyProjectCapabilityProjectIdentityInput", "verifyProjectCapabilityWorldConfigInput", "verifyProjectCapabilityRuntimeAbiInput", "summary mismatch for"]) {
  if (!capabilityLaunchGateSource.includes(marker)) throw new Error(`Capability Manifest v14 launch-gate marker is missing: ${marker}`);
}

const entriesBySide = groupBy(current.entries.filter(entry => ["client", "server"].includes(entry.side)), entry => entry.side);
const contracts = [
  scriptContract("dao3-client-runtime/v1", "client", "historical-player-ses", "native", entriesBySide.client ?? []),
  scriptContract("nea-server-runtime/v1", "server", "local-vm-script-runtime", "experimental", entriesBySide.server ?? []),
];
const contractById = new Map(contracts.map(contract => [contract.id, contract]));
const observedUsage = {
  client: analyzeUsage("client", clientSource, clientUsageRules()),
  server: analyzeUsage("server", serverSource, serverUsageRules()),
};
const demoBindings = [
  resolveBinding("client", project.runtime.clientContract, project.scripts.clientCapabilities, observedUsage.client),
  resolveBinding("server", project.runtime.serverContract, project.scripts.serverCapabilities, observedUsage.server),
];

for (const binding of demoBindings) {
  if (!binding.resolved) throw new Error(`${binding.side} Demo runtime binding is unresolved: ${binding.errors.join("; ")}`);
}

const remoteProtocol = protocols.protocols.find(protocol => protocol.id === "player.remote-channel");
const gameNetProtocol = protocols.protocols.find(protocol => protocol.id === "player.game-net");
const guiProtocol = protocols.protocols.find(protocol => protocol.id === "player.gui");
const gameChatProtocol = protocols.protocols.find(protocol => protocol.id === "player.game-chat");
const dialogProtocol = protocols.protocols.find(protocol => protocol.id === "player.dialog");
const entityInteractProtocol = protocols.protocols.find(protocol => protocol.id === "player.entity-interact");
const soundProtocol = protocols.protocols.find(protocol => protocol.id === "player.sound");
if (!remoteProtocol || !gameNetProtocol || !guiProtocol || !gameChatProtocol || !dialogProtocol || !entityInteractProtocol || !soundProtocol) throw new Error("Required Player MuDB protocols were not found");
for (const marker of ["function sendGuiCommandPacket", "function createGuiHandlers", "this.guiSessions = new GuiSessions()", "sendGuiCommand(sessionId, command)"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves GUI transport: ${marker}`);
}
const guiFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.gui", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "GuiSessions / sendGuiCommandPacket / createGuiHandlers", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/backend-gui-transport.test.mjs", symbol: "Player GUI transport conformance", confidence: "direct" },
];
for (const marker of ["var GameChatSessions = class", "this.gameChatSessions = new GameChatSessions()", "sendChatMessage(sessionId, message)", "this.gameChatSessions.broadcastLog(message)", "this.gameChatSessions.sendLog(sessionId, message)"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves outbound chat transport: ${marker}`);
}
const chatFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.game-chat.clientReceives.log", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "GameChatSessions / sendChatMessage", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/backend-chat-transport.test.mjs", symbol: "game-chat outbound packet conformance", confidence: "direct" },
];
for (const marker of ["sendSoundCommandToBackend", "/__nea/control/sound-command"]) {
  if (!controlClientSource.includes(marker)) throw new Error(`Control client no longer proves sound transport: ${marker}`);
}
for (const marker of ["sendSoundCommand: command", "sendSoundCommandToBackend"]) {
  if (!demoServerSource.includes(marker)) throw new Error(`Demo orchestration no longer proves sound transport: ${marker}`);
}
for (const marker of ["sendSoundCommand(command)", "session.sound.message.play(payload)", "/__nea/control/sound-command"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves sound transport: ${marker}`);
}
const soundFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.sound", confidence: "direct" },
  { type: "local-source", path: controlClientPath, symbol: "sendSoundCommandToBackend", confidence: "direct" },
  { type: "local-source", path: demoServerPath, symbol: "ScriptRuntime sound binding", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "ProjectBootstrapSessions.sendSoundCommand / sound control route", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/sound-api-conformance.test.mjs", symbol: "Sound API normalization and controls", confidence: "direct" },
];
for (const marker of ["input(client, data)", "context.gameNetPublicSessions.acceptInput(client.sessionId, data)", "[game-net:input]"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves Player input ingress: ${marker}`);
}
for (const marker of ["const input = line.match", 'type: "input-events"']) {
  if (!backendEventsSource.includes(marker)) throw new Error(`Launcher parser no longer proves Player input ingress: ${marker}`);
}
for (const marker of ['"input-events": handleInputEvents', "options.runtime.dispatchInputEvents(playerId, event.packet)"]) {
  if (!backendEventBridgeSource.includes(marker)) throw new Error(`Backend event bridge no longer proves Player input ingress: ${marker}`);
}
for (const marker of ["ev.buttonState ^ ev.prevButtonState", "new GameClickEvent", "new GameInputEvent"]) {
  if (!historicalScriptShellSource.includes(marker)) throw new Error(`Historical ScriptShell no longer proves input event reconstruction: ${marker}`);
}
const inputEventFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.game-net.serverReceives.input", confidence: "direct" },
  { type: "origin-source", path: historicalScriptShellPath, symbol: "ScriptShell game-net input reconstruction", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "createGameNetHandlers.input / game-net:input", confidence: "direct" },
  { type: "local-source", path: backendEventsPath, symbol: "parseBackendEvent game-net:input", confidence: "direct" },
  { type: "local-source", path: backendEventBridgePath, symbol: "input-events orchestration", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/backend-events.test.mjs", symbol: "game-net input log parser", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "GameInputEvent and GameClickEvent reconstruction", confidence: "direct" },
];
for (const marker of ['name: "entity-interact"', "interact: new import_schema5.MuStruct", "[entity-interact]", "acknowledgeInteract"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves entity interaction ingress: ${marker}`);
}
for (const marker of ["const interact = line.match", 'type: "entity-interact"']) {
  if (!backendEventsSource.includes(marker)) throw new Error(`Launcher parser no longer proves entity interaction ingress: ${marker}`);
}
for (const marker of ['"entity-interact": handleEntityInteract', "options.runtime.dispatchInteract(playerId, event.entityId, event.tick)"]) {
  if (!backendEventBridgeSource.includes(marker)) throw new Error(`Backend event bridge no longer proves entity interaction ingress: ${marker}`);
}
for (const marker of ["event.interactEvents.forEach", "new GameInteractEvent", "this._dispatch(targetEntity.onInteract", "this._dispatch(this.world.onInteract"]) {
  if (!historicalScriptShellSource.includes(marker)) throw new Error(`Historical ScriptShell no longer proves interaction event construction: ${marker}`);
}
const interactEventFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.entity-interact.serverReceives.interact / clientReceives.acknowledgeInteract", confidence: "direct" },
  { type: "player-bundle", path: "Backend/local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js", symbol: "InteractProtocol target selection and {id,tick} send", confidence: "direct" },
  { type: "origin-source", path: historicalScriptShellPath, symbol: "ScriptShell interactEvents target-before-world dispatch", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "createEntityInteractHandlers / entity-interact structured ingress", confidence: "direct" },
  { type: "local-source", path: backendEventsPath, symbol: "parseBackendEvent entity-interact", confidence: "direct" },
  { type: "local-source", path: backendEventBridgePath, symbol: "entity-interact orchestration", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/backend-events.test.mjs", symbol: "entity-interact log parser", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "GameInteractEvent mapped-target dispatch", confidence: "direct" },
];
for (const marker of ["queueDamageStateToBackend", "/__nea/control/damage-state", "events: options.events"]) {
  if (!controlClientSource.includes(marker)) throw new Error(`Control client no longer proves damage projection: ${marker}`);
}
for (const marker of ["writeDamageState: async", "queueDamageStateToBackend", "target.entityId"]) {
  if (!demoServerSource.includes(marker)) throw new Error(`Demo orchestration no longer proves damage projection: ${marker}`);
}
for (const marker of ["/__nea/control/damage-state", "queueDamageRuntimeState", "updateDamage(entityId, state, events", "client?.message.scriptEvents"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves damage projection: ${marker}`);
}
const damageProjectionEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.game-net.PUBLIC.damage / scriptEvents.damage", confidence: "direct" },
  { type: "local-source", path: controlClientPath, symbol: "queueDamageStateToBackend", confidence: "direct" },
  { type: "local-source", path: demoServerPath, symbol: "ScriptRuntime writeDamageState binding", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "damage-state control route / GameNetPublicSessions.updateDamage", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/backend-damage-transport.test.mjs", symbol: "damage state and script event aggregation", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "hurt death healing and respawn projection", confidence: "direct" },
];
for (const marker of ["createEntityOnBackend", "queueEntityStateToBackend", "destroyEntityOnBackend", "validatedMeshNames: capabilityManifest.resources"]) {
  if (!demoServerSource.includes(marker)) throw new Error(`Demo orchestration no longer proves runtime entity projection: ${marker}`);
}
for (const marker of ["/__nea/control/entity-create", "/__nea/control/entity-state", "/__nea/control/entity-destroy"]) {
  if (!controlClientSource.includes(marker)) throw new Error(`Control client no longer proves runtime entity projection: ${marker}`);
}
for (const marker of ["createRuntimeEntity(entity)", "resolveRuntimeMesh(entity.mesh)", "queueRuntimeEntityState(entityId, state)", "destroyRuntimeEntity(entityId)"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves runtime entity projection: ${marker}`);
}
const runtimeEntityProjectionEvidence = [
  { type: "local-source", path: demoServerPath, symbol: "validated mesh whitelist / ScriptRuntime entity projection bindings", confidence: "direct" },
  { type: "local-source", path: controlClientPath, symbol: "entity create/state/destroy control calls", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "resolveRuntimeMesh / createRuntimeEntity / queueRuntimeEntityState / destroyRuntimeEntity", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "validated and unknown mesh runtime entity projection", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/backend-rebuild-persistence.test.mjs", symbol: "runtime entity projection persistence markers", confidence: "direct" },
];
for (const marker of ["openDialogOnBackend", "cancelDialogsOnBackend", "/__nea/control/dialog", "/__nea/control/dialog-cancel-all"]) {
  if (!controlClientSource.includes(marker)) throw new Error(`Control client no longer proves dialog transport: ${marker}`);
}
for (const marker of ["showDialog: async", "cancelDialogs: playerId", "openDialogWithRetry", "cancelDialogsOnBackend"]) {
  if (!demoServerSource.includes(marker)) throw new Error(`Demo orchestration no longer proves dialog transport: ${marker}`);
}
for (const marker of ["var DialogSessions = class", "this.dialogSessions = new DialogSessions()", "openDialog(sessionId, config)", "cancelDialogs(sessionId)", "/__nea/control/dialog-cancel-all"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves dialog transport: ${marker}`);
}
const dialogFlowEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.dialog", confidence: "direct" },
  { type: "local-source", path: controlClientPath, symbol: "openDialogOnBackend / cancelDialogsOnBackend", confidence: "direct" },
  { type: "local-source", path: demoServerPath, symbol: "ScriptRuntime dialog bindings", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "DialogSessions / dialog control routes", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/backend-dialog-transport.test.mjs", symbol: "Player dialog RPC conformance", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/control-client.test.mjs", symbol: "dialog control bridge conformance", confidence: "direct" },
];
for (const marker of ["function sessionBridgeLabel", "function matchesSessionLabel", "[session] join ${sessionBridgeLabel", "[session] disconnected ${sessionBridgeLabel"]) {
  if (!backendSource.includes(marker)) throw new Error(`Local backend no longer proves Player session lifecycle identity: ${marker}`);
}
for (const marker of ["requireSessionBridgeLabel", 'type: "player-join"', 'type: "player-leave"']) {
  if (!backendEventsSource.includes(marker)) throw new Error(`Launcher parser no longer proves Player session lifecycle: ${marker}`);
}
for (const marker of ['"player-join": handlePlayerJoin', "options.runtime.addPlayer", '"player-leave": handlePlayerLeave', "options.runtime.removePlayer"]) {
  if (!backendEventBridgeSource.includes(marker)) throw new Error(`Backend event bridge no longer proves Player session lifecycle: ${marker}`);
}
const playerSessionLifecycleEvidence = [
  { type: "protocol-schema", path: "Middleware/runtime-compat/abi/protocols.json", symbol: "player.game-net.serverReceives.join", confidence: "direct" },
  { type: "local-source", path: backendPath, symbol: "game-net join / MuDB disconnect / SHA-256 session bridge label", confidence: "direct" },
  { type: "local-source", path: backendEventsPath, symbol: "stable Player join/leave parser", confidence: "direct" },
  { type: "local-source", path: backendEventBridgePath, symbol: "RuntimePlayer add/remove orchestration", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/backend-events.test.mjs", symbol: "stable Player lifecycle event parser", confidence: "direct" },
  { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "RuntimePlayer join/leave event dispatch", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/player-lifecycle-project-refinement-conformance.test.mjs", symbol: "project lifecycle subscription refinement without global ABI promotion", confidence: "direct" },
  { type: "test", path: "Middleware/runtime-compat/test/player-disconnect-destroy-order-conformance.test.mjs", symbol: "disconnect destroy order and shared GameEntityEvent payload", confidence: "direct" },
];

const architecture = {
  format: "nea-runtime-architecture-contract",
  version: 1,
  generatedAt: new Date().toISOString(),
  apiVersion: project.runtime.apiVersion,
  compatibilityLevel: project.runtime.compatibilityLevel,
  layers: [
    layer("project-package", "data", "Loads exported world data, assets, scripts, requested contracts and capabilities without granting implementation access directly.", ["dao3-project/v1"], [projectPath, "Frontend/demo-map/src/import-project.mjs"]),
    layer("client-script-runtime", "execution", "Runs clientIndex.js in the archived Player SES Compartment with client-only globals.", ["dao3-client-runtime/v1"], ["Middleware/runtime-compat/generated/player-client-script-runtime-analysis.json"]),
    layer("server-script-runtime", "execution", "Runs the authoritative map script in an isolated VM and gates every implemented mutation or event API by server capability.", ["nea-server-runtime/v1"], ["Frontend/demo-map/src/runtime/script-runtime.mjs", "Middleware/runtime-compat/generated/local-server-runtime-analysis.json", "Middleware/runtime-compat/abi/server-object-model.json", "Middleware/runtime-compat/abi/runtime-entity-adapter-map.json", "Middleware/runtime-compat/abi/runtime-player-adapter-map.json"]),
    layer("mudb-transport", "transport", "Serializes recovered protocol envelopes and preserves message direction without interpreting map payloads.", ["mudb-transport/v1", "nea-protocol-abi/v1"], ["Middleware/runtime-compat/abi/protocols.json"]),
    layer("authoritative-game-runtime", "state", "Owns ticks, players, rigid bodies and accepted state transitions used to produce PUBLIC network state.", ["nea-authoritative-runtime/v1"], ["Backend/local-player/backend/box3-server.cjs", "Middleware/runtime-compat/generated/player-network-body-analysis.json"]),
  ],
  contracts,
  compatibilityMatrix: {
    path: "Middleware/runtime-compat/abi/compatibility-matrix.json",
    declarations: compatibilityMatrix.summary.entries,
    executable: compatibilityMatrix.summary.executable,
    byStatus: compatibilityMatrix.summary.byStatus,
  },
  scriptRuntimes: {
    boundaries: "Middleware/runtime-compat/abi/script-runtime-boundaries.json",
    invariant: scriptRuntimeBoundaries.invariant,
    runtimes: scriptRuntimeBoundaries.runtimes.map(runtime => ({
      id: runtime.id,
      side: runtime.side,
      engine: runtime.engine,
      provider: runtime.provider,
    })),
  },
  objectModels: {
    server: {
      canonical: "Middleware/runtime-compat/abi/server-object-model.json",
      playerRepresentation: serverObjectModel.playerComposition.representation,
      classicalPlayerInheritance: serverObjectModel.playerComposition.classicalInheritance,
      localAdapters: [
        { object: runtimeEntityAdapters.localObject.id, map: "Middleware/runtime-compat/abi/runtime-entity-adapter-map.json", status: runtimeEntityAdapters.localObject.status },
        { object: runtimePlayerAdapters.localObject.id, map: "Middleware/runtime-compat/abi/runtime-player-adapter-map.json", status: runtimePlayerAdapters.localObject.status },
      ],
    },
  },
  sharedValues: {
    catalog: "Middleware/runtime-compat/abi/shared-runtime.json",
    provider: "local-shared-compatibility-runtime",
    capability: "shared.math",
    capabilities: ["shared.events", "shared.math"],
    executableEntries: sharedRuntime.entries.length,
    confirmedGameVector3Entries: sharedRuntime.summary.gameVector3.confirmed,
    partialGameVector3Entries: sharedRuntime.summary.gameVector3.partial,
    confirmedGameBounds3Entries: sharedRuntime.summary.gameBounds3.confirmed,
    partialGameBounds3Entries: sharedRuntime.summary.gameBounds3.partial,
    confirmedGameQuaternionEntries: sharedRuntime.summary.gameQuaternion.confirmed,
    partialGameQuaternionEntries: sharedRuntime.summary.gameQuaternion.partial,
    confirmedGameRGBColorEntries: sharedRuntime.summary.gameRGBColor.confirmed,
    partialGameRGBColorEntries: sharedRuntime.summary.gameRGBColor.partial,
    confirmedGameRGBAColorEntries: sharedRuntime.summary.gameRGBAColor.confirmed,
    partialGameRGBAColorEntries: sharedRuntime.summary.gameRGBAColor.partial,
    confirmedGameEventHandlerTokenEntries: sharedRuntime.summary.gameEventHandlerToken.confirmed,
    partialGameEventHandlerTokenEntries: sharedRuntime.summary.gameEventHandlerToken.partial,
  },
  contactEvents: {
    model: "Middleware/runtime-compat/abi/contact-event-model.json",
    canonicalEvents: contactEventModel.canonicalEvents.map(event => ({ id: event.id, localStatus: event.localStatus })),
    forceStatus: contactEventModel.force.status,
    packedVoxelAxisStatus: contactEventModel.axis.status,
    authoritativeStateStatus: contactEventModel.authoritativeState.status,
    conformance: contactEventModel.authoritativeState.conformance,
  },
  projectCapabilityManifest: {
    format: "nea-project-capability-manifest",
    version: 14,
    producer: capabilityManifestPath,
    launchGate: capabilityLaunchGatePath,
    states: ["ready", "partial", "blocked", "script-owned"],
    evidenceCollections: ["requirements", "modules", "resources", "ui", "entities", "dependencies", "diagnostics"],
    inputBindings: ["api-version", "client-contract", "server-contract", "server-modules", "client-modules", "server-capability-grants", "client-capability-grants", "client-ui-state", "asset-file-evidence", "entity-projection-evidence", "storage-group-scope", "project-identity", "world-config", "runtime-abi-artifacts"],
    integrityChecks: ["closed-state-vocabulary", "derived-summary-counts", "derived-launch-status", "declared-derived-status-match", "exact-module-set", "exact-grant-set", "canonical-json-digests", "asset-file-bytes-sha256", "storage-scope-semantic-digest", "project-identity-semantic-digest", "world-config-semantic-digest", "runtime-abi-semantic-digest"],
    projectRefinements: [{ id: "player-lifecycle-event-payload", apis: ["world.onPlayerJoin", "world.nextPlayerJoin", "world.onPlayerLeave", "world.nextPlayerLeave"], globalCompatibility: "partial", projectState: "ready", condition: "GameEntityEvent {tick,entity} payload is exact and every accessed GamePlayerEntity member is independently gated" }],
    launchBefore: ["client-script-publication", "client-ui-publication", "block-catalog-load", "server-script-runtime-construction", "backend-spawn", "player-navigation"],
    evidence: [capabilityManifestPath, capabilityLaunchGatePath, capabilityInputDigestPath, capabilityInputNormalizePath, "Frontend/demo-map/src/lifecycle-event-refinement.mjs", "Middleware/runtime-compat/conformance/player-lifecycle-project-refinement.mjs", demoServerPath],
  },
  transport: {
    id: "mudb-transport/v1",
    protocolAbi: "nea-protocol-abi/v1",
    requiredProtocols: [gameNetProtocol.id, remoteProtocol.id, guiProtocol.id, gameChatProtocol.id, dialogProtocol.id, entityInteractProtocol.id, soundProtocol.id],
    remoteChannelEnvelope: { fields: ["tick", "args"], argsEncoding: "JSON-text" },
  },
  authoritativeRuntime: {
    id: "nea-authoritative-runtime/v1",
    bodyProfileRequired: true,
    bodyProfileSizeStatus: "confirmed",
    publicStateUsesExplicitHalfExtents: true,
    postureAbi: "Middleware/runtime-compat/abi/physics-player-posture.json",
    postureShapeStatus: {
      standing: playerPosture.standing.status,
      crouching: playerPosture.crouching.authoritativeShape.status,
      flying: playerPosture.flying.authoritativeShape.status,
    },
    postureShapeCompatibilityPolicy: playerPosture.compatibilityPolicy,
  },
  flows: [
    flow("client-module-delivery", "authoritative-game-runtime", "client-script-runtime", "player.game-net.syncClientScriptModules", "Dictionary of module source; entry clientIndex.js"),
    flow("client-event", "client-script-runtime", "server-script-runtime", "player.remote-channel.sendServerEvent", "MuDB {tick,args}; args is JSON text"),
    flow("server-event", "server-script-runtime", "client-script-runtime", "player.remote-channel.sendClientEvent", "MuDB {tick,args}; malformed JSON is dropped by Player"),
    flow("gui-command", "server-script-runtime", "client-script-runtime", "player.gui", "Handle-based GUI init/show/remove/get/set commands with return, throw and sendMessage responses", guiFlowEvidence),
    flow("chat-delivery", "server-script-runtime", "client-script-runtime", "player.game-chat.log", "Recovered outbound text packet for world broadcast, mapped entity speech and player-targeted private delivery; browser-to-server chat ingress is excluded", chatFlowEvidence),
    flow("sound-playback", "server-script-runtime", "player-browser-client", "player.sound", "Dictionary-backed global, positioned, entity-targeted and player-targeted playback plus resume, seek, pause and stop controls; browser media results are not acknowledged", soundFlowEvidence),
    flow("input-event-ingress", "player-browser-client", "server-script-runtime", "player.game-net.input", "Accepted Player input packets reconstruct click, press and release events with the recovered PlayerFlags mask; non-player click targets require authoritative entity bindings", inputEventFlowEvidence),
    flow("entity-interact-ingress", "player-browser-client", "server-script-runtime", "player.entity-interact", "Real Player interaction messages preserve the recovered {tick, entity, targetEntity} event and target-before-world dispatch when the target has an authoritative local binding; replica.interactive projection remains unavailable", interactEventFlowEvidence),
    flow("damage-state-projection", "server-script-runtime", "authoritative-game-runtime", "player.game-net.PUBLIC.damage", "Authenticated local control updates authoritative hp/maxHp/showHealthBar state and aggregates recovered hurt, die and respawn scriptEvents for Player sessions", damageProjectionEvidence),
    flow("runtime-entity-projection", "server-script-runtime", "authoritative-game-runtime", "nea-control.runtime-entity", "Validated captured mesh entities use authenticated create/state/destroy control operations before authoritative PUBLIC projection; unknown mesh names remain script-local", runtimeEntityProjectionEvidence),
    flow("dialog-rpc", "server-script-runtime", "player-browser-client", "player.dialog", "Recovered open RPC with typed close/text/input/select result plus per-session cancel-all delivery through the authenticated local control bridge", dialogFlowEvidence),
    flow("player-session-lifecycle", "player-browser-client", "server-script-runtime", "player.game-net.session", "Accepted game-net join and MuDB disconnect events use a stable non-reversible SHA-256 bridge label to create and remove RuntimePlayer wrappers; disconnect dispatches world.onPlayerLeave, player.onDestroy, then world.onEntityDestroy with one GameEntityEvent", playerSessionLifecycleEvidence),
    flow("authoritative-state", "server-script-runtime", "authoritative-game-runtime", "nea-control.player-state", "Versioned position and velocity command"),
    flow("public-state", "authoritative-game-runtime", "client-script-runtime", "player.game-net.PUBLIC", "Player and RigidBody snapshots with explicit half extents"),
  ],
  demo: {
    project: sourceDescriptor(projectPath, projectSource),
    scripts: {
      client: sourceDescriptor(clientScriptPath, clientSource),
      server: sourceDescriptor(serverScriptPath, serverSource),
    },
    bindings: demoBindings,
  },
};

await writeFile(resolve(root, "abi", "runtime-contracts.json"), `${JSON.stringify(architecture, null, 2)}\n`);
console.log(`Built runtime architecture contract with ${architecture.layers.length} layers and ${contracts.length} script contracts.`);

function scriptContract(id, side, provider, compatibilityLevel, entries) {
  const capabilityEntries = groupBy(entries.filter(entry => entry.capability), entry => entry.capability);
  const capabilities = Object.entries(capabilityEntries).map(([capabilityId, values]) => {
    if (!capabilityId.startsWith(`${side}.`)) throw new Error(`${side} capability is not side-qualified: ${capabilityId}`);
    return {
      id: capabilityId,
      availability: weakestAvailability(values),
      compatibility: weakestCompatibility(values),
      entries: values.map(entry => entry.id).sort(),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  return {
    id,
    side,
    apiVersion: "0.1.0",
    provider,
    compatibilityLevel,
    capabilities,
    uncategorizedEntries: entries.filter(entry => !entry.capability).map(entry => entry.id).sort(),
  };
}

function resolveBinding(side, contractId, requestedCapabilities, usage) {
  const contract = contractById.get(contractId);
  const available = new Map((contract?.capabilities ?? []).map(capability => [capability.id, capability]));
  const errors = [];
  if (!contract) errors.push(`unknown contract ${contractId}`);
  for (const capability of requestedCapabilities) {
    if (!capability.startsWith(`${side}.`)) errors.push(`cross-side or unqualified capability ${capability}`);
    if (!available.has(capability)) errors.push(`capability is not implemented by ${contractId}: ${capability}`);
  }
  const missingDeclarations = usage.requiredCapabilities.filter(capability => !requestedCapabilities.includes(capability));
  for (const capability of missingDeclarations) errors.push(`script uses undeclared capability ${capability}`);
  return {
    side,
    contract: contractId,
    requestedCapabilities,
    observedUsage: usage,
    resolvedEntries: requestedCapabilities.flatMap(capability => available.get(capability)?.entries ?? []).sort(),
    errors,
    resolved: errors.length === 0,
  };
}

function analyzeUsage(side, source, rules) {
  const matches = rules.filter(rule => rule.pattern.test(source)).map(rule => ({ capability: rule.capability, evidence: rule.evidence }));
  return {
    side,
    requiredCapabilities: [...new Set(matches.map(match => match.capability))].sort(),
    evidence: matches,
  };
}

function clientUsageRules() {
  return [
    { capability: "client.core", pattern: /\bconsole\./, evidence: "console.*" },
    { capability: "client.ui", pattern: /\b(?:ui|Ui[A-Z]\w*|Vec[23])\b/, evidence: "ui / Ui* / Vec*" },
    { capability: "client.remote-channel", pattern: /\bremoteChannel\./, evidence: "remoteChannel.*" },
  ];
}

function serverUsageRules() {
  return [
    { capability: "server.world.events", pattern: /\bworld\.(?:on|next|currentTick)/, evidence: "world event/tick access" },
    { capability: "server.world.chat", pattern: /\bworld\.say\b|\.sendMessage\s*\(/, evidence: "world.say/player.sendMessage" },
    { capability: "server.world.entities", pattern: /\bworld\.(?:querySelector|querySelectorAll|createEntity)\b/, evidence: "world entity query/create" },
    { capability: "server.world.voxels", pattern: /\bvoxels\.|\bworld\.size\b/, evidence: "voxels.* / world.size" },
    { capability: "server.world.config", pattern: /\bworld\.(?:gravity|airFriction|fogColor)\b/, evidence: "world configuration" },
    { capability: "server.gui", pattern: /\bgui\.(?:init|show|remove|getAttribute|setAttribute|onMessage|ui)\b/, evidence: "declared GameGUI member" },
    { capability: "server.storage", pattern: /\bstorage\.(?:getDataStorage|getGroupStorage)\b/, evidence: "GameStorage access" },
    { capability: "server.player", pattern: /\bplayer\.(?:id|name|position|velocity|grounded|health|snapshot)\b/, evidence: "RuntimePlayer read" },
    { capability: "server.player.write", pattern: /\bplayer\.(?:name|position|velocity)\s*=|\bplayer\.(?:applyImpulse|damage)\s*\(/, evidence: "RuntimePlayer mutation" },
    { capability: "server.remote-channel", pattern: /\bremoteChannel\./, evidence: "remoteChannel.*" },
  ];
}

function layer(id, category, responsibility, contracts, evidence) {
  return { id, category, responsibility, contracts, evidence };
}

function flow(id, from, to, protocol, payload, evidence = []) {
  return { id, from, to, protocol, payload, evidence };
}

function sourceDescriptor(path, source) {
  return { path, bytes: Buffer.byteLength(source), sha256: createHash("sha256").update(source).digest("hex") };
}

function groupBy(values, selectKey) {
  return values.reduce((groups, value) => {
    const key = selectKey(value);
    (groups[key] ??= []).push(value);
    return groups;
  }, {});
}

function weakestAvailability(entries) {
  const rank = { unsupported: 0, unknown: 1, declared: 2, partial: 3, confirmed: 4 };
  return entries.reduce((weakest, entry) => rank[entry.availability] < rank[weakest] ? entry.availability : weakest, "confirmed");
}

function weakestCompatibility(entries) {
  const rank = { missing: 0, emulated: 1, bridged: 2, native: 3 };
  return entries.reduce((weakest, entry) => rank[entry.compatibility] < rank[weakest] ? entry.compatibility : weakest, "native");
}
