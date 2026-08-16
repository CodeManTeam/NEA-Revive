import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { formatImportSummary, importMapProject, publishClientScript, publishClientUiState } from "./import-project.mjs";
import { assertProjectCapabilities, evaluateProjectCapabilityManifest, verifyProjectCapabilityAssetFiles, verifyProjectCapabilityAssetInput, verifyProjectCapabilityEntityInput, verifyProjectCapabilityGrants, verifyProjectCapabilityModuleInputs, verifyProjectCapabilityPlayerBodyInput, verifyProjectCapabilityProjectIdentityInput, verifyProjectCapabilityRuntimeAbiInput, verifyProjectCapabilityStorageScopeInput, verifyProjectCapabilityUiInput, verifyProjectCapabilityWorldConfigInput, verifyProjectCapabilityWorldSpawnInput } from "./capability-launch-gate.mjs";
import { normalizeWorldSpawnWithinShape } from "./world-spawn.mjs";
import { loadRepositoryRuntimeCompatibility } from "./project-capability.mjs";
import { parseBackendEvent } from "./backend-events.mjs";
import { createBackendEventBridge } from "./backend-event-bridge.mjs";
import { syncAuthoritativePlayerStates, DEFAULT_AUTHORITATIVE_STATE_SYNC_TIMEOUT_MS } from "./authoritative-state-sync.mjs";
import { DEFAULT_CONTROL_REQUEST_TIMEOUT_MS, cancelDialogsOnBackend, createEntityOnBackend, destroyEntityOnBackend, getPlayerStateFromBackend, kickPlayerOnBackend, linkPlayerOnBackend, openDialogOnBackend, queueDamageStateToBackend, queueEntityStateToBackend, queuePlayerStateToBackend, sendChatMessagesToBackend, sendChatMessageToBackend, sendClientEventToBackend, sendGuiCommandToBackend, sendSoundCommandToBackend } from "./control-client.mjs";
import { ScriptRuntime } from "./runtime/script-runtime.mjs";
import { validateRuntimePackage } from "./runtime-package.mjs";
import { assertRealDirectory, assertRegularFile, resolveRegularFileWithin } from "./package-paths.mjs";
import { readJsonFile } from "./json-file.mjs";
import { formatDiagnostic } from "./diagnostics.mjs";
import { DEFAULT_CONTROL_RETRY_ATTEMPTS, DEFAULT_CONTROL_RETRY_DELAY_MS, retryControlRequest } from "./control-retry.mjs";
import { readBooleanFlagEnv, readOptionalNonEmptyStringEnv, readPortEnv, readPositiveIntegerEnv, readUnsignedIdMapEnv } from "./environment.mjs";
import { createStateSyncWarningLogger, DEFAULT_STATE_SYNC_WARNING_INTERVAL_MS } from "./state-sync-warnings.mjs";
import { DEFAULT_BACKEND_SHUTDOWN_TIMEOUT_MS, stopBackendProcess } from "./backend-shutdown.mjs";
import { loadPreservedBlockCatalogMetadata } from "../../../Backend/local-player/src/block-info.mjs";
import { verifyProjectBootstrapFile, verifyProjectBootstrapProtocol } from "./bootstrap-integrity.mjs";
import { verifyBootstrapAvatarAssets, verifyBootstrapMeshAssets, verifyBootstrapSoundAssets } from "./bootstrap-mesh-integrity.mjs";
import { verifyRuntimePackageIdentity } from "./runtime-package-identity.mjs";
import { diagnoseSpawnCollision } from "./spawn-collision-diagnostic.mjs";
import { verifyPlayerBlockAudioAssets } from "./player-block-audio-integrity.mjs";
import { verifyPlayerProjectionPackageIdentity } from "./player-projection-identity.mjs";
import { readRuntimePackageEvidenceInputs, readRuntimePackageScriptInputs, readRuntimePackageUiState } from "./runtime-package-capability-inputs.mjs";
import { resolveRuntimePackageStorageFile, resolveRuntimePackageStorageScope } from "./runtime-package-storage-scope.mjs";

process.on("unhandledRejection", error => {
  console.error(`[demo] unhandled script rejection: ${formatDiagnostic(error, [controlToken])}`);
});

const demoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(demoRoot, "..", "..");
const sourceRoot = resolve(process.env.NEA_DEMO_SOURCE_ROOT ?? resolve(demoRoot, "project"));
const defaultBuildRoot = resolve(process.env.NEA_DEMO_BUILD_ROOT ?? resolve(demoRoot, "build", "project"));
const defaultAssetRoot = resolve(repositoryRoot, "Backend/local-player", "archive");
const backendPath = resolve(repositoryRoot, "Backend/local-player", "backend", "box3-server.cjs");
const port = readPortEnv(process.env, "NEA_DEMO_PORT", 4322);
const controlPort = readPortEnv(process.env, "NEA_DEMO_CONTROL_PORT", port + 1);
const controlToken = process.env.NEA_DEMO_CONTROL_TOKEN ?? randomBytes(32).toString("hex");
const shortControlRequestTimeoutMS = readPositiveIntegerEnv(process.env, "NEA_DEMO_CONTROL_REQUEST_TIMEOUT_MS", DEFAULT_CONTROL_REQUEST_TIMEOUT_MS);
const stateSyncIntervalMS = readPositiveIntegerEnv(process.env, "NEA_DEMO_STATE_SYNC_INTERVAL_MS", 50);
const stateSyncWarningIntervalMS = readPositiveIntegerEnv(process.env, "NEA_DEMO_STATE_SYNC_WARNING_INTERVAL_MS", DEFAULT_STATE_SYNC_WARNING_INTERVAL_MS);
const backendShutdownTimeoutMS = readPositiveIntegerEnv(process.env, "NEA_DEMO_BACKEND_SHUTDOWN_TIMEOUT_MS", DEFAULT_BACKEND_SHUTDOWN_TIMEOUT_MS);
const runtimePackagePath = process.env.NEA_RUNTIME_PACKAGE;
const allowBlockedPackageDiagnostic = readBooleanFlagEnv(process.env, "NEA_DEMO_ALLOW_BLOCKED_PACKAGE_DIAGNOSTIC");
const localDiagnosticStorageGroupId = readOptionalNonEmptyStringEnv(process.env, "NEA_DEMO_LOCAL_STORAGE_GROUP_ID");
const localDiagnosticStorageFile = readOptionalNonEmptyStringEnv(process.env, "NEA_DEMO_LOCAL_STORAGE_FILE");
const validatedSkinIds = readUnsignedIdMapEnv(process.env, "NEA_DEMO_VALIDATED_SKIN_IDS");
const defaultSkinName = readOptionalNonEmptyStringEnv(process.env, "NEA_DEMO_DEFAULT_SKIN_NAME");
const sessionPlayers = new Map();
const playerSessions = new Map();
const shutdownController = new AbortController();
const shortControlRequestOptions = Object.freeze({ signal: shutdownController.signal, timeoutMS: shortControlRequestTimeoutMS });
const stateSyncWarningLogger = createStateSyncWarningLogger({
  intervalMS: stateSyncWarningIntervalMS,
  logger: runtimeLogger(),
  now: () => Date.now(),
});
const runtimeCompatibility = await loadRepositoryRuntimeCompatibility(repositoryRoot);

let imported = null;
let buildRoot = defaultBuildRoot;
let assetRoot = defaultAssetRoot;
let worldManifestName = process.env.BOX3_WORLD_MANIFEST ?? "world-bedwars.json";
let clientManifest = null;
let clientUiManifest = null;
let clientRuntimeManifest = null;
let projectBootstrapManifest = null;
let playerProjectionDescriptor = null;
let spawnPoint;
let playerBodyProfile;
let storageScope;
let storageFile;
let worldConfig;
let capabilityManifest;
let playerRoute = "/play/nea-script-lab?contentId=100110008";
let runtimeLabel = "demo project";
if (runtimePackagePath) {
  const runtimePackage = validateRuntimePackage(await readJsonFile(await assertRegularFile(resolve(runtimePackagePath), "runtime package"), "runtime package"));
  buildRoot = await assertRealDirectory(runtimePackage.projectRoot, "runtime package projectRoot");
  assetRoot = await assertRealDirectory(runtimePackage.archiveRoot, "runtime package archiveRoot");
  worldManifestName = runtimePackage.worldManifest;
  clientManifest = runtimePackage.clientManifest;
  clientUiManifest = runtimePackage.clientUiManifest;
  clientRuntimeManifest = runtimePackage.clientRuntimeManifest;
  projectBootstrapManifest = runtimePackage.projectBootstrapManifest;
  const bootstrapManifestPath = await resolveRegularFileWithin(assetRoot, projectBootstrapManifest, "project bootstrap manifest");
  const bootstrapManifest = await readJsonFile(bootstrapManifestPath, "project bootstrap manifest");
  const bootstrapFilePath = await resolveRegularFileWithin(assetRoot, `${dirname(projectBootstrapManifest)}/${bootstrapManifest.file?.name ?? ""}`, "project bootstrap file");
  const bootstrapBytes = await readFile(bootstrapFilePath);
  verifyProjectBootstrapFile(bootstrapManifest, bootstrapBytes);
  verifyProjectBootstrapProtocol(bootstrapBytes);
  await verifyBootstrapMeshAssets(assetRoot, bootstrapBytes);
  await verifyBootstrapAvatarAssets(assetRoot, bootstrapBytes);
  await verifyBootstrapSoundAssets(assetRoot, bootstrapBytes);
  playerProjectionDescriptor = runtimePackage.playerProjectionDescriptor;
  playerRoute = `${runtimePackage.route}?contentId=${runtimePackage.contentId}`;
  runtimeLabel = `${runtimePackage.packageId} (${runtimePackage.contentId})`;
  const projectManifest = await readJsonFile(await assertRegularFile(resolve(buildRoot, "dao3.project.json"), "project manifest"), "project manifest");
  if (playerProjectionDescriptor !== null) {
    await verifyPlayerProjectionPackageIdentity({ buildRoot, descriptorPath: playerProjectionDescriptor, projectManifest });
  }
  const clientRuntimeManifestValue = await readJsonFile(await resolveRegularFileWithin(assetRoot, clientRuntimeManifest, "client runtime manifest"), "client runtime manifest");
  verifyRuntimePackageIdentity({ runtimePackage, projectManifest, clientRuntimeManifest: clientRuntimeManifestValue });
  if (typeof projectManifest.capabilities !== "string") throw new Error("Runtime package predates the required project capability manifest; rebuild it with the current importer");
  capabilityManifest = await readJsonFile(await resolveRegularFileWithin(buildRoot, projectManifest.capabilities, "project capability manifest"), "project capability manifest");
  const capabilityExpectations = {
    apiVersion: projectManifest.engine?.runtimeApiVersion,
    contracts: { client: projectManifest.engine?.clientContract, server: projectManifest.engine?.serverContract },
  };
  if (allowBlockedPackageDiagnostic) {
    const evaluation = evaluateProjectCapabilityManifest(capabilityManifest, capabilityExpectations);
    if (evaluation.status === "blocked") {
      console.warn(`[demo] diagnostic package admission preserves blocked status: requirements=${capabilityManifest.summary.blocked} resources=${capabilityManifest.summary.blockedResources} ui=${capabilityManifest.summary.blockedUi} diagnostics=${capabilityManifest.summary.blockingDiagnostics}`);
    } else {
      assertProjectCapabilities(capabilityManifest, capabilityExpectations);
    }
  } else {
    assertProjectCapabilities(capabilityManifest, capabilityExpectations);
  }
  verifyProjectCapabilityRuntimeAbiInput(capabilityManifest, runtimeCompatibility);
  const declaredStorageScope = resolveRuntimePackageStorageScope({
    allowBlockedPackageDiagnostic,
    declaredGroupId: projectManifest.storage?.groupId,
  });
  verifyProjectCapabilityStorageScopeInput(capabilityManifest, declaredStorageScope);
  // Capability evidence remains bound to the recovered declaration above. A local diagnostic
  // namespace is an explicit runtime-only adaptation and must never be hashed as historical input.
  storageScope = resolveRuntimePackageStorageScope({
    allowBlockedPackageDiagnostic,
    declaredGroupId: projectManifest.storage?.groupId,
    localDiagnosticGroupId: localDiagnosticStorageGroupId,
  });
  storageFile = resolveRuntimePackageStorageFile({
    localDiagnosticGroupId: localDiagnosticStorageGroupId,
    localDiagnosticStorageFile,
  });
  verifyProjectCapabilityProjectIdentityInput(capabilityManifest, { projectName: projectManifest.display?.name });
  const packageScriptInputs = await readRuntimePackageScriptInputs({ buildRoot, assetRoot, projectManifest, capabilityManifest, clientManifest });
  verifyProjectCapabilityModuleInputs(capabilityManifest, packageScriptInputs.modules);
  verifyProjectCapabilityGrants(capabilityManifest, packageScriptInputs.capabilities);
  verifyProjectCapabilityUiInput(capabilityManifest, await readRuntimePackageUiState(assetRoot, clientUiManifest));
  const packageEvidenceInputs = await readRuntimePackageEvidenceInputs(buildRoot, projectManifest);
  await verifyProjectCapabilityAssetFiles(packageEvidenceInputs.assets, async (_asset, source) => readFile(await resolveRegularFileWithin(buildRoot, source, `project asset ${source}`)));
  await verifyPlayerBlockAudioAssets({ buildRoot, assetRoot, assets: packageEvidenceInputs.assets });
  verifyProjectCapabilityAssetInput(capabilityManifest, packageEvidenceInputs.assets);
  verifyProjectCapabilityEntityInput(capabilityManifest, packageEvidenceInputs.entities);
  const world = await readJsonFile(await resolveRegularFileWithin(buildRoot, projectManifest.world, "project world manifest"), "project world manifest");
  const physics = world.physics ? await readJsonFile(await resolveRegularFileWithin(buildRoot, world.physics, "project physics manifest"), "project physics manifest") : {};
  worldConfig = {
    entityLimit: world.entityLimit ?? 3400,
    ...(physics.airFriction === undefined ? {} : {
      gravity: physics.gravity,
      airFriction: physics.airFriction,
    }),
  };
  verifyProjectCapabilityWorldConfigInput(capabilityManifest, worldConfig);
  const normalizedSpawn = normalizeWorldSpawnWithinShape(world.spawn, world.shape);
  verifyProjectCapabilityWorldSpawnInput(capabilityManifest, normalizedSpawn);
  verifyProjectCapabilityPlayerBodyInput(capabilityManifest, physics.playerBody);
  spawnPoint = normalizedSpawn;
  playerBodyProfile = physics.playerBody;
} else {
  imported = await importMapProject(sourceRoot, buildRoot, { runtimeCompatibility });
  playerRoute = `/play/${imported.manifest.id}?contentId=100110008`;
  capabilityManifest = imported.capabilityManifest;
  const importedCapabilityExpectations = {
    apiVersion: imported.manifest.runtime.apiVersion,
    contracts: { client: imported.manifest.runtime.clientContract, server: imported.manifest.runtime.serverContract },
  };
  if (allowBlockedPackageDiagnostic) {
    const importedEvaluation = evaluateProjectCapabilityManifest(capabilityManifest, importedCapabilityExpectations);
    if (importedEvaluation.status === "blocked") {
      console.warn(`[demo] diagnostic package admission preserves blocked status: requirements=${capabilityManifest.summary?.blocked} resources=${capabilityManifest.summary?.blockedResources} diagnostics=${capabilityManifest.summary?.blockingDiagnostics}`);
    } else {
      assertProjectCapabilities(capabilityManifest, importedCapabilityExpectations);
    }
  } else {
    assertProjectCapabilities(capabilityManifest, importedCapabilityExpectations);
  }
  verifyProjectCapabilityRuntimeAbiInput(capabilityManifest, runtimeCompatibility);
  storageScope = { groupId: imported.manifest.runtime.groupId };
  verifyProjectCapabilityStorageScopeInput(capabilityManifest, storageScope);
  verifyProjectCapabilityProjectIdentityInput(capabilityManifest, { projectName: imported.manifest.display.name });
  worldConfig = {
    entityLimit: imported.manifest.world.entityLimit,
    ...(imported.physics.airFriction === undefined ? {} : {
      gravity: imported.physics.gravity,
      airFriction: imported.physics.airFriction,
    }),
  };
  verifyProjectCapabilityWorldConfigInput(capabilityManifest, worldConfig);
  const normalizedSpawn = normalizeWorldSpawnWithinShape(imported.manifest.world.spawn, imported.manifest.world.shape);
  verifyProjectCapabilityWorldSpawnInput(capabilityManifest, normalizedSpawn);
  verifyProjectCapabilityPlayerBodyInput(capabilityManifest, imported.physics.playerBody);
  verifyProjectCapabilityModuleInputs(capabilityManifest, [
    ...imported.serverModules.map(module => ({ side: "server", name: module.name, bytes: module.bytes })),
    ...imported.clientModules.map(module => ({ side: "client", name: module.name, bytes: module.bytes })),
  ]);
  verifyProjectCapabilityGrants(capabilityManifest, {
    server: imported.manifest.scripts.serverCapabilities,
    client: imported.manifest.scripts.clientCapabilities,
  });
  verifyProjectCapabilityUiInput(capabilityManifest, imported.clientUiState);
  await verifyProjectCapabilityAssetFiles(imported.assets, async asset => asset.bytes);
  verifyProjectCapabilityAssetInput(capabilityManifest, imported.assets);
  verifyProjectCapabilityEntityInput(capabilityManifest, imported.entities);
  clientManifest = await publishClientScript(imported, assetRoot);
  clientUiManifest = await publishClientUiState(imported, assetRoot);
  spawnPoint = normalizedSpawn;
  playerBodyProfile = imported.physics.playerBody;
}
const blockCatalogMetadata = await loadPreservedBlockCatalogMetadata(assetRoot, worldManifestName);
const blockCatalog = blockCatalogMetadata.catalog;
const runtime = await ScriptRuntime.load(buildRoot, {
  logger: runtimeLogger(),
  blockCatalog,
  validatedSkinIds,
  defaultSkinName,
  storageScope,
  storageFile,
  validatedMeshNames: capabilityManifest.resources
    .filter(resource => resource.kind === "mesh" && resource.runtimeSupport === "validated-mesh" && resource.state === "ready")
    .map(resource => resource.reference),
  sendGuiCommand: async command => {
    const session = playerSessions.get(command.playerId);
    if (!session) throw new Error(`No backend session is bound to ${command.playerId}`);
    const { playerId, ...guiCommand } = command;
    return sendGuiCommandWithRetry({ port: controlPort, token: controlToken, session, command: guiCommand, ...shortControlRequestOptions });
  },
  sendClientEvent: async (playerId, event) => {
    const session = playerSessions.get(playerId);
    if (!session) throw new Error(`No backend session is bound to ${playerId}`);
    await sendClientEventWithRetry({ port: controlPort, token: controlToken, session, event, ...shortControlRequestOptions });
  },
  sendChatMessage: async (playerId, message) => {
    const session = playerId === undefined ? undefined : playerSessions.get(playerId);
    if (playerId !== undefined && !session) throw new Error(`No backend session is bound to ${playerId}`);
    await sendChatMessageToBackend({ port: controlPort, token: controlToken, session, message, ...shortControlRequestOptions });
  },
  sendChatMessages: async deliveries => {
    const resolved = deliveries.map(delivery => {
      const session = delivery.sessionId === undefined ? undefined : playerSessions.get(delivery.sessionId);
      if (delivery.sessionId !== undefined && !session) throw new Error(`No backend session is bound to ${delivery.sessionId}`);
      return Object.freeze({ ...(session === undefined ? {} : { session }), message: delivery.message });
    });
    await sendChatMessagesToBackend({ port: controlPort, token: controlToken, deliveries: resolved, ...shortControlRequestOptions });
  },
  sendSoundCommand: command => sendSoundCommandToBackend({ port: controlPort, token: controlToken, command, ...shortControlRequestOptions }),
  showDialog: async (playerId, config) => {
    const session = playerSessions.get(playerId);
    if (!session) throw new Error(`No backend session is bound to ${playerId}`);
    return openDialogWithRetry({ port: controlPort, token: controlToken, session, config, signal: shutdownController.signal });
  },
  cancelDialogs: playerId => {
    const session = playerSessions.get(playerId);
    if (!session) return false;
    return cancelDialogsOnBackend({ port: controlPort, token: controlToken, session, ...shortControlRequestOptions });
  },
  kickPlayer: playerId => {
    const session = playerSessions.get(playerId);
    if (!session) throw new Error(`No backend session is bound to ${playerId}`);
    return kickPlayerOnBackend({ port: controlPort, token: controlToken, session, ...shortControlRequestOptions });
  },
  linkPlayer: (playerId, href, linkOptions) => {
    const session = playerSessions.get(playerId);
    if (!session) throw new Error(`No backend session is bound to ${playerId}`);
    return linkPlayerOnBackend({ port: controlPort, token: controlToken, session, href, linkOptions, ...shortControlRequestOptions });
  },
  writePlayerState: async (playerId, state) => {
    const session = playerSessions.get(playerId);
    if (!session) throw new Error(`No backend session is bound to ${playerId}`);
    await queuePlayerStateToBackend({ port: controlPort, token: controlToken, session, state, ...shortControlRequestOptions });
  },
  writeDamageState: async (target, state, events) => {
    const session = target.playerId === undefined ? undefined : playerSessions.get(target.playerId);
    if (target.playerId !== undefined && !session) throw new Error(`No backend session is bound to ${target.playerId}`);
    await queueDamageStateToBackend({ port: controlPort, token: controlToken, session, entityId: target.entityId, state, events, ...shortControlRequestOptions });
  },
  destroyEntity: async entityId => {
    await destroyEntityOnBackend({ port: controlPort, token: controlToken, entityId, ...shortControlRequestOptions });
  },
  createEntity: async entity => {
    return createEntityOnBackend({ port: controlPort, token: controlToken, entity, ...shortControlRequestOptions });
  },
  writeEntityState: async (entityId, state) => {
    await queueEntityStateToBackend({ port: controlPort, token: controlToken, entityId, state, ...shortControlRequestOptions });
  },
});
const spawnCollision = diagnoseSpawnCollision(runtime.collisionWorld, spawnPoint, playerBodyProfile);
if (spawnCollision.solidOverlap) {
  console.warn(`[demo] spawn collision diagnostic: origin=${spawnCollision.origin ?? "unknown"} contacts=${spawnCollision.contactIds.join(",")}`);
}
await runtime.start();
const moduleExecution = runtime.moduleExecutionSummary();
console.log(`[demo] Server Script Runtime modules: declared=${moduleExecution.declared} loaded=${moduleExecution.loaded} entryLoaded=${moduleExecution.entryLoaded}`);
if (imported) console.log(`[demo] ${formatImportSummary(imported)}`);
console.log(`[demo] startup config: sourceRoot=${sourceRoot} playerPort=${port} controlPort=${controlPort} shortControlTimeoutMS=${shortControlRequestTimeoutMS} stateSyncIntervalMS=${stateSyncIntervalMS} stateSyncWarningIntervalMS=${stateSyncWarningIntervalMS} backendShutdownTimeoutMS=${backendShutdownTimeoutMS} runtime=${runtimeLabel}`);
console.log(`[demo] Script Runtime started for ${runtimeLabel}`);

const child = spawn(process.execPath, [backendPath], {
  cwd: resolve(repositoryRoot, "Backend", "local-player"),
  env: {
    ...process.env,
    BOX3_PORT: String(port),
    BOX3_ASSET_ROOT: assetRoot,
    ...(runtimePackagePath && playerProjectionDescriptor ? { BOX3_PROJECT_ROOT: buildRoot, BOX3_PLAYER_PROJECTION_DESCRIPTOR: playerProjectionDescriptor } : runtimePackagePath ? {} : { BOX3_PROJECT_ROOT: buildRoot }),
    BOX3_WORLD_MANIFEST: worldManifestName,
    ...(clientRuntimeManifest === null ? {} : { BOX3_CLIENT_RUNTIME_MANIFEST: clientRuntimeManifest }),
    ...(projectBootstrapManifest === null ? {} : { BOX3_PROJECT_BOOTSTRAP_MANIFEST: projectBootstrapManifest }),
    BOX3_PROJECT_BLOCK_INFO: blockCatalogMetadata.contentAddress,
    ...(blockCatalogMetadata.resetCounter === null ? {} : { BOX3_PROJECT_RESET_COUNTER: String(blockCatalogMetadata.resetCounter) }),
    ...(blockCatalogMetadata.innerAO === null ? {} : { BOX3_PROJECT_INNER_AO: String(blockCatalogMetadata.innerAO) }),
    BOX3_LOG_REMOTE_EVENTS: "1",
    BOX3_LOG_NET_EVENTS: "1",
    BOX3_LOG_SCRIPT_INPUT_EVENTS: "1",
    BOX3_LOG_SCRIPT_INTERACT_EVENTS: "1",
    ...(clientUiManifest === null ? { BOX3_MINIMAL_GAME_UI: "1" } : { BOX3_CLIENT_UI_MANIFEST: clientUiManifest }),
    BOX3_CONTROL_PORT: String(controlPort),
    BOX3_CONTROL_TOKEN: controlToken,
    BOX3_PLAYER_BODY_PROFILE: JSON.stringify({
      profileId: playerBodyProfile.profileId,
      origin: playerBodyProfile.origin,
      originStatus: playerBodyProfile.originStatus,
      sizeStatus: playerBodyProfile.sizeStatus,
      boundsHalfExtents: vectorTuple(playerBodyProfile.boundsHalfExtents),
      shapeHalfExtents: vectorTuple(playerBodyProfile.shapeHalfExtents),
    }),
    BOX3_DISABLE_LEGACY_GAMEPLAY: "1",
    ...(clientManifest === null ? {} : { BOX3_CLIENT_SCRIPT_MANIFEST: clientManifest }),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const dispatchBackendEvent = createBackendEventBridge({ logger: console, playerSessions, runtime, sessionPlayers, spawnPoint });
pipeBackend(child.stdout, process.stdout, line => {
  let backendEvent;
  try {
    backendEvent = parseBackendEvent(line);
  } catch (error) {
    console.warn(`[demo] rejected backend event: ${formatDiagnostic(error, [controlToken])}`);
    return;
  }
  dispatchBackendEvent(backendEvent);
});
pipeBackend(child.stderr, process.stderr);

child.once("spawn", () => {
  console.log(`[demo] Player: http://127.0.0.1:${port}${playerRoute}`);
});
child.once("error", error => {
  console.error(`[demo] Player backend failed to start: ${formatDiagnostic(error, [controlToken])}`);
  if (!stopping) process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  runtime.stop();
  if (!stopping) {
    console.error(`[demo] Player backend exited (${signal ?? code ?? "unknown"})`);
    process.exitCode = code ?? 1;
  }
});

let stopping = false;
let stateSyncRunning = false;
const stateSyncInterval = setInterval(async () => {
  if (stateSyncRunning || stopping) return;
  stateSyncRunning = true;
  try {
    await syncAuthoritativePlayerStates({
      applyState: (playerId, state) => runtime.applyAuthoritativeState(playerId, state),
      isMissingSessionError: error => String(error).includes("player state not found"),
      logger: runtimeLogger(),
      readState: ({ session, signal }) => getPlayerStateFromBackend({ port: controlPort, token: controlToken, session, signal }),
      sessionPlayers,
      signal: shutdownController.signal,
      timeoutMS: DEFAULT_AUTHORITATIVE_STATE_SYNC_TIMEOUT_MS,
      warningLogger: stateSyncWarningLogger,
    });
  } finally {
    stateSyncRunning = false;
  }
}, stateSyncIntervalMS);
stateSyncInterval.unref?.();
function stop() {
  if (stopping) return;
  stopping = true;
  shutdownController.abort(new Error("Demo shutdown cancelled pending control retries"));
  clearInterval(stateSyncInterval);
  runtime.stop();
  void stopBackendProcess({ child, logger: runtimeLogger(), timeoutMS: backendShutdownTimeoutMS }).catch(error => {
    console.error(`[demo] Player backend shutdown failed: ${formatDiagnostic(error, [controlToken])}`);
  });
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

function pipeBackend(stream, destination, onLine = () => {}) {
  const lines = createInterface({ input: stream });
  lines.on("line", line => {
    destination.write(`[player] ${formatDiagnostic(line, [controlToken])}\n`);
    onLine(line);
  });
}

function runtimeLogger() {
  return {
    info: message => console.log(message),
    warn: message => console.warn(formatDiagnostic(message, [controlToken])),
    error: message => console.error(formatDiagnostic(message, [controlToken])),
  };
}

async function sendGuiCommandWithRetry(options) {
  return retryControlRequest({
    ...retryOptions(options),
    request: () => sendGuiCommandToBackend(options),
    shouldRetry: error => String(error).includes("GUI client not connected"),
  });
}

async function openDialogWithRetry(options) {
  return retryControlRequest({
    ...retryOptions(options),
    request: () => openDialogOnBackend(options),
    shouldRetry: error => String(error).includes("dialog client not connected"),
  });
}

async function sendClientEventWithRetry(options) {
  return retryControlRequest({
    ...retryOptions(options),
    request: () => sendClientEventToBackend(options),
    shouldRetry: error => String(error).includes("session not connected"),
  });
}

function retryOptions(options) {
  return {
    delayMS: DEFAULT_CONTROL_RETRY_DELAY_MS,
    maxAttempts: DEFAULT_CONTROL_RETRY_ATTEMPTS,
    signal: options.signal,
  };
}

function vectorTuple(value) {
  if (Array.isArray(value) && value.length === 3) return value;
  return [value.x, value.y, value.z];
}
