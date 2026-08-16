import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const relativeSourcePath = "Frontend/demo-map/src/runtime/script-runtime.mjs";
const source = await readFile(resolve(repositoryRoot, relativeSourcePath), "utf8");
const relativeEventSignalPath = "Frontend/demo-map/src/runtime/event-signal.mjs";
const eventSignalSource = await readFile(resolve(repositoryRoot, relativeEventSignalPath), "utf8");
const relativeGameVoxelsPath = "Frontend/demo-map/src/runtime/game-voxels.mjs";
const gameVoxelsSource = await readFile(resolve(repositoryRoot, relativeGameVoxelsPath), "utf8");
const relativeGameRaycastPath = "Frontend/demo-map/src/runtime/game-raycast.mjs";
const gameRaycastSource = await readFile(resolve(repositoryRoot, relativeGameRaycastPath), "utf8");
const relativeEntityLookAtPath = "Frontend/demo-map/src/runtime/entity-look-at.mjs";
const entityLookAtSource = await readFile(resolve(repositoryRoot, relativeEntityLookAtPath), "utf8");
const relativeEntityBoundsPath = "Frontend/demo-map/src/runtime/entity-bounds.mjs";
const entityBoundsSource = await readFile(resolve(repositoryRoot, relativeEntityBoundsPath), "utf8");
const relativeGameSelectorPath = "Frontend/demo-map/src/runtime/game-selector.mjs";
const gameSelectorSource = await readFile(resolve(repositoryRoot, relativeGameSelectorPath), "utf8");
const relativeGameGuiPath = "Frontend/demo-map/src/runtime/game-gui.mjs";
const gameGuiSource = await readFile(resolve(repositoryRoot, relativeGameGuiPath), "utf8");
const relativeGameHttpPath = "Frontend/demo-map/src/runtime/game-http.mjs";
const gameHttpSource = await readFile(resolve(repositoryRoot, relativeGameHttpPath), "utf8");
const relativeGameStoragePath = "Frontend/demo-map/src/runtime/game-storage.mjs";
const gameStorageSource = await readFile(resolve(repositoryRoot, relativeGameStoragePath), "utf8");
const relativeGameWorldPath = "Frontend/demo-map/src/runtime/game-world.mjs";
const gameWorldSource = await readFile(resolve(repositoryRoot, relativeGameWorldPath), "utf8");
const relativeGameSoundPath = "Frontend/demo-map/src/runtime/game-sound.mjs";
const gameSoundSource = await readFile(resolve(repositoryRoot, relativeGameSoundPath), "utf8");
const relativeGameZonesPath = "Frontend/demo-map/src/runtime/game-zones.mjs";
const gameZonesSource = await readFile(resolve(repositoryRoot, relativeGameZonesPath), "utf8");

const requiredMarkers = [
  "get currentTick() { return runtime.currentTick; }",
  "export const GameButtonType = Object.freeze({",
  "dispatchInputEvents(playerId, packet) {",
  "const permissionMask = inputPermissionMask(player);",
  "enableAction0: true,",
  "runtime.#require(\"server.world.voxels\")",
  "const voxels = createCapabilityFacade(this.voxels",
  "const gui = createCapabilityFacade(this.gui",
  "const storage = createCapabilityFacade(this.storage",
  "const guardedWorld = createCapabilityFacade(world",
  "onTick: handler => this.#listen(\"server.world.events\"",
  "const timing = createTickTiming(this.currentTick, prevTick, now, this.#prevTickMS)",
  "onPlayerJoin: handler => this.#listen(\"server.world.events\"",
  "onPlayerLeave: handler => this.#listen(\"server.world.events\"",
  "onVoxelContact: handler => this.#listen(\"server.world.events\"",
  "nextVoxelContact: filter => this.#next(\"server.world.events\"",
  "player._signals.voxelContact.emit(event",
  "player._signals.voxelSeparate.emit(event",
  "for (const fluid of contacts.fluidEntered) this.#dispatchFluidEvent(\"fluidEnter\", player, fluid)",
  "export class RuntimeFluidContactEvent",
  "export class RuntimeClickEvent",
  "export class RuntimeInputEvent",
  "export class RuntimeEntityEvent",
  "export class RuntimeDamageEvent",
  "export class RuntimeDieEvent",
  "export class RuntimeRespawnEvent",
  "export class RuntimeInteractEvent",
  "export class RuntimeTickEvent",
  "export class RuntimeChatEvent",
  "export class RuntimePurchaseSuccessEvent",
  "export class RuntimeKeyBoardEvent",
  "return Object.freeze(new RuntimeClickEvent",
  "return Object.freeze(new RuntimeInputEvent",
  "return Object.freeze(new RuntimeEntityEvent",
  "return Object.freeze(new RuntimeDamageEvent",
  "return Object.freeze(new RuntimeDieEvent",
  "return Object.freeze(new RuntimeRespawnEvent",
  "return Object.freeze(new RuntimeInteractEvent",
  "return Object.freeze(new RuntimeTickEvent",
  "return Object.freeze(new RuntimeChatEvent",
  "return Object.freeze(new RuntimePurchaseSuccessEvent",
  "return Object.freeze(new RuntimeKeyBoardEvent",
  "return Object.freeze(new RuntimeRaycastResult",
  "new RuntimeFluidContactEvent(this.currentTick, entity, contact.voxel)",
  "export function createContactEvent(tick, entity, contact)",
  "export class RuntimeVoxelContactEvent",
  "return Object.freeze(new RuntimeVoxelContactEvent",
  "const force = Vector3.from(contact.force ?? [0, 0, 0])",
  "say: message => {",
  "createEntity: spec => {",
  "entityQuota: () => Math.max(0, this.entityLimit - this.#entities.size)",
  "lookAt(targetPosition, meshFacing = \"Z\", up = new Vector3(0, 1, 0))",
  "rotateLocal(localPosition, axis, radians)",
  "scaleLocal(localPosition, scale)",
  "if (this.#entities.size >= this.entityLimit)",
  "querySelector: selector => this.#query(selector)[0] ?? null",
  "testSelector: (selector, entity) => this.#matchesSelector(entity, selector)",
  "raycast: (origin, direction, options) => raycastWorld({",
  "searchBox: bounds => searchRuntimeEntities(bounds, this.#allQueryableEntities())",
  "onRespawn: handler => this.#listen(\"server.world.events\", this.#signals.respawn, handler)",
  "onTakeDamage: handler => this.#listen(\"server.world.events\", this.#signals.takeDamage, handler)",
  "export function createGameDamageEvent(tick, entity, damage, attacker = null, damageType = \"\")",
  "export function createGameDieEvent(tick, entity, attacker = null, damageType = \"\")",
  "onChat: handler => this.#listen(\"server.world.chat\", this.#signals.chat, handler)",
  "onPress: handler => this.#listen(\"server.world.events\", this.#signals.press, handler)",
  "onClick: handler => this.#listen(\"server.world.events\", this.#signals.click, handler)",
  "export function createGameClickEvent(tick, entity, clicker, button, distance, clickerPosition, raycast)",
  "onClick(handler) { return this._signals.click.on(handler); }",
  "onRelease: handler => this.#listen(\"server.world.events\", this.#signals.release, handler)",
  "onFluidEnter: handler => this.#listen(\"server.world.events\", this.#signals.fluidEnter, handler)",
  "onFluidLeave: handler => this.#listen(\"server.world.events\", this.#signals.fluidLeave, handler)",
  "onDie: handler => this.#listen(\"server.world.events\", this.#signals.die, handler)",
  "onEntityContact: handler => this.#listen(\"server.world.events\", this.#signals.entityContact, handler)",
  "onPlayerPurchaseSuccess: handler => this.#listen(\"server.world.events\", this.#signals.playerPurchaseSuccess, handler)",
  "forceRespawn() { return runtime._forceRespawnPlayer(this); }",
  "spawnPoint: Vector3.from(input.position ?? [0, 0, 0])",
  "color: new GameRGBColor(1, 1, 1)",
  "export function createRuntimeEntity(input, runtime = null)",
  "get id() { return this._id; }",
  "get kind() { return this._kind; }",
  "onEntityCreate: handler => this.#listen(\"server.world.events\", this.#signals.entityCreate, handler)",
  "onEntityDestroy: handler => this.#listen(\"server.world.events\", this.#signals.entityDestroy, handler)",
  "#projectEntity(entity)",
  "set position(value) { this._position.copy(Vector3.from(value)); this._runtime?._entityTransformChanged(this); }",
  "set velocity(value) { this._velocity.copy(Vector3.from(value)); this._runtime?._entityTransformChanged(this); }",
  "get tags() { return this._tags; }",
  "const sendRemoteEvent = (player, event) => {",
  "onServerEvent: handler => this.#listen(\"server.remote-channel\"",
  "sendClientEvent: (players, event) => {",
  "broadcastClientEvent: event => {",
  "_id: String(input.id)",
  "get id() { return this._id; }",
  "get position() { return this._body.position; }",
  "applyImpulse(value) { runtime._applyImpulse(this, value); }",
  "hurt(amount, options) { runtime._hurtEntity(this, amount, options); }",
  "damage(amount) { return runtime._damagePlayer(this, amount); }",
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`Local Server Runtime no longer contains ${marker}`);
}
for (const marker of ["export class GameWorld", "this.fogColor = new GameRGBColor(1, 1, 1)", "this.gravity = -0.1", "this.airFriction = 0.001"]) {
  if (!gameWorldSource.includes(marker)) throw new Error(`Local GameWorld value shell no longer contains ${marker}`);
}
for (const marker of ["export class GameHttpFetchResponse", "export function createRuntimeHttpClient", "allowedOrigins", "AbortSignal.timeout"]) {
  if (!gameHttpSource.includes(marker)) throw new Error(`Local GameHttp Runtime no longer contains ${marker}`);
}
for (const marker of ["export class RuntimeGameZone", "export class GameZoneSystem", "add(config = {})", "poll(tick, entities)"]) {
  if (!gameZonesSource.includes(marker)) throw new Error(`Local GameZone Runtime no longer contains ${marker}`);
}
for (const marker of ["export class GameGuiRuntime", 'this.init = (entity, config) =>', 'this.remove = (entity, selector) =>', 'this.getAttribute = (entity, selector, name) =>', 'this.setAttribute = (entity, selector, name, value) =>', "this.onMessage = listener =>", "this.ui = new Proxy"]) {
  if (!gameGuiSource.includes(marker)) throw new Error(`Local GameGUI Runtime no longer contains ${marker}`);
}
for (const marker of ["export class LocalGameStorage", "export class RuntimeDataStorage", "export class RuntimeQueryList", "#mutationQueue = Promise.resolve()", "#mutate(apply)", "isJsonValue(value, ancestors)", "Number.isFinite(value)", "Object.getOwnPropertySymbols(value)", "this.getDataStorage = key =>", "group:${groupId}:${key}", "set: (itemKey, value) =>", "update: (itemKey, handler) =>", "increment: (itemKey, value = 1) =>", "list: (options = {}) =>", "parseConstraintTarget", "resolveConstraintTarget", "compareStorageTargets", "Math.min(100", "remove: itemKey =>", "destroy: () =>", "const start = page * pageSize", "if (next.items.length > 0) this.#items = next.items"]) {
  if (!gameStorageSource.includes(marker)) throw new Error(`Local GameStorage Runtime no longer contains ${marker}`);
}
for (const marker of ["export class RuntimeRaycastResult", "export function raycastWorld", "return new RuntimeRaycastResult", "options?.ignoreVoxel === true", "options?.ignoreFluid === true", "options?.ignoreEntities === true", "options?.ignoreSelector", "return Infinity", "nearest?.position ?? new Vector3(0, 0, 0)", "voxelIndex:", "hitEntity:"]) {
  if (!gameRaycastSource.includes(marker)) throw new Error(`Local GameWorld.raycast Runtime no longer contains ${marker}`);
}
for (const marker of ["export function runtimeEntityBounds", "export function searchRuntimeEntities", "query.intersects(entityBounds)"]) {
  if (!entityBoundsSource.includes(marker)) throw new Error(`Local GameWorld.searchBox Runtime no longer contains ${marker}`);
}
for (const marker of ["export function entityLookAtQuaternion", "export function rotateEntityLocal", "export function scaleEntityLocal", "export function applyHistoricalEntityTransform", "currentZ = new Vector3(0, 0, 1)", "currentZ.x + 0.0001", "new GameQuaternion(x, y, z, w)", "position.add(before).sub(after)"]) {
  if (!entityLookAtSource.includes(marker)) throw new Error(`Local GameEntity.lookAt Runtime no longer contains ${marker}`);
}
for (const marker of ["export class Sound", "export function normalizeWorldSound", "export function normalizeEntitySound", "export function normalizePlayerSound", "min pitch scaling is 0.1"]) {
  if (!gameSoundSource.includes(marker)) throw new Error(`Local sound Runtime no longer contains ${marker}`);
}
for (const marker of ["export class ParsedGameSelector", "this.selector.split(\",\")", "if (token === \"entity\") this.matchAll = true", "component === \"player\"", "this.names.includes(entity.id)", "entity.destroyed === true"]) {
  if (!gameSelectorSource.includes(marker)) throw new Error(`Local GameSelector Runtime no longer contains ${marker}`);
}
for (const marker of ["export class GameVoxelsRuntime", "id(name)", "getVoxelId(x, y, z)", "setVoxelId(x, y, z, voxel)", "setVoxel(x, y, z, voxel, rotation)", "name(id)", "getVoxel(x, y, z)", "getVoxelRotation(x, y, z)", "this.shape = this.#shape", "this.VoxelTypes ="]) {
  if (!gameVoxelsSource.includes(marker)) throw new Error(`Local GameVoxels Runtime no longer contains ${marker}`);
}
for (const marker of ["export class GameEventHandlerToken", "return new GameEventHandlerToken(", "record.finished = true", "record.finished = false", "if (!record.inQueue)", "() => !record.finished", "#futures = new Set()", "next(filter)", "future.filter.call(null, event)", "future.reject(error)"]) {
  if (!eventSignalSource.includes(marker)) throw new Error(`Local event token no longer contains ${marker}`);
}

const evidence = {
  type: "local-source",
  path: relativeSourcePath,
  symbol: "ScriptRuntime.#createGlobals",
  confidence: "direct",
};

const zonePropertyTypes = [
  ["bounds", "GameBounds3"], ["selector", "GameSelectorString"], ["massScale", "number"], ["force", "GameVector3"],
  ["fogEnabled", "boolean"], ["fogColor", "GameRGBColor"], ["fogStartDistance", "number"], ["fogHeightOffset", "number"], ["fogHeightFalloff", "number"], ["fogDensity", "number"], ["fogMax", "number"],
  ["snowEnabled", "boolean"], ["snowDensity", "number"], ["snowSizeLo", "number"], ["snowSizeHi", "number"], ["snowFallSpeed", "number"], ["snowSpinSpeed", "number"], ["snowColor", "GameRGBAColor"], ["snowTexture", "string"],
  ["rainEnabled", "boolean"], ["rainDensity", "number"], ["rainDirection", "GameVector3"], ["rainSpeed", "number"], ["rainSizeLo", "number"], ["rainSizeHi", "number"], ["rainInterference", "number"], ["rainColor", "GameRGBAColor"],
  ["skyEnabled", "boolean"], ["skyMode", "string"], ["skySunPhase", "number"], ["skySunFrequency", "number"], ["skyLunarPhase", "number"], ["skySunDirection", "GameVector3"], ["skySunLight", "GameRGBColor"], ["skyLeftLight", "GameRGBColor"], ["skyRightLight", "GameRGBColor"], ["skyBottomLight", "GameRGBColor"], ["skyTopLight", "GameRGBColor"], ["skyFrontLight", "GameRGBColor"], ["skyBackLight", "GameRGBColor"],
];

const entries = [
  {
    id: "server.object.GameEventHandlerToken",
    side: "server",
    kind: "object",
    owner: null,
    name: "GameEventHandlerToken",
    signature: { methods: ["cancel(): void", "resume(): void", "active(): boolean"] },
    availability: "confirmed",
    compatibility: "emulated",
    capability: "server.world.events",
    since: "0.1.0",
    notes: ["The local structural token now preserves duplicate subscriptions plus cancel, resume and active lifecycle semantics."],
    evidence: [{
      type: "local-source",
      path: relativeEventSignalPath,
      symbol: "EventSignal.on",
      confidence: "direct",
    }],
  },
  entry("server.world.currentTick", "property", "world", "currentTick", { type: "number", readonly: true }, "server.world.events", "emulated", ["server.GameWorld.currentTick"]),
  worldSizeEntry(),
  ...raycastResultEntries(),
  ...voxelContactEventEntries(),
  ...fluidContactEventEntries(),
  ...clickEventEntries(),
  ...inputEventEntries(),
  ...entityEventEntries(),
  ...damageEventEntries(),
  ...dieEventEntries(),
  ...respawnEventEntries(),
  ...interactEventEntries(),
  ...tickEventEntries(),
  ...chatEventEntries(),
  ...purchaseSuccessEventEntries(),
  ...keyBoardEventEntries(),
  entry("server.world.onRespawn", "event", "world", "onRespawn", handler("GameRespawnEvent"), "server.world.events", "partial", ["server.GameWorld.onRespawn"]),
  entry("server.world.nextRespawn", "event", "world", "nextRespawn", { parameters: [{ name: "filter", type: "(event: GameRespawnEvent) => boolean", optional: true }], returns: "Promise<GameRespawnEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextRespawn"]),
  entry("server.world.onTakeDamage", "event", "world", "onTakeDamage", handler("GameDamageEvent"), "server.world.events", "partial"),
  entry("server.world.nextTakeDamage", "event", "world", "nextTakeDamage", { parameters: [{ name: "filter", type: "(event: GameDamageEvent) => boolean", optional: true }], returns: "Promise<GameDamageEvent>" }, "server.world.events", "partial"),
  entry("server.world.onChat", "event", "world", "onChat", handler("GameChatEvent"), "server.world.chat", "partial", ["server.GameWorld.onChat"]),
  entry("server.world.nextChat", "event", "world", "nextChat", { parameters: [{ name: "filter", type: "(event: GameChatEvent) => boolean", optional: true }], returns: "Promise<GameChatEvent>" }, "server.world.chat", "partial", ["server.GameWorld.nextChat"]),
  entry("server.world.onPress", "event", "world", "onPress", handler("GameInputEvent"), "server.world.events", "compatible", ["server.GameWorld.onPress"]),
  entry("server.world.nextPress", "event", "world", "nextPress", { parameters: [{ name: "filter", type: "(event: GameInputEvent) => boolean", optional: true }], returns: "Promise<GameInputEvent>" }, "server.world.events", "compatible", ["server.GameWorld.nextPress"]),
  entry("server.world.onClick", "event", "world", "onClick", handler("GameClickEvent"), "server.world.events", "partial", ["server.GameWorld.onClick"]),
  entry("server.world.onInteract", "event", "world", "onInteract", handler("GameInteractEvent"), "server.world.events", "partial", ["server.GameWorld.onInteract"]),
  entry("server.world.nextInteract", "event", "world", "nextInteract", { parameters: [{ name: "filter", type: "(event: GameInteractEvent) => boolean", optional: true }], returns: "Promise<GameInteractEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextInteract"]),
  entry("server.world.onRelease", "event", "world", "onRelease", handler("GameInputEvent"), "server.world.events", "compatible", ["server.GameWorld.onRelease"]),
  entry("server.world.nextRelease", "event", "world", "nextRelease", { parameters: [{ name: "filter", type: "(event: GameInputEvent) => boolean", optional: true }], returns: "Promise<GameInputEvent>" }, "server.world.events", "compatible", ["server.GameWorld.nextRelease"]),
  entry("server.world.onFluidEnter", "event", "world", "onFluidEnter", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameWorld.onFluidEnter"]),
  entry("server.world.nextFluidEnter", "event", "world", "nextFluidEnter", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextFluidEnter"]),
  entry("server.world.onFluidLeave", "event", "world", "onFluidLeave", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameWorld.onFluidLeave"]),
  entry("server.world.nextFluidLeave", "event", "world", "nextFluidLeave", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextFluidLeave"]),
  entry("server.world.onDie", "event", "world", "onDie", handler("GameDieEvent"), "server.world.events", "partial"),
  entry("server.world.nextDie", "event", "world", "nextDie", { parameters: [{ name: "filter", type: "(event: GameDieEvent) => boolean", optional: true }], returns: "Promise<GameDieEvent>" }, "server.world.events", "partial"),
  entry("server.world.onEntityContact", "event", "world", "onEntityContact", handler("{tick,entity,player,other,axis,force}"), "server.world.events", "partial", ["server.GameWorld.onEntityContact"]),
  entry("server.world.nextEntityContact", "event", "world", "nextEntityContact", { parameters: [{ name: "filter", type: "(event: GameEntityContactEvent) => boolean", optional: true }], returns: "Promise<GameEntityContactEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextEntityContact"]),
  entry("server.world.onPlayerPurchaseSuccess", "event", "world", "onPlayerPurchaseSuccess", handler("GamePurchaseSuccessEvent"), "server.world.events", "partial", ["server.GameWorld.onPlayerPurchaseSuccess"]),
  entry("server.world.nextPlayerPurchaseSuccess", "event", "world", "nextPlayerPurchaseSuccess", { parameters: [{ name: "filter", type: "(event: GamePurchaseSuccessEvent) => boolean", optional: true }], returns: "Promise<GamePurchaseSuccessEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextPlayerPurchaseSuccess"]),
  entry("server.world.onTick", "event", "world", "onTick", handler("GameTickEvent"), "server.world.events", "partial", ["server.GameWorld.onTick"]),
  entry("server.world.sound", "method", "world", "sound", { parameters: [{ name: "config", type: "GameSoundEffect|string" }], returns: "Sound" }, "server.world.entities", "partial", ["server.GameWorld.sound"]),
  entry("server.world.onPlayerJoin", "event", "world", "onPlayerJoin", handler("GameEntityEvent"), "server.world.events"),
  entry("server.world.onPlayerLeave", "event", "world", "onPlayerLeave", handler("GameEntityEvent"), "server.world.events"),
  entry("server.world.nextPlayerLeave", "event", "world", "nextPlayerLeave", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextPlayerLeave"]),
  entry("server.world.onEntityCreate", "event", "world", "onEntityCreate", handler("GameEntityEvent"), "server.world.events", "partial", ["server.GameWorld.onEntityCreate"]),
  entry("server.world.nextEntityCreate", "event", "world", "nextEntityCreate", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextEntityCreate"]),
  entry("server.world.onEntityDestroy", "event", "world", "onEntityDestroy", handler("GameEntityEvent"), "server.world.events", "partial", ["server.GameWorld.onEntityDestroy"]),
  entry("server.world.nextEntityDestroy", "event", "world", "nextEntityDestroy", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextEntityDestroy"]),
  entry("server.world.onVoxelContact", "event", "world", "onVoxelContact", handler("GameVoxelContactEvent"), "server.world.events", "partial"),
  entry("server.world.nextVoxelContact", "event", "world", "nextVoxelContact", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial"),
  entry("server.world.onVoxelSeparate", "event", "world", "onVoxelSeparate", handler("GameVoxelContactEvent"), "server.world.events", "partial"),
  entry("server.world.nextVoxelSeparate", "event", "world", "nextVoxelSeparate", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial"),
  entry("server.world.onContact", "event", "world", "onContact", handler("{tick,entity,other,axis,force,player,collider,normal,compatibility}"), "server.world.events"),
  entry("server.world.onContactSeparate", "event", "world", "onContactSeparate", handler("{tick,entity,other,axis,force,player,collider,normal,compatibility}"), "server.world.events"),
  entry("server.world.onTriggerEnter", "event", "world", "onTriggerEnter", handler("{player,trigger}"), "server.world.events"),
  entry("server.world.onTriggerLeave", "event", "world", "onTriggerLeave", handler("{player,trigger}"), "server.world.events"),
  entry("server.world.nextTick", "event", "world", "nextTick", { parameters: [{ name: "filter", type: "(event: GameTickEvent) => boolean", optional: true }], returns: "Promise<GameTickEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextTick"]),
  entry("server.world.nextPlayerJoin", "event", "world", "nextPlayerJoin", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameWorld.nextPlayerJoin"]),
  entry("server.world.say", "method", "world", "say", { parameters: [{ name: "message", type: "unknown" }], returns: "void" }, "server.world.chat"),
  entry("server.world.createEntity", "method", "world", "createEntity", { parameters: [{ name: "spec", type: "LocalEntitySpec" }], returns: "RuntimeEntity | null" }, "server.world.entities"),
  entityQuotaEntry(),
  entry("server.world.querySelector", "method", "world", "querySelector", { parameters: [{ name: "selector", type: "string" }], returns: "RuntimeEntity|null" }, "server.world.entities"),
  entry("server.world.querySelectorAll", "method", "world", "querySelectorAll", { parameters: [{ name: "selector", type: "string" }], returns: "RuntimeEntity[]" }, "server.world.entities"),
  entry("server.world.testSelector", "method", "world", "testSelector", { parameters: [{ name: "selector", type: "GameSelectorString" }, { name: "entity", type: "RuntimeEntity" }], returns: "boolean" }, "server.world.entities", "partial", ["server.GameWorld.testSelector"]),
  raycastEntry(),
  searchBoxEntry(),
  entry("server.world.addCollisionFilter", "method", "world", "addCollisionFilter", { parameters: [{ name: "aSelector", type: "GameSelectorString" }, { name: "bSelector", type: "GameSelectorString" }], returns: "void" }, "server.world.entities", "partial", ["server.GameWorld.addCollisionFilter"]),
  entry("server.world.removeCollisionFilter", "method", "world", "removeCollisionFilter", { parameters: [{ name: "aSelector", type: "GameSelectorString" }, { name: "bSelector", type: "GameSelectorString" }], returns: "void" }, "server.world.entities", "partial", ["server.GameWorld.removeCollisionFilter"]),
  entry("server.world.clearCollisionFilters", "method", "world", "clearCollisionFilters", { parameters: [], returns: "void" }, "server.world.entities", "partial", ["server.GameWorld.clearCollisionFilters"]),
  entry("server.world.collisionFilters", "method", "world", "collisionFilters", { parameters: [], returns: "string[][]" }, "server.world.entities", "partial", ["server.GameWorld.collisionFilters"]),
  entry("server.world.projectName", "property", "world", "projectName", { type: "string", readonly: true }, "server.world.config", "compatible", ["server.GameWorld.projectName"]),
  entry("server.world.addZone", "method", "world", "addZone", { parameters: [{ name: "config", type: "Partial<GameZone>" }], returns: "GameZone" }, "server.world.events", "partial", ["server.GameWorld.addZone"]),
  entry("server.world.removeZone", "method", "world", "removeZone", { parameters: [{ name: "zone", type: "GameZone" }], returns: "void" }, "server.world.events", "partial", ["server.GameWorld.removeZone"]),
  entry("server.world.zones", "method", "world", "zones", { parameters: [], returns: "GameZone[]" }, "server.world.events", "partial", ["server.GameWorld.zones"]),
  worldValueEntry("server.world.gravity", "gravity", "number"),
  worldValueEntry("server.world.airFriction", "airFriction", "number"),
  worldValueEntry("server.world.fogColor", "fogColor", "GameRGBColor"),
  entry("server.object.RuntimeEntity", "object", null, "RuntimeEntity", { properties: ["id", "kind", "position", "bounds", "collides", "fixed", "gravity", "mass", "friction", "restitution", "mesh", "meshInvisible", "meshScale", "meshOrientation", "meshOffset", "meshColor", "meshMetalness", "meshEmissive", "meshShininess", "showEntityName", "customName", "nameRadius", "nameColor", "tags", "destroyed", "enableInteract", "interactHint", "enableDamage", "showHealthBar", "hp", "maxHp"], methods: ["say", "lookAt", "rotateLocal", "scaleLocal", "destroy", "onDestroy", "nextDestroy", "onClick", "nextClick", "onInteract", "nextInteract", "onFluidEnter", "nextFluidEnter", "onFluidLeave", "nextFluidLeave", "onTakeDamage", "nextTakeDamage", "onDie", "nextDie", "hurt", "snapshot"] }, "server.world.entities"),
  entry("server.RuntimeEntity.id", "property", "RuntimeEntity", "id", { type: "string", readonly: true }, "server.world.entities"),
  entry("server.RuntimeEntity.kind", "property", "RuntimeEntity", "kind", { type: "string", readonly: true }, "server.world.entities"),
  entry("server.RuntimeEntity.position", "property", "RuntimeEntity", "position", { type: "Vector3", readonly: false }, "server.world.entities"),
  entry("server.RuntimeEntity.bounds", "property", "RuntimeEntity", "bounds", { type: "Vector3", readonly: true }, "server.world.entities", "partial", ["server.GameEntity.bounds"]),
  entry("server.RuntimeEntity.collides", "property", "RuntimeEntity", "collides", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.collides"]),
  entry("server.RuntimeEntity.fixed", "property", "RuntimeEntity", "fixed", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.fixed"]),
  entry("server.RuntimeEntity.gravity", "property", "RuntimeEntity", "gravity", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.gravity"]),
  entry("server.RuntimeEntity.mass", "property", "RuntimeEntity", "mass", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.mass"]),
  entry("server.RuntimeEntity.friction", "property", "RuntimeEntity", "friction", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.friction"]),
  entry("server.RuntimeEntity.restitution", "property", "RuntimeEntity", "restitution", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.restitution"]),
  entry("server.RuntimeEntity.mesh", "property", "RuntimeEntity", "mesh", { type: "string", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.mesh"]),
  entry("server.RuntimeEntity.meshInvisible", "property", "RuntimeEntity", "meshInvisible", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshInvisible"]),
  entry("server.RuntimeEntity.meshScale", "property", "RuntimeEntity", "meshScale", { type: "Vector3", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshScale"]),
  entry("server.RuntimeEntity.meshOrientation", "property", "RuntimeEntity", "meshOrientation", { type: "GameQuaternion", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshOrientation"]),
  entry("server.RuntimeEntity.lookAt", "method", "RuntimeEntity", "lookAt", { parameters: [{ name: "targetPosition", type: "GameVector3" }, { name: "meshFacing", type: "\"X\" | \"Y\" | \"Z\"", optional: true }, { name: "up", type: "GameVector3", optional: true }], returns: "void" }, "server.world.entities", "partial", ["server.GameEntity.lookAt"]),
  entry("server.RuntimeEntity.rotateLocal", "method", "RuntimeEntity", "rotateLocal", { parameters: [{ name: "localPosition", type: "GameVector3" }, { name: "axis", type: "\"X\" | \"Y\" | \"Z\"" }, { name: "rad", type: "number" }], returns: "void" }, "server.world.entities", "partial", ["server.GameEntity.rotateLocal"]),
  entry("server.RuntimeEntity.scaleLocal", "method", "RuntimeEntity", "scaleLocal", { parameters: [{ name: "localPosition", type: "GameVector3" }, { name: "v", type: "GameVector3" }], returns: "void" }, "server.world.entities", "partial", ["server.GameEntity.scaleLocal"]),
  entry("server.RuntimeEntity.meshOffset", "property", "RuntimeEntity", "meshOffset", { type: "Vector3", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshOffset"]),
  entry("server.RuntimeEntity.meshColor", "property", "RuntimeEntity", "meshColor", { type: "GameRGBAColor", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshColor"]),
  entry("server.RuntimeEntity.meshMetalness", "property", "RuntimeEntity", "meshMetalness", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshMetalness"]),
  entry("server.RuntimeEntity.meshEmissive", "property", "RuntimeEntity", "meshEmissive", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshEmissive"]),
  entry("server.RuntimeEntity.meshShininess", "property", "RuntimeEntity", "meshShininess", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.meshShininess"]),
  entry("server.RuntimeEntity.showEntityName", "property", "RuntimeEntity", "showEntityName", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.showEntityName"]),
  entry("server.RuntimeEntity.customName", "property", "RuntimeEntity", "customName", { type: "string", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.customName"]),
  entry("server.RuntimeEntity.nameRadius", "property", "RuntimeEntity", "nameRadius", { type: "number", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.nameRadius"]),
  entry("server.RuntimeEntity.nameColor", "property", "RuntimeEntity", "nameColor", { type: "GameRGBColor", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.nameColor"]),
  entry("server.RuntimeEntity.tags", "property", "RuntimeEntity", "tags", { type: "Set<string>", readonly: true }, "server.world.entities"),
  entry("server.RuntimeEntity.say", "method", "RuntimeEntity", "say", { parameters: [{ name: "message", type: "string" }, { name: "options", type: "Partial<{duration:number,hideFloat:boolean}>", optional: true }], returns: "void" }, "server.world.chat", "partial"),
  entry("server.RuntimeEntity.sound", "method", "RuntimeEntity", "sound", { parameters: [{ name: "config", type: "GameSoundEffect|string" }], returns: "Sound" }, "server.world.entities", "partial", ["server.GameEntity.sound"]),
  entry("server.RuntimePlayer.sound", "method", "RuntimePlayer", "sound", { parameters: [{ name: "config", type: "GameSoundEffect|string" }], returns: "Sound" }, "server.world.entities", "partial", ["server.GameEntity.sound"]),
  entry("server.Sound.resume", "method", "Sound", "resume", { parameters: [{ name: "currentTime", type: "number", optional: true }], returns: "void" }, "server.world.entities", "partial", ["shared.Sound.resume"]),
  entry("server.Sound.setCurrentTime", "method", "Sound", "setCurrentTime", { parameters: [{ name: "currentTime", type: "number" }], returns: "void" }, "server.world.entities", "partial", ["shared.Sound.setCurrentTime"]),
  entry("server.Sound.pause", "method", "Sound", "pause", { parameters: [], returns: "void" }, "server.world.entities", "partial", ["shared.Sound.pause"]),
  entry("server.Sound.stop", "method", "Sound", "stop", { parameters: [], returns: "void" }, "server.world.entities", "partial", ["shared.Sound.stop"]),
  entry("server.RuntimeEntity.destroyed", "property", "RuntimeEntity", "destroyed", { type: "boolean", readonly: true }, "server.world.entities", "partial"),
  entry("server.RuntimeEntity.enableDamage", "property", "RuntimeEntity", "enableDamage", { type: "boolean", readonly: false }, "server.world.entities", "partial"),
  entry("server.RuntimeEntity.showHealthBar", "property", "RuntimeEntity", "showHealthBar", { type: "boolean", readonly: false }, "server.world.entities", "partial"),
  entry("server.RuntimeEntity.hp", "property", "RuntimeEntity", "hp", { type: "number", readonly: false }, "server.world.entities", "partial"),
  entry("server.RuntimeEntity.maxHp", "property", "RuntimeEntity", "maxHp", { type: "number", readonly: false }, "server.world.entities", "partial"),
  entry("server.RuntimeEntity.destroy", "method", "RuntimeEntity", "destroy", { parameters: [], returns: "void" }, "server.world.entities", "partial", ["server.GameEntity.destroy"]),
  entry("server.RuntimeEntity.onDestroy", "event", "RuntimeEntity", "onDestroy", handler("GameEntityEvent"), "server.world.events", "partial", ["server.GameEntity.onDestroy"]),
  entry("server.RuntimeEntity.nextDestroy", "event", "RuntimeEntity", "nextDestroy", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextDestroy"]),
  entry("server.RuntimeEntity.onClick", "event", "RuntimeEntity", "onClick", handler("GameClickEvent"), "server.world.events", "partial", ["server.GameEntity.onClick"]),
  entry("server.RuntimeEntity.nextClick", "event", "RuntimeEntity", "nextClick", { parameters: [{ name: "filter", type: "(event: GameClickEvent) => boolean", optional: true }], returns: "Promise<GameClickEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextClick"]),
  entry("server.RuntimeEntity.enableInteract", "property", "RuntimeEntity", "enableInteract", { type: "boolean", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.enableInteract"]),
  entry("server.RuntimeEntity.interactHint", "property", "RuntimeEntity", "interactHint", { type: "string", readonly: false }, "server.world.entities", "partial", ["server.GameEntity.interactHint"]),
  entry("server.RuntimeEntity.isPlayer", "property", "RuntimeEntity", "isPlayer", { type: "boolean", readonly: true }, "server.world.entities", "compatible", ["server.GameEntity.isPlayer"]),
  entry("server.RuntimeEntity.player", "property", "RuntimeEntity", "player", { type: "GamePlayerEntity|undefined", readonly: true }, "server.world.entities", "partial", ["server.GameEntity.player"]),
  entry("server.RuntimeEntity.onInteract", "event", "RuntimeEntity", "onInteract", handler("GameInteractEvent"), "server.world.events", "partial", ["server.GameEntity.onInteract"]),
  entry("server.RuntimeEntity.nextInteract", "event", "RuntimeEntity", "nextInteract", { parameters: [{ name: "filter", type: "(event: GameInteractEvent) => boolean", optional: true }], returns: "Promise<GameInteractEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextInteract"]),
  entry("server.RuntimeEntity.onFluidEnter", "event", "RuntimeEntity", "onFluidEnter", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameEntity.onFluidEnter"]),
  entry("server.RuntimeEntity.nextFluidEnter", "event", "RuntimeEntity", "nextFluidEnter", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextFluidEnter"]),
  entry("server.RuntimeEntity.onFluidLeave", "event", "RuntimeEntity", "onFluidLeave", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameEntity.onFluidLeave"]),
  entry("server.RuntimeEntity.nextFluidLeave", "event", "RuntimeEntity", "nextFluidLeave", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextFluidLeave"]),
  entry("server.RuntimeEntity.onVoxelContact", "event", "RuntimeEntity", "onVoxelContact", handler("GameVoxelContactEvent"), "server.world.events", "partial", ["server.GameEntity.onVoxelContact"]),
  entry("server.RuntimeEntity.nextVoxelContact", "event", "RuntimeEntity", "nextVoxelContact", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextVoxelContact"]),
  entry("server.RuntimeEntity.onVoxelSeparate", "event", "RuntimeEntity", "onVoxelSeparate", handler("GameVoxelContactEvent"), "server.world.events", "partial", ["server.GameEntity.onVoxelSeparate"]),
  entry("server.RuntimeEntity.nextVoxelSeparate", "event", "RuntimeEntity", "nextVoxelSeparate", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextVoxelSeparate"]),
  entry("server.RuntimeEntity.onTakeDamage", "event", "RuntimeEntity", "onTakeDamage", handler("GameDamageEvent"), "server.world.events", "partial"),
  entry("server.RuntimeEntity.nextTakeDamage", "event", "RuntimeEntity", "nextTakeDamage", { parameters: [{ name: "filter", type: "(event: GameDamageEvent) => boolean", optional: true }], returns: "Promise<GameDamageEvent>" }, "server.world.events", "partial"),
  entry("server.RuntimeEntity.onDie", "event", "RuntimeEntity", "onDie", handler("GameDieEvent"), "server.world.events", "partial"),
  entry("server.RuntimeEntity.nextDie", "event", "RuntimeEntity", "nextDie", { parameters: [{ name: "filter", type: "(event: GameDieEvent) => boolean", optional: true }], returns: "Promise<GameDieEvent>" }, "server.world.events", "partial"),
  entry("server.RuntimeEntity.hurt", "method", "RuntimeEntity", "hurt", { parameters: [{ name: "amount", type: "number" }, { name: "options", type: "Partial<GameHurtOptions> | string", optional: true }], returns: "void" }, "server.world.events", "partial"),
  entry("server.RuntimeEntity.addTag", "method", "RuntimeEntity", "addTag", { parameters: [{ name: "tag", type: "string" }], returns: "void" }, "server.world.entities", "compatible", ["server.GameEntity.addTag"]),
  entry("server.RuntimeEntity.removeTag", "method", "RuntimeEntity", "removeTag", { parameters: [{ name: "tag", type: "string" }], returns: "void" }, "server.world.entities", "compatible", ["server.GameEntity.removeTag"]),
  entry("server.RuntimeEntity.hasTag", "method", "RuntimeEntity", "hasTag", { parameters: [{ name: "tag", type: "string" }], returns: "boolean" }, "server.world.entities", "compatible", ["server.GameEntity.hasTag"]),
  entry("server.RuntimeEntity.snapshot", "method", "RuntimeEntity", "snapshot", { parameters: [], returns: "RuntimeEntitySnapshot" }, "server.world.entities"),
  ...gameButtonTypeEntries(),
  ...gameCameraModeEntries(),
  entry("server.object.RuntimePlayer", "object", null, "RuntimePlayer", { properties: ["id", "userId", "userKey", "name", "position", "velocity", "bounds", "grounded", "health", "fluidContacts", "destroyed", "enableDamage", "showHealthBar", "hp", "maxHp", "walkButton", "crouchButton", "jumpButton", "action0Button", "action1Button", "enableAction0", "enableAction1", "enableJump", "enableDoubleJump", "enableCrouch", "spectator", "cameraYaw", "cameraPitch", "cameraMode", "cameraFovY", "moveState", "walkState", "canFly", "invisible", "showName", "showIndicator"], methods: ["destroy", "onDestroy", "nextDestroy", "onFluidEnter", "nextFluidEnter", "onFluidLeave", "nextFluidLeave", "applyImpulse", "hurt", "damage", "kick", "link", "sendMessage", "wearables", "addWearable", "removeWearable", "dialog", "cancelDialogs", "snapshot"] }, "server.player"),
  entry("server.RuntimePlayer.id", "property", "RuntimePlayer", "id", { type: "string", readonly: true }, "server.player"),
  entry("server.RuntimePlayer.userId", "property", "RuntimePlayer", "userId", { type: "string", readonly: true }, "server.player", "partial", ["server.GamePlayerEntity.userId"]),
  entry("server.RuntimePlayer.userKey", "property", "RuntimePlayer", "userKey", { type: "string", readonly: true }, "server.player", "partial", ["server.GamePlayerEntity.userKey"]),
  entry("server.RuntimePlayer.name", "property", "RuntimePlayer", "name", { type: "string", readonly: false }, "server.player.write"),
  entry("server.RuntimePlayer.position", "property", "RuntimePlayer", "position", { type: "Vector3", readonly: false }, "server.player.write"),
  entry("server.RuntimePlayer.velocity", "property", "RuntimePlayer", "velocity", { type: "Vector3", readonly: false }, "server.player.write"),
  entry("server.RuntimePlayer.bounds", "property", "RuntimePlayer", "bounds", { type: "Vector3", readonly: true }, "server.player", "partial", ["server.GameEntity.bounds"]),
  entry("server.RuntimePlayer.grounded", "property", "RuntimePlayer", "grounded", { type: "boolean", readonly: true }, "server.player"),
  entry("server.RuntimePlayer.health", "property", "RuntimePlayer", "health", { type: "number", readonly: true }, "server.player"),
  entry("server.RuntimePlayer.fluidContacts", "property", "RuntimePlayer", "fluidContacts", { type: "GameFluidContact[]", readonly: true }, "server.player", "partial", ["server.GameEntity.fluidContacts"]),
  entry("server.RuntimePlayer.onFluidEnter", "event", "RuntimePlayer", "onFluidEnter", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameEntity.onFluidEnter"]),
  entry("server.RuntimePlayer.nextFluidEnter", "event", "RuntimePlayer", "nextFluidEnter", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextFluidEnter"]),
  entry("server.RuntimePlayer.onFluidLeave", "event", "RuntimePlayer", "onFluidLeave", handler("GameFluidContactEvent"), "server.world.events", "partial", ["server.GameEntity.onFluidLeave"]),
  entry("server.RuntimePlayer.nextFluidLeave", "event", "RuntimePlayer", "nextFluidLeave", { parameters: [{ name: "filter", type: "(event: GameFluidContactEvent) => boolean", optional: true }], returns: "Promise<GameFluidContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextFluidLeave"]),
  entry("server.RuntimePlayer.onVoxelContact", "event", "RuntimePlayer", "onVoxelContact", handler("GameVoxelContactEvent"), "server.world.events", "partial", ["server.GameEntity.onVoxelContact"]),
  entry("server.RuntimePlayer.nextVoxelContact", "event", "RuntimePlayer", "nextVoxelContact", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextVoxelContact"]),
  entry("server.RuntimePlayer.onVoxelSeparate", "event", "RuntimePlayer", "onVoxelSeparate", handler("GameVoxelContactEvent"), "server.world.events", "partial", ["server.GameEntity.onVoxelSeparate"]),
  entry("server.RuntimePlayer.nextVoxelSeparate", "event", "RuntimePlayer", "nextVoxelSeparate", { parameters: [{ name: "filter", type: "(event: GameVoxelContactEvent) => boolean", optional: true }], returns: "Promise<GameVoxelContactEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextVoxelSeparate"]),
  entry("server.RuntimePlayer.destroyed", "property", "RuntimePlayer", "destroyed", { type: "boolean", readonly: true }, "server.player", "partial"),
  entry("server.RuntimePlayer.isPlayer", "property", "RuntimePlayer", "isPlayer", { type: "boolean", readonly: true }, "server.world.entities", "compatible", ["server.GameEntity.isPlayer"]),
  entry("server.RuntimePlayer.enableDamage", "property", "RuntimePlayer", "enableDamage", { type: "boolean", readonly: false }, "server.player.write", "partial"),
  entry("server.RuntimePlayer.showHealthBar", "property", "RuntimePlayer", "showHealthBar", { type: "boolean", readonly: false }, "server.player.write", "partial"),
  entry("server.RuntimePlayer.hp", "property", "RuntimePlayer", "hp", { type: "number", readonly: false }, "server.player.write", "partial"),
  entry("server.RuntimePlayer.maxHp", "property", "RuntimePlayer", "maxHp", { type: "number", readonly: false }, "server.player.write", "partial"),
  entry("server.RuntimePlayer.destroy", "method", "RuntimePlayer", "destroy", { parameters: [], returns: "void" }, "server.world.entities", "partial", ["server.GameEntity.destroy"]),
  entry("server.RuntimePlayer.onDestroy", "event", "RuntimePlayer", "onDestroy", handler("GameEntityEvent"), "server.world.events", "partial", ["server.GameEntity.onDestroy"]),
  entry("server.RuntimePlayer.nextDestroy", "event", "RuntimePlayer", "nextDestroy", { parameters: [{ name: "filter", type: "(event: GameEntityEvent) => boolean", optional: true }], returns: "Promise<GameEntityEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextDestroy"]),
  entry("server.RuntimePlayer.walkButton", "property", "RuntimePlayer", "walkButton", { type: "boolean", readonly: false }, "server.player", "compatible", ["server.GamePlayerEntity.walkButton"]),
  entry("server.RuntimePlayer.crouchButton", "property", "RuntimePlayer", "crouchButton", { type: "boolean", readonly: false }, "server.player", "partial"),
  entry("server.RuntimePlayer.jumpButton", "property", "RuntimePlayer", "jumpButton", { type: "boolean", readonly: false }, "server.player", "compatible", ["server.GamePlayerEntity.jumpButton"]),
  entry("server.RuntimePlayer.action0Button", "property", "RuntimePlayer", "action0Button", { type: "boolean", readonly: false }, "server.player", "compatible", ["server.GamePlayerEntity.action0Button"]),
  entry("server.RuntimePlayer.action1Button", "property", "RuntimePlayer", "action1Button", { type: "boolean", readonly: false }, "server.player", "compatible", ["server.GamePlayerEntity.action1Button"]),
  entry("server.RuntimePlayer.enableAction0", "property", "RuntimePlayer", "enableAction0", { type: "boolean", readonly: false }, "server.player.write", "partial", ["server.GamePlayerEntity.enableAction0"]),
  entry("server.RuntimePlayer.enableAction1", "property", "RuntimePlayer", "enableAction1", { type: "boolean", readonly: false }, "server.player.write", "partial", ["server.GamePlayerEntity.enableAction1"]),
  entry("server.RuntimePlayer.enableJump", "property", "RuntimePlayer", "enableJump", { type: "boolean", readonly: false }, "server.player.write", "partial", ["server.GamePlayerEntity.enableJump"]),
  entry("server.RuntimePlayer.enableDoubleJump", "property", "RuntimePlayer", "enableDoubleJump", { type: "boolean", readonly: false }, "server.player.write", "partial", ["server.GamePlayerEntity.enableDoubleJump"]),
  entry("server.RuntimePlayer.enableCrouch", "property", "RuntimePlayer", "enableCrouch", { type: "boolean", readonly: false }, "server.player.write", "partial"),
  localPlayerStateEntry("spectator", "boolean"),
  localPlayerStateEntry("cameraYaw", "number"),
  localPlayerStateEntry("cameraPitch", "number"),
  localPlayerStateEntry("cameraMode", "GameCameraMode"),
  localPlayerStateEntry("cameraFovY", "number"),
  localPlayerStateEntry("moveState", "string"),
  localPlayerStateEntry("walkState", "GamePlayerWalkState"),
  localPlayerStateEntry("canFly", "boolean"),
  localPlayerStateEntry("invisible", "boolean"),
  localPlayerStateEntry("showName", "boolean"),
  localPlayerStateEntry("showIndicator", "boolean"),
  playerPublicNumberEntry("walkSpeed"),
  playerPublicNumberEntry("runSpeed"),
  playerPublicNumberEntry("runAcceleration"),
  playerPublicNumberEntry("jumpPower"),
  playerPublicNumberEntry("jumpSpeedFactor"),
  playerPublicNumberEntry("jumpAccelerationFactor"),
  playerPublicNumberEntry("doubleJumpPower"),
  playerPublicNumberEntry("crouchSpeed"),
  playerPublicNumberEntry("crouchAcceleration"),
  playerPublicNumberEntry("flySpeed"),
  playerPublicNumberEntry("flyAcceleration"),
  playerPublicNumberEntry("swimAcceleration"),
  playerPublicNumberEntry("swimSpeed"),
  playerPublicNumberEntry("walkAcceleration"),
  entry("server.RuntimePlayer.color", "property", "RuntimePlayer", "color", { type: "GameRGBColor", readonly: false }, "server.player.write", "partial", ["server.GamePlayer.color"]),
  entry("server.RuntimePlayer.spawnPoint", "property", "RuntimePlayer", "spawnPoint", { type: "GameVector3", readonly: false }, "server.player.write", "partial", ["server.GamePlayer.spawnPoint"]),
  entry("server.RuntimePlayer.onRespawn", "event", "RuntimePlayer", "onRespawn", handler("GameRespawnEvent"), "server.world.events", "partial", ["server.GamePlayer.onRespawn"]),
  entry("server.RuntimePlayer.nextRespawn", "event", "RuntimePlayer", "nextRespawn", { parameters: [{ name: "filter", type: "(event: GameRespawnEvent) => boolean", optional: true }], returns: "Promise<GameRespawnEvent>" }, "server.world.events", "partial", ["server.GamePlayer.nextRespawn"]),
  entry("server.RuntimePlayer.onClick", "event", "RuntimePlayer", "onClick", handler("GameClickEvent"), "server.world.events", "partial", ["server.GameEntity.onClick"]),
  entry("server.RuntimePlayer.nextClick", "event", "RuntimePlayer", "nextClick", { parameters: [{ name: "filter", type: "(event: GameClickEvent) => boolean", optional: true }], returns: "Promise<GameClickEvent>" }, "server.world.events", "partial", ["server.GameEntity.nextClick"]),
  entry("server.RuntimePlayer.onPress", "event", "RuntimePlayer", "onPress", handler("GameInputEvent"), "server.world.events", "compatible", ["server.GamePlayer.onPress"]),
  entry("server.RuntimePlayer.nextPress", "event", "RuntimePlayer", "nextPress", { parameters: [{ name: "filter", type: "(event: GameInputEvent) => boolean", optional: true }], returns: "Promise<GameInputEvent>" }, "server.world.events", "compatible", ["server.GamePlayer.nextPress"]),
  entry("server.RuntimePlayer.onRelease", "event", "RuntimePlayer", "onRelease", handler("GameInputEvent"), "server.world.events", "compatible", ["server.GamePlayer.onRelease"]),
  entry("server.RuntimePlayer.nextRelease", "event", "RuntimePlayer", "nextRelease", { parameters: [{ name: "filter", type: "(event: GameInputEvent) => boolean", optional: true }], returns: "Promise<GameInputEvent>" }, "server.world.events", "compatible", ["server.GamePlayer.nextRelease"]),
  entry("server.RuntimePlayer.onKeyDown", "event", "RuntimePlayer", "onKeyDown", handler("GameKeyBoardEvent"), "server.world.events", "partial", ["server.GamePlayerEntity.onKeyDown"]),
  entry("server.RuntimePlayer.onKeyUp", "event", "RuntimePlayer", "onKeyUp", handler("GameKeyBoardEvent"), "server.world.events", "partial", ["server.GamePlayerEntity.onKeyUp"]),
  entry("server.RuntimePlayer.onTakeDamage", "event", "RuntimePlayer", "onTakeDamage", handler("GameDamageEvent"), "server.world.events", "partial"),
  entry("server.RuntimePlayer.nextTakeDamage", "event", "RuntimePlayer", "nextTakeDamage", { parameters: [{ name: "filter", type: "(event: GameDamageEvent) => boolean", optional: true }], returns: "Promise<GameDamageEvent>" }, "server.world.events", "partial"),
  entry("server.RuntimePlayer.onDie", "event", "RuntimePlayer", "onDie", handler("GameDieEvent"), "server.world.events", "partial"),
  entry("server.RuntimePlayer.nextDie", "event", "RuntimePlayer", "nextDie", { parameters: [{ name: "filter", type: "(event: GameDieEvent) => boolean", optional: true }], returns: "Promise<GameDieEvent>" }, "server.world.events", "partial"),
  entry("server.RuntimePlayer.forceRespawn", "method", "RuntimePlayer", "forceRespawn", { parameters: [], returns: "void" }, "server.player.write", "partial", ["server.GamePlayer.forceRespawn"]),
  entry("server.RuntimePlayer.kick", "method", "RuntimePlayer", "kick", { parameters: [], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.kick"]),
  entry("server.RuntimePlayer.link", "method", "RuntimePlayer", "link", { parameters: [{ name: "href", type: "URL" }, { name: "options", type: "Partial", optional: true }], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.link"]),
  entry("server.RuntimePlayer.setSkinByName", "method", "RuntimePlayer", "setSkinByName", { parameters: [{ name: "skinName", type: "string" }], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.setSkinByName"]),
  entry("server.RuntimePlayer.resetToDefaultSkin", "method", "RuntimePlayer", "resetToDefaultSkin", { parameters: [], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.resetToDefaultSkin"]),
  entry("server.RuntimePlayer.clearSkin", "method", "RuntimePlayer", "clearSkin", { parameters: [], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.clearSkin"]),
  entry("server.RuntimePlayer.applyImpulse", "method", "RuntimePlayer", "applyImpulse", { parameters: [{ name: "impulse", type: "Vector3Like" }], returns: "void" }, "server.player.write"),
  entry("server.RuntimePlayer.hurt", "method", "RuntimePlayer", "hurt", { parameters: [{ name: "amount", type: "number" }, { name: "options", type: "Partial<GameHurtOptions> | string", optional: true }], returns: "void" }, "server.world.events", "partial"),
  entry("server.RuntimePlayer.addTag", "method", "RuntimePlayer", "addTag", { parameters: [{ name: "tag", type: "string" }], returns: "void" }, "server.world.entities", "compatible", ["server.GameEntity.addTag"]),
  entry("server.RuntimePlayer.removeTag", "method", "RuntimePlayer", "removeTag", { parameters: [{ name: "tag", type: "string" }], returns: "void" }, "server.world.entities", "compatible", ["server.GameEntity.removeTag"]),
  entry("server.RuntimePlayer.hasTag", "method", "RuntimePlayer", "hasTag", { parameters: [{ name: "tag", type: "string" }], returns: "boolean" }, "server.world.entities", "compatible", ["server.GameEntity.hasTag"]),
  entry("server.RuntimePlayer.damage", "method", "RuntimePlayer", "damage", { parameters: [{ name: "amount", "type": "number" }], returns: "number" }, "server.player.write"),
  entry("server.RuntimePlayer.sendMessage", "method", "RuntimePlayer", "sendMessage", { parameters: [{ name: "message", type: "unknown" }], returns: "void" }, "server.world.chat"),
  entry("server.RuntimePlayer.wearables", "method", "RuntimePlayer", "wearables", { parameters: [{ name: "bodyPart", type: "GameBodyPart" }], returns: "GameWearable[]" }, "server.player", "partial", ["server.GamePlayerEntity.wearables"]),
  entry("server.RuntimePlayer.addWearable", "method", "RuntimePlayer", "addWearable", { parameters: [{ name: "config", type: "Partial<GameWearable>" }], returns: "GameWearable" }, "server.player.write", "partial", ["server.GamePlayerEntity.addWearable"]),
  entry("server.RuntimePlayer.removeWearable", "method", "RuntimePlayer", "removeWearable", { parameters: [{ name: "config", type: "GameWearable" }], returns: "void" }, "server.player.write", "partial", ["server.GamePlayerEntity.removeWearable"]),
  entry("server.RuntimePlayer.dialog", "method", "RuntimePlayer", "dialog", { parameters: [{ name: "config", type: "Partial<GameDialogCall>" }], returns: "Promise<GameDialogResult>" }, "server.player", "partial", ["server.GamePlayerEntity.dialog"]),
  entry("server.RuntimePlayer.cancelDialogs", "method", "RuntimePlayer", "cancelDialogs", { parameters: [], returns: "void" }, "server.player", "partial", ["server.GamePlayerEntity.cancelDialogs"]),
  entry("server.RuntimePlayer.snapshot", "method", "RuntimePlayer", "snapshot", { parameters: [], returns: "RuntimePlayerSnapshot" }, "server.player"),
  voxelEntry("server.global.voxels", "global", "global", "voxels", { type: "GameVoxels" }),
  voxelEntry("server.GameVoxels.getVoxelId", "method", "GameVoxels", "getVoxelId", {
    parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }],
    returns: "number",
  }),
  voxelEntry("server.GameVoxels.setVoxelId", "method", "GameVoxels", "setVoxelId", {
    parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }, { name: "voxel", type: "number" }],
    returns: "number",
  }),
  voxelEntry("server.GameVoxels.id", "method", "GameVoxels", "id", {
    parameters: [{ name: "name", type: "string" }],
    returns: "number",
  }),
  voxelEntry("server.GameVoxels.setVoxel", "method", "GameVoxels", "setVoxel", {
    parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }, { name: "voxel", type: "number|string" }, { name: "rotation", type: "number|string", optional: true }],
    returns: "number",
  }),
  voxelEntry("server.GameVoxels.getVoxel", "method", "GameVoxels", "getVoxel", {
    parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }], returns: "number",
  }, 2),
  voxelEntry("server.GameVoxels.name", "method", "GameVoxels", "name", {
    parameters: [{ name: "id", type: "number" }], returns: "string",
  }, 2),
  voxelEntry("server.GameVoxels.getVoxelRotation", "method", "GameVoxels", "getVoxelRotation", {
    parameters: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }], returns: "number",
  }, 2),
  voxelEntry("server.GameVoxels.shape", "property", "GameVoxels", "shape", { type: "GameVector3", readonly: true }, 2),
  voxelEntry("server.GameVoxels.VoxelTypes", "property", "GameVoxels", "VoxelTypes", { type: "string[]", readonly: true }, 2),
  entry("server.remoteChannel.onClientEvent", "event", "remoteChannel", "onClientEvent", handler("{player,event}"), "server.remote-channel", "bridged"),
  entry("server.remoteChannel.nextClientEvent", "event", "remoteChannel", "nextClientEvent", { parameters: [], returns: "Promise<{player,event}>" }, "server.remote-channel", "bridged"),
  entry("server.global.gui", "object", null, "gui", { type: "GameGUI" }, "server.gui", "partial"),
  guiEntry("server.GameGUI.init", "method", "init", { parameters: [{ name: "entity", type: "GamePlayerEntity" }, { name: "config", type: "GUIConfig" }], returns: "Promise<void>" }),
  guiEntry("server.GameGUI.show", "method", "show", { parameters: [{ name: "entity", type: "GamePlayerEntity" }, { name: "name", type: "string" }, { name: "allowMultiple", type: "boolean", optional: true }], returns: "Promise<void>" }),
  guiEntry("server.GameGUI.remove", "method", "remove", { parameters: [{ name: "entity", type: "GamePlayerEntity" }, { name: "selector", type: "string" }], returns: "Promise<void>" }),
  guiEntry("server.GameGUI.getAttribute", "method", "getAttribute", { parameters: [{ name: "entity", type: "GamePlayerEntity" }, { name: "selector", type: "string" }, { name: "name", type: "string" }], returns: "Promise<any>" }),
  guiEntry("server.GameGUI.setAttribute", "method", "setAttribute", { parameters: [{ name: "entity", type: "GamePlayerEntity" }, { name: "selector", type: "string" }, { name: "name", type: "string" }, { name: "value", type: "any" }], returns: "Promise<void>" }),
  guiEntry("server.GameGUI.onMessage", "event", "onMessage", handler("GameGUIEvent")),
  guiEntry("server.GameGUI.ui", "property", "ui", { type: "GameGUIElementFactory", readonly: true }),
  httpEntry("server.GameHttpAPI.fetch", "method", "GameHttpAPI", "fetch", { parameters: [{ name: "url", type: "URL|string" }, { name: "options", type: "Partial<GameHttpRequestOptions>", optional: true }], returns: "Promise<GameHttpFetchResponse>" }),
  httpEntry("server.GameHttpFetchResponse.ok", "property", "GameHttpFetchResponse", "ok", { type: "boolean", readonly: true }),
  httpEntry("server.GameHttpFetchResponse.status", "property", "GameHttpFetchResponse", "status", { type: "number", readonly: true }),
  httpEntry("server.GameHttpFetchResponse.statusText", "property", "GameHttpFetchResponse", "statusText", { type: "string", readonly: true }),
  httpEntry("server.GameHttpFetchResponse.headers", "property", "GameHttpFetchResponse", "headers", { type: "Record<string,string|string[]>" }),
  httpEntry("server.GameHttpFetchResponse.json", "method", "GameHttpFetchResponse", "json", { parameters: [], returns: "Promise<unknown>" }),
  httpEntry("server.GameHttpFetchResponse.text", "method", "GameHttpFetchResponse", "text", { parameters: [], returns: "Promise<string>" }),
  httpEntry("server.GameHttpFetchResponse.arrayBuffer", "method", "GameHttpFetchResponse", "arrayBuffer", { parameters: [], returns: "Promise<ArrayBuffer>" }),
  httpEntry("server.GameHttpFetchResponse.close", "method", "GameHttpFetchResponse", "close", { parameters: [], returns: "Promise<void>" }),
  entry("server.global.storage", "object", null, "storage", { type: "GameStorage" }, "server.storage", "partial"),
  entry("server.object.RuntimeGameStorage", "object", null, "RuntimeGameStorage", { methods: ["getDataStorage", "getGroupStorage"] }, "server.storage", "partial", ["server.object.GameStorage"]),
  storageEntry("server.GameStorage.getDataStorage", "getDataStorage"),
  storageEntry("server.GameStorage.getGroupStorage", "getGroupStorage"),
  entry("server.object.RuntimeDataStorage", "object", null, "RuntimeDataStorage", { properties: ["key"], methods: ["set", "update", "get", "increment", "list", "remove", "destroy"] }, "server.storage", "partial"),
  entry("server.RuntimeDataStorage.key", "property", "RuntimeDataStorage", "key", { type: "string", readonly: true }, "server.storage", "partial", ["server.GameDataStorage.key"]),
  entry("server.RuntimeDataStorage.set", "method", "RuntimeDataStorage", "set", { parameters: [{ name: "key", type: "string" }, { name: "value", type: "JSONValue" }], returns: "Promise<void>" }, "server.storage", "partial", ["server.GameDataStorage.set"]),
  entry("server.RuntimeDataStorage.update", "method", "RuntimeDataStorage", "update", { parameters: [{ name: "key", type: "string" }, { name: "handler", type: "(prevValue: ReturnValue) => JSONValue" }], returns: "Promise<void>" }, "server.storage", "partial", ["server.GameDataStorage.update"]),
  entry("server.RuntimeDataStorage.get", "method", "RuntimeDataStorage", "get", { parameters: [{ name: "key", type: "string" }], returns: "Promise<ReturnValue>" }, "server.storage", "partial", ["server.GameDataStorage.get"]),
  entry("server.RuntimeDataStorage.increment", "method", "RuntimeDataStorage", "increment", { parameters: [{ name: "key", type: "string" }, { name: "value", type: "number", optional: true }], returns: "Promise<number>" }, "server.storage", "partial", ["server.GameDataStorage.increment"]),
  entry("server.RuntimeDataStorage.list", "method", "RuntimeDataStorage", "list", { parameters: [{ name: "options", type: "Partial<ListPageOptions>", optional: true }], returns: "Promise<RuntimeQueryList>" }, "server.storage", "partial", ["server.GameDataStorage.list"]),
  entry("server.RuntimeDataStorage.remove", "method", "RuntimeDataStorage", "remove", { parameters: [{ name: "key", type: "string" }], returns: "Promise<ReturnValue>" }, "server.storage", "partial", ["server.GameDataStorage.remove"]),
  entry("server.RuntimeDataStorage.destroy", "method", "RuntimeDataStorage", "destroy", { parameters: [], returns: "Promise<void>" }, "server.storage", "partial", ["server.GameDataStorage.destroy"]),
  entry("server.object.RuntimeQueryList", "object", null, "RuntimeQueryList", { properties: ["isLastPage"], methods: ["getCurrentPage", "nextPage"] }, "server.storage", "partial"),
  entry("server.RuntimeQueryList.isLastPage", "property", "RuntimeQueryList", "isLastPage", { type: "boolean", readonly: false }, "server.storage", "partial", ["server.QueryList.isLastPage"]),
  entry("server.RuntimeQueryList.getCurrentPage", "method", "RuntimeQueryList", "getCurrentPage", { parameters: [], returns: "ReturnValue[]" }, "server.storage", "partial", ["server.QueryList.getCurrentPage"]),
  entry("server.RuntimeQueryList.nextPage", "method", "RuntimeQueryList", "nextPage", { parameters: [], returns: "Promise<void>" }, "server.storage", "partial", ["server.QueryList.nextPage"]),
  ...zoneEntries(),
  entry("server.remoteChannel.onServerEvent", "event", "remoteChannel", "onServerEvent", handler("{tick,entity,args}"), "server.remote-channel", "bridged"),
  entry("server.remoteChannel.sendClientEvent", "method", "remoteChannel", "sendClientEvent", {
    parameters: [{ name: "players", type: "RuntimePlayer | RuntimePlayer[]" }, { name: "event", type: "any" }],
    returns: "void",
  }, "server.remote-channel", "bridged"),
  entry("server.remoteChannel.broadcastClientEvent", "method", "remoteChannel", "broadcastClientEvent", {
    parameters: [{ name: "event", type: "any" }],
    returns: "void",
  }, "server.remote-channel", "bridged"),
];

const adapters = [
  adapter("server.world.currentTick", "server.GameWorld.currentTick", "compatible", []),
  adapter("server.world.onRespawn", "server.GameWorld.onRespawn", "partial", ["Local forceRespawn emits the recovered event shape; automatic engine respawn triggers remain unverified."]),
  adapter("server.world.nextRespawn", "server.GameWorld.nextRespawn", "partial", ["The recovered optional filter is implemented; automatic engine respawn triggers remain unverified."]),
  adapter("server.world.onTakeDamage", "server.GameWorld.onTakeDamage", "partial", ["Script-produced GameEntity.hurt calls preserve enableDamage, healing, attacker, damageType, hp transitions, recovered GameDamageEvent fields, native replica.damage state, and game-net hurt effects; non-script engine damage ingress remains unverified."]),
  adapter("server.world.nextTakeDamage", "server.GameWorld.nextTakeDamage", "partial", ["The recovered optional filter, script-produced hurt events, and native client damage transport are implemented; non-script engine damage ingress remains unverified."]),
  adapter("server.world.onDie", "server.GameWorld.onDie", "partial", ["Script-produced hurt emits one GameDieEvent when hp crosses from positive to zero and queues the native game-net die effect; non-script engine death transitions remain unverified."]),
  adapter("server.world.onChat", "server.GameWorld.onChat", "partial", ["The recovered GameChatEvent fields are represented by the Runtime signal shell.", "ScriptShell consumes chatEvents.chats, but the recovered Player game-chat client-to-server surface only carries administrator noticeMessage {title,detail}; no Player chat producer is recovered, so Capability Manifest blocks dependent projects."]),
  adapter("server.world.nextChat", "server.GameWorld.nextChat", "partial", ["The recovered optional filter resolves the same typed signal payload.", "ScriptShell consumes chatEvents.chats, but no matching Player/browser producer is recovered, so Capability Manifest blocks dependent projects."]),
  adapter("server.world.onPress", "server.GameWorld.onPress", "compatible", []),
  adapter("server.world.nextPress", "server.GameWorld.nextPress", "compatible", []),
  adapter("server.world.onClick", "server.GameWorld.onClick", "partial", ["The game-net bridge reconstructs the declared GameClickEvent fields, applies the recovered PlayerFlags mask, and dispatches the same event to world and the clicked entity in historical order.", "Non-player clicks require an authoritative backend entity binding; the latest capture still has two entities without sufficient model evidence for projection."]),
  adapter("server.world.onInteract", "server.GameWorld.onInteract", "partial", ["The entity-interact bridge preserves the recovered {tick, entity, targetEntity} event shape and target-before-world dispatch order for Player messages that name a mapped authoritative entity.", "The local backend still marks replica.interactive unused, so Script Runtime enableInteract writes do not create browser prompts, radius checks, target selection, or interaction sounds."]),
  adapter("server.world.nextInteract", "server.GameWorld.nextInteract", "partial", ["The optional filter and recovered event payload are supported for mapped authoritative targets.", "The browser interaction component projection remains unavailable locally."]),
  adapter("server.world.onRelease", "server.GameWorld.onRelease", "compatible", []),
  adapter("server.world.nextRelease", "server.GameWorld.nextRelease", "compatible", []),
  adapter("server.world.onFluidEnter", "server.GameWorld.onFluidEnter", "partial", ["BlockInfo fluid ids, per-tick body overlap transitions, recovered {tick,entity,voxel} fields, and world-before-entity dispatch are implemented.", "Native fluid solver timing, buoyancy, drag, and producer-side volume fraction remain unrecovered."]),
  adapter("server.world.nextFluidEnter", "server.GameWorld.nextFluidEnter", "partial", ["The recovered optional filter resolves the same locally produced typed fluid-enter event.", "Native fluid solver timing, buoyancy, drag, and producer-side volume fraction remain unrecovered."]),
  adapter("server.world.onFluidLeave", "server.GameWorld.onFluidLeave", "partial", ["BlockInfo fluid ids, per-tick body overlap transitions, recovered {tick,entity,voxel} fields, and world-before-entity dispatch are implemented.", "Native fluid solver timing, buoyancy, drag, and producer-side volume fraction remain unrecovered."]),
  adapter("server.world.nextFluidLeave", "server.GameWorld.nextFluidLeave", "partial", ["The recovered optional filter resolves the same locally produced typed fluid-leave event.", "Native fluid solver timing, buoyancy, drag, and producer-side volume fraction remain unrecovered."]),
  adapter("server.world.nextDie", "server.GameWorld.nextDie", "partial", ["The recovered optional filter resolves script-produced death events; automatic native death-state production remains unverified."]),
  adapter("server.world.onEntityContact", "server.GameWorld.onEntityContact", "partial", ["The event surface is dispatchable; full native GameEntityContactEvent production remains covered separately by the contact model."]),
  adapter("server.world.nextEntityContact", "server.GameWorld.nextEntityContact", "partial", ["The optional filter exists, but the local physics runtime has no bodyContact producer carrying two mapped entities."]),
  adapter("server.world.onPlayerPurchaseSuccess", "server.GameWorld.onPlayerPurchaseSuccess", "partial", ["The recovered public event fields are tick, userId, productId, and orderId; ScriptShell separately acknowledges the internal messageId after dispatch.", "The Player market protocol only receives openMarketplace and exposes no client-to-server result message; no purchase-success producer or Server Runtime ingress is recovered, so Capability Manifest blocks dependent projects."]),
  adapter("server.world.nextPlayerPurchaseSuccess", "server.GameWorld.nextPlayerPurchaseSuccess", "partial", ["The optional filter resolves the typed signal payload if an event is supplied internally.", "No browser-to-backend purchase-success producer or Server Runtime ingress is recovered locally, so Capability Manifest blocks projects that depend on this event."]),
  adapter("server.world.onTick", "server.GameWorld.onTick", "partial", ["The recovered Date.now wall-clock elapsedTimeMS formula and skip = tick - prevTick > 1 formula are implemented.", "The local scheduler advances one tick per callback and has no authoritative multi-tick frame input, so native delayed-frame catch-up behavior remains unavailable."]),
  adapter("server.world.onPlayerJoin", "server.GameWorld.onPlayerJoin", "partial", ["Event fields now match GameEntityEvent, but RuntimePlayer is still only a subset of GamePlayerEntity."]),
  adapter("server.world.onPlayerLeave", "server.GameWorld.onPlayerLeave", "partial", ["Event fields now match GameEntityEvent, but RuntimePlayer is still only a subset of GamePlayerEntity."]),
  adapter("server.world.nextPlayerLeave", "server.GameWorld.nextPlayerLeave", "partial", ["The recovered optional filter resolves the same local GameEntityEvent; RuntimePlayer remains a subset of GamePlayerEntity."]),
  adapter("server.world.onVoxelContact", "server.GameWorld.onVoxelContact", "partial", ["The recovered impulse-derived GameVoxelContactEvent force is implemented; RuntimePlayer is still only a subset of GamePlayerEntity."]),
  adapter("server.world.nextVoxelContact", "server.GameWorld.nextVoxelContact", "partial", ["The recovered optional filter resolves the same locally produced GameVoxelContactEvent; RuntimePlayer remains a subset and native rigid-body production is not claimed."]),
  adapter("server.world.onVoxelSeparate", "server.GameWorld.onVoxelSeparate", "partial", ["The recovered impulse-derived GameVoxelContactEvent force is implemented; RuntimePlayer is still only a subset of GamePlayerEntity."]),
  adapter("server.world.nextVoxelSeparate", "server.GameWorld.nextVoxelSeparate", "partial", ["The recovered optional filter resolves the same locally produced GameVoxelContactEvent; RuntimePlayer remains a subset and native rigid-body production is not claimed."]),
  adapter("server.world.nextTick", "server.GameWorld.nextTick", "partial", ["The recovered optional filter and GameTickEvent resolution are implemented; elapsedTimeMS, skip, and delayed-tick timing retain the same gaps as world.onTick."]),
  adapter("server.world.nextPlayerJoin", "server.GameWorld.nextPlayerJoin", "partial", ["The recovered optional filter and GameEntityEvent fields are implemented; RuntimePlayer remains a subset of GamePlayerEntity."]),
  adapter("server.world.say", "server.GameWorld.say", "partial", ["Broadcast delivery now uses the recovered Player game-chat.log packet through connected MuDB sessions.", "Destroyed sender/receiver endpoints are silently dropped and player removal follows the recovered leave/destroy ordering.", "The recovered FIFO prefix/overflow/tick-drain algorithm and ordered Runtime-to-backend overflow batch are implemented with an evidence-deferred nullable limit; the numeric MAX_CHATS_PER_TICK value and Player display acknowledgement remain unavailable."]),
  adapter("server.world.createEntity", "server.GameWorld.createEntity", "partial", ["Creation remains synchronous, obeys the recovered non-player entityLimit check, returns null at capacity, and emits the recovered entity-create lifecycle event. Captured mesh bindings can create an authoritative browser/backend replica with documented transform and model/body fields; unknown meshes deliberately remain script-local rather than receiving a fabricated placeholder.", "Generic native gravity, collision response, and in-place Vector3 mutation replication are still unverified."]),
  adapter("server.world.entityQuota", "server.GameWorld.entityQuota", "compatible", []),
  adapter("server.world.onEntityCreate", "server.GameWorld.onEntityCreate", "partial", ["The recovered GameEntityEvent is emitted for local script-created entities; independent native engine creation is not bridged."]),
  adapter("server.world.nextEntityCreate", "server.GameWorld.nextEntityCreate", "partial", ["The recovered optional filter resolves local script-created entity events; independent native engine creation is not bridged."]),
  adapter("server.world.onEntityDestroy", "server.GameWorld.onEntityDestroy", "partial", ["The recovered GameEntityEvent is emitted for local script destruction; independent native engine destruction is not bridged."]),
  adapter("server.world.nextEntityDestroy", "server.GameWorld.nextEntityDestroy", "partial", ["The recovered optional filter resolves local script destruction events; independent native engine destruction is not bridged."]),
  adapter("server.world.querySelector", "server.GameWorld.querySelector", "partial", ["Recovered ParsedSelector coercion, comma-union, universal/entity, player, id, tag, destroyed filtering, and first-match order are implemented.", "The historical testComponent implementation for component names other than player/entity was not recovered and remains unsupported."]),
  adapter("server.world.querySelectorAll", "server.GameWorld.querySelectorAll", "partial", ["Recovered ParsedSelector coercion, comma-union, universal/entity, player, id, tag, destroyed filtering, entity order, and fresh mutable result arrays are implemented.", "The historical testComponent implementation for component names other than player/entity was not recovered and remains unsupported."]),
  adapter("server.world.testSelector", "server.GameWorld.testSelector", "partial", ["The documented and historical (selector, entity) order plus recovered ParsedSelector semantics are implemented.", "Non-player/entity component names remain unsupported because testComponent was not recovered."]),
  adapter("server.world.raycast", "server.GameWorld.raycast", "partial", ["Voxel DDA, fluid filtering, selector filtering, player/entity AABBs, recovered result fields, the historical Infinity maxDistance default, and zero-direction preservation are implemented and exercised by conformance tests and the BedWars corpus.", "The recovered engine raycastBoxes implementation and body-orientation semantics are not available locally; entity intersections therefore remain an explicit AABB approximation. GameWorld.useOBB is a separate world-physics property, not a GameRaycastOptions field."]),
  adapter("server.RuntimeRaycastResult.hit", "server.GameRaycastResult.hit", "partial", ["The local result preserves hit/no-hit state; the underlying entity intersection remains an AABB approximation."]),
  adapter("server.RuntimeRaycastResult.hitEntity", "server.GameRaycastResult.hitEntity", "partial", ["The local result exposes RuntimeEntity or RuntimePlayer for mapped entity hits; historical engine entity identity and oriented bounds behavior remain unrecovered."]),
  adapter("server.RuntimeRaycastResult.hitVoxel", "server.GameRaycastResult.hitVoxel", "partial", ["The local result exposes the resolved voxel id; historical engine traversal edge cases remain unrecovered."]),
  adapter("server.RuntimeRaycastResult.origin", "server.GameRaycastResult.origin", "partial", ["The local result preserves the requested origin through the local Vector3 compatibility type."]),
  adapter("server.RuntimeRaycastResult.direction", "server.GameRaycastResult.direction", "partial", ["The local result preserves the requested direction through the local Vector3 compatibility type."]),
  adapter("server.RuntimeRaycastResult.distance", "server.GameRaycastResult.distance", "partial", ["The local result exposes the nearest local intersection distance; historical oriented-body semantics remain unrecovered."]),
  adapter("server.RuntimeRaycastResult.hitPosition", "server.GameRaycastResult.hitPosition", "partial", ["The local result exposes the nearest local intersection position; historical oriented-body semantics remain unrecovered."]),
  adapter("server.RuntimeRaycastResult.normal", "server.GameRaycastResult.normal", "partial", ["The local result exposes the resolved local collision normal; historical engine normal conventions remain unrecovered."]),
  adapter("server.RuntimeRaycastResult.voxelIndex", "server.GameRaycastResult.voxelIndex", "partial", ["The local result exposes the voxel index for voxel hits and preserves the documented no-hit zero vector."]),
  adapter("server.RuntimeVoxelContactEvent.tick", "server.GameVoxelContactEvent.tick", "partial", ["The local event preserves the dispatch tick; contact producer coverage remains limited to the local collider path."]),
  adapter("server.RuntimeVoxelContactEvent.entity", "server.GameVoxelContactEvent.entity", "partial", ["The local event exposes the contacting RuntimeEntity or RuntimePlayer; historical engine identity semantics remain unrecovered."]),
  adapter("server.RuntimeVoxelContactEvent.x", "server.GameVoxelContactEvent.x", "partial", ["The local event exposes the contacted voxel x coordinate from local collision resolution."]),
  adapter("server.RuntimeVoxelContactEvent.y", "server.GameVoxelContactEvent.y", "partial", ["The local event exposes the contacted voxel y coordinate from local collision resolution."]),
  adapter("server.RuntimeVoxelContactEvent.z", "server.GameVoxelContactEvent.z", "partial", ["The local event exposes the contacted voxel z coordinate from local collision resolution."]),
  adapter("server.RuntimeVoxelContactEvent.voxel", "server.GameVoxelContactEvent.voxel", "partial", ["The local event exposes the contacted voxel id; engine material and contact timing semantics remain unrecovered."]),
  adapter("server.RuntimeVoxelContactEvent.axis", "server.GameVoxelContactEvent.axis", "partial", ["The local event exposes the resolved local collision axis; historical solver orientation behavior remains unrecovered."]),
  adapter("server.RuntimeVoxelContactEvent.force", "server.GameVoxelContactEvent.force", "partial", ["The local event exposes the impulse-derived force vector; per-contact solver force integration remains evidence-deferred."]),
  adapter("server.RuntimeFluidContactEvent.tick", "server.GameFluidContactEvent.tick", "partial", ["The local event preserves the dispatch tick; fluid producer coverage remains limited to local voxel classification."]),
  adapter("server.RuntimeFluidContactEvent.entity", "server.GameFluidContactEvent.entity", "partial", ["The local event exposes the entering RuntimeEntity or RuntimePlayer; historical engine identity semantics remain unrecovered."]),
  adapter("server.RuntimeFluidContactEvent.voxel", "server.GameFluidContactEvent.voxel", "partial", ["The local event exposes the local fluid voxel id; historical fluid simulation semantics remain unrecovered."]),
  adapter("server.world.searchBox", "server.GameWorld.searchBox", "partial", ["RuntimeEntity and RuntimePlayer AABB overlap search uses the recovered body-center half-extents convention shared with zones and raycasts.", "Native oriented-body search and GameWorld.useOBB remain unavailable."]),
  adapter("server.world.addCollisionFilter", "server.GameWorld.addCollisionFilter", "partial", ["Filter registration/list lifecycle is implemented; the local physics solver does not yet consume selector pairs."]),
  adapter("server.world.removeCollisionFilter", "server.GameWorld.removeCollisionFilter", "partial", ["Exact selector-pair removal and list lifecycle are implemented; the local physics solver does not consume selector pairs."]),
  adapter("server.world.clearCollisionFilters", "server.GameWorld.clearCollisionFilters", "partial", ["Clearing the full local filter registry is implemented; the local physics solver does not consume selector pairs."]),
  adapter("server.world.collisionFilters", "server.GameWorld.collisionFilters", "partial", ["The method returns fresh nested arrays for every registered selector pair; the local physics solver does not consume selector pairs."]),
  adapter("server.world.projectName", "server.GameWorld.projectName", "compatible", []),
  adapter("server.world.addZone", "server.GameWorld.addZone", "partial", ["Zone creation, recovered selector normalization and mutation refresh, collides=false exclusion, polling, enter/leave events, and removal are implemented.", "Non-player/entity component selector tests remain unavailable because historical testComponent was not recovered; native physics-selector force application and client environment projection remain unavailable."]),
  adapter("server.world.removeZone", "server.GameWorld.removeZone", "partial", ["The local Runtime removes the zone and emits recovered leave events for active entities; native physics-selector cleanup and client environment teardown remain unavailable."]),
  adapter("server.world.zones", "server.GameWorld.zones", "partial", ["The recovered callable zones() surface returns a snapshot of locally active RuntimeGameZone objects; native engine-owned list identity is not reproduced."]),
  adapter("server.world.gravity", "server.GameWorld.gravity", "partial", ["Script writes reconfigure runtime-owned Player bodies from the next tick using the recovered world-physics binding and fixed-tick unit conversion.", "The local AuthoritativeGameRuntime only arbitrates transforms, and its Player game-net public state marks physics unused; no recovered mutable browser physics channel exists. Generic RuntimeEntity rigid-body integration also remains unavailable."]),
  adapter("server.world.airFriction", "server.GameWorld.airFriction", "partial", ["Script writes reconfigure runtime-owned Player bodies from the next tick using the recovered airFriction-to-velocityDamping binding and exponential damping formula.", "The local AuthoritativeGameRuntime only arbitrates transforms, and its Player game-net public state marks physics unused; no recovered mutable browser physics channel exists. Generic RuntimeEntity rigid-body integration also remains unavailable."]),
  adapter("server.world.fogColor", "server.GameWorld.fogColor", "partial", ["The recovered GameRGBColor property is script-visible; client rendering propagation remains unimplemented."]),
  adapter("server.RuntimeEntity.say", "server.GameEntity.say", "partial", ["Mapped live entities emit recovered game-chat.log sender, duration, and hideFloat fields; destroyed senders are silently dropped before logging or transport.", "Unmapped entities remain script-local instead of receiving a fabricated Player id.", "The recovered FIFO prefix/overflow/tick-drain algorithm and ordered Runtime-to-backend overflow batch are implemented with an evidence-deferred nullable limit; the numeric MAX_CHATS_PER_TICK value and Player display acknowledgement remain unavailable."]),
  adapter("server.world.sound", "server.GameWorld.sound", "partial", ["The recovered global and positioned sound arguments are sent through the preserved sound MuDB protocol with dictionary-backed sample ids.", "Unknown samples are rejected; browser decode/playback completion and media errors are not acknowledged to the Server Runtime."]),
  adapter("server.RuntimeEntity.sound", "server.GameEntity.sound", "partial", ["Mapped entities use the recovered entity-position sound union and defaults.", "Script-local entities without a validated backend projection are rejected instead of being fabricated as global or positioned sounds."]),
  adapter("server.RuntimePlayer.sound", "server.GameEntity.sound", "partial", ["Authoritative players use the recovered player-position sound union and defaults.", "A Player without a backend entity id is rejected instead of receiving a fabricated target id."]),
  adapter("server.Sound.resume", "shared.Sound.resume", "partial", ["The recovered resume and setCurrentTimeAndResume protocol messages are emitted.", "The browser does not acknowledge playback state or media failure to the Server Runtime."]),
  adapter("server.Sound.setCurrentTime", "shared.Sound.setCurrentTime", "partial", ["The recovered setCurrentTime protocol message is emitted.", "The browser does not acknowledge the resulting playback position."]),
  adapter("server.Sound.pause", "shared.Sound.pause", "partial", ["The recovered pause protocol message is emitted.", "The browser does not acknowledge the resulting playback state."]),
  adapter("server.Sound.stop", "shared.Sound.stop", "partial", ["The recovered stop protocol message is emitted.", "The browser does not acknowledge disposal or media failure."]),
  adapter("server.RuntimeEntity.onClick", "server.GameEntity.onClick", "partial", ["The declared GameClickEvent fields and world-to-target dispatch order are implemented when an authoritative entity binding exists."]),
  adapter("server.RuntimeEntity.enableInteract", "server.GameEntity.enableInteract", "partial", ["The script-visible property is preserved on RuntimeEntity and captured createEntity specifications.", "The authoritative backend replica.interactive field is unused, so writes are not projected to the Player browser and cannot fabricate prompts or range behavior."]),
  adapter("server.RuntimeEntity.interactHint", "server.GameEntity.interactHint", "partial", ["The recovered empty-string default and script writes are retained in RuntimeEntity memory.", "The authoritative backend replica.interactive field is unused, so the Player browser does not receive interaction hint text."]),
  adapter("server.RuntimeEntity.isPlayer", "server.GameEntity.isPlayer", "compatible", []),
  adapter("server.RuntimeEntity.bounds", "server.GameEntity.bounds", "partial", ["Reads return a copy of the positive body-center half extents used by local zone and raycast geometry and by the validated initial authoritative replica.body.bounds.", "RuntimeEntity bounds are fixed at creation because the canonical declaration is readonly; complete native oriented-body bounds behavior remains unavailable."]),
  adapter("server.RuntimeEntity.mesh", "server.GameEntity.mesh", "partial", ["The initial validated mesh name is exposed to scripts and drives authoritative replica creation.", "Writes after creation remain script-local because no recovered Player protocol swaps an existing replica mesh binding."]),
  adapter("server.RuntimeEntity.meshInvisible", "server.GameEntity.meshInvisible", "partial", ["The recovered false default and whole-property writes update authoritative replica.model.invisible.", "RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshScale", "server.GameEntity.meshScale", "partial", ["The recovered 1/64 default and whole-property bounded vector writes update authoritative replica.model.scale.", "Nested component mutation and RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshOrientation", "server.GameEntity.meshOrientation", "partial", ["The recovered identity quaternion default and whole-property writes update authoritative replica.body.orientation.", "Nested quaternion mutation, native normalization details, and RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.lookAt", "server.GameEntity.lookAt", "partial", ["The recovered target coercion, default +Y up vector, invalid-facing fallback, zero-direction fallback, parallel-up perturbation, X/Y/Z matrix layouts, gl-matrix quaternion conversion, and historical component write order are implemented. RuntimeEntity calls reuse the authoritative meshOrientation update path.", "RuntimePlayer lookAt/model orientation binding and nested quaternion mutation projection remain unavailable."]),
  adapter("server.RuntimeEntity.rotateLocal", "server.GameEntity.rotateLocal", "partial", ["The recovered scale-then-orientation local transform, X/Y/Z radian rotations, quaternion normalization, and before/after pivot-position compensation are implemented. RuntimeEntity calls reuse the authoritative meshOrientation and position update paths.", "RuntimePlayer rotateLocal/model orientation binding and nested quaternion/position mutation projection remain unavailable."]),
  adapter("server.RuntimeEntity.scaleLocal", "server.GameEntity.scaleLocal", "partial", ["The recovered direct meshScale replacement and before/after transformed-pivot position compensation are implemented using the same scale-then-orientation transform. RuntimeEntity calls reuse the authoritative meshScale and position update paths.", "RuntimePlayer scaleLocal/model scale binding and nested scale/position mutation projection remain unavailable."]),
  adapter("server.RuntimeEntity.meshOffset", "server.GameEntity.meshOffset", "partial", ["The recovered zero default and whole-property bounded vector writes update authoritative replica.model.offset.", "Nested component mutation and RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshColor", "server.GameEntity.meshColor", "partial", ["The recovered white RGBA default and whole-property normalized color writes update authoritative replica.model.color through the protocol byte encoding.", "Nested component mutation and RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshMetalness", "server.GameEntity.meshMetalness", "partial", ["The recovered zero default and 0..1 writes update authoritative replica.model.metalness.", "RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshEmissive", "server.GameEntity.meshEmissive", "partial", ["The recovered zero default and 0..1 writes update authoritative replica.model.emissive.", "RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.meshShininess", "server.GameEntity.meshShininess", "partial", ["The recovered zero default and 0..1 writes update authoritative replica.model.shininess.", "RuntimePlayer model bindings remain unimplemented."]),
  adapter("server.RuntimeEntity.showEntityName", "server.GameEntity.showEntityName", "partial", ["The recovered false default and component enable/disable behavior are implemented through authoritative replica.nameplate creation and deletion.", "RuntimePlayer EntityNameBinding behavior remains unimplemented and complete historical synchronizer scheduling was not recovered."]),
  adapter("server.RuntimeEntity.customName", "server.GameEntity.customName", "partial", ["The recovered empty-string default and UTF-8 nameplate text projection are implemented for validated captured-mesh RuntimeEntity instances.", "RuntimePlayer EntityNameBinding behavior remains unimplemented."]),
  adapter("server.RuntimeEntity.nameRadius", "server.GameEntity.nameRadius", "partial", ["The recovered default 16 and protocol range/quantization-compatible finite validation are projected to authoritative replica.nameplate.radius.", "RuntimePlayer EntityNameBinding behavior remains unimplemented."]),
  adapter("server.RuntimeEntity.nameColor", "server.GameEntity.nameColor", "partial", ["The recovered white default and normalized RGB projection are implemented for authoritative replica.nameplate.color.", "Nested component mutation does not trigger a whole-property bridge and RuntimePlayer EntityNameBinding behavior remains unimplemented."]),
  adapter("server.RuntimeEntity.onInteract", "server.GameEntity.onInteract", "partial", ["Mapped authoritative targets receive the same recovered GameInteractEvent object before the world listener.", "Unmapped and script-local targets cannot receive browser-originated interaction messages."]),
  adapter("server.RuntimeEntity.nextInteract", "server.GameEntity.nextInteract", "partial", ["The optional filter is supported for mapped authoritative interaction targets.", "Interaction component projection remains unavailable."]),
  adapter("server.RuntimeEntity.nextClick", "server.GameEntity.nextClick", "partial", ["The recovered optional filter is implemented; resolution still depends on an authoritative entity binding."]),
  adapter("server.RuntimeEntity.addTag", "server.GameEntity.addTag", "compatible", []),
  adapter("server.RuntimeEntity.removeTag", "server.GameEntity.removeTag", "compatible", []),
  adapter("server.RuntimeEntity.hasTag", "server.GameEntity.hasTag", "compatible", []),
  adapter("server.RuntimeEntity.destroy", "server.GameEntity.destroy", "partial", ["Local destruction removes mapped non-player entities and emits the recovered destroy lifecycle event; native engine-driven destruction remains unverified."]),
  adapter("server.RuntimeEntity.onDestroy", "server.GameEntity.onDestroy", "partial", ["The lifecycle event is emitted exactly once for local destruction; non-script engine destruction remains unverified."]),
  adapter("server.RuntimeEntity.nextDestroy", "server.GameEntity.nextDestroy", "partial", ["The recovered optional filter resolves local destruction events; non-script engine destruction remains unverified."]),
  adapter("server.RuntimePlayer.destroy", "server.GameEntity.destroy", "partial", ["The script call is a no-op for players, matching the recovered ScriptEntitySync non-player destroy guard; disconnect lifecycle is handled separately."]),
  adapter("server.RuntimePlayer.onDestroy", "server.GameEntity.onDestroy", "partial", ["MuDB disconnect emits world.onPlayerLeave, player.onDestroy, then world.onEntityDestroy with one recovered GameEntityEvent; other independent engine destruction sources remain unverified."]),
  adapter("server.RuntimePlayer.nextDestroy", "server.GameEntity.nextDestroy", "partial", ["The recovered optional filter resolves the disconnect-driven player destroy event; other independent engine destruction sources remain unverified."]),
  adapter("server.RuntimePlayer.onClick", "server.GameEntity.onClick", "partial", ["Clicked players receive the same GameClickEvent after world dispatch when their backend player id is authoritative."]),
  adapter("server.RuntimePlayer.nextClick", "server.GameEntity.nextClick", "partial", ["The recovered optional filter is implemented; resolution still depends on an authoritative backend player id."]),
  adapter("server.RuntimePlayer.isPlayer", "server.GameEntity.isPlayer", "compatible", []),
  adapter("server.RuntimePlayer.bounds", "server.GameEntity.bounds", "partial", ["Reads return a copy of the current authoritative Player boundsHalfExtents, including complete posture updates.", "Complete native posture producer coverage remains evidence-deferred; the readonly declaration is preserved."]),
  adapter("server.RuntimePlayer.addTag", "server.GameEntity.addTag", "compatible", []),
  adapter("server.RuntimePlayer.removeTag", "server.GameEntity.removeTag", "compatible", []),
  adapter("server.RuntimePlayer.hasTag", "server.GameEntity.hasTag", "compatible", []),
  adapter("server.RuntimePlayer.walkButton", "server.GamePlayerEntity.walkButton", "compatible", []),
  adapter("server.RuntimePlayer.jumpButton", "server.GamePlayerEntity.jumpButton", "compatible", []),
  adapter("server.RuntimePlayer.action0Button", "server.GamePlayerEntity.action0Button", "compatible", []),
  adapter("server.RuntimePlayer.action1Button", "server.GamePlayerEntity.action1Button", "compatible", []),
  adapter("server.RuntimePlayer.enableAction0", "server.GamePlayerEntity.enableAction0", "partial", ["The recovered server input mask is implemented; authoritative Player Public flags are not yet written back to the client."]),
  adapter("server.RuntimePlayer.enableAction1", "server.GamePlayerEntity.enableAction1", "partial", ["The recovered server input mask is implemented; authoritative Player Public flags are not yet written back to the client."]),
  adapter("server.RuntimePlayer.enableJump", "server.GamePlayerEntity.enableJump", "partial", ["The recovered server input mask is implemented; authoritative Player Public flags are not yet written back to the client."]),
  adapter("server.RuntimePlayer.enableDoubleJump", "server.GamePlayerEntity.enableDoubleJump", "partial", ["The recovered server input mask is implemented; authoritative Player Public flags are not yet written back to the client."]),
  adapter("server.RuntimePlayer.color", "server.GamePlayer.color", "partial", ["The Script Runtime value and mutation API are present; authoritative client rendering propagation remains unverified."]),
  adapter("server.RuntimePlayer.spawnPoint", "server.GamePlayer.spawnPoint", "partial", ["The spawn point drives local forceRespawn; native validation and automatic respawn integration remain unverified."]),
  adapter("server.RuntimePlayer.onRespawn", "server.GamePlayer.onRespawn", "partial", ["Local forceRespawn emits the recovered event shape; automatic engine respawn triggers remain unverified."]),
  adapter("server.RuntimePlayer.nextRespawn", "server.GamePlayer.nextRespawn", "partial", ["The recovered optional filter is implemented; automatic engine respawn triggers remain unverified."]),
  adapter("server.RuntimePlayer.onPress", "server.GamePlayer.onPress", "compatible", []),
  adapter("server.RuntimePlayer.nextPress", "server.GamePlayer.nextPress", "compatible", []),
  adapter("server.RuntimePlayer.onRelease", "server.GamePlayer.onRelease", "compatible", []),
  adapter("server.RuntimePlayer.nextRelease", "server.GamePlayer.nextRelease", "compatible", []),
  adapter("server.RuntimePlayer.onTakeDamage", "server.GameEntity.onTakeDamage", "partial", ["Script-produced events are compatible; authoritative backend DamageBinding ingress remains unverified."]),
  adapter("server.RuntimePlayer.nextTakeDamage", "server.GameEntity.nextTakeDamage", "partial", ["Script-produced events and filters are implemented; authoritative backend DamageBinding ingress remains unverified."]),
  adapter("server.RuntimePlayer.forceRespawn", "server.GamePlayer.forceRespawn", "partial", ["Position, velocity, contacts, triggers, backend state, and respawn events are updated; native death-state side effects remain unverified."]),
  adapter("server.RuntimePlayer.kick", "server.GamePlayerEntity.kick", "partial", ["The targeted MuDB session is closed and existing disconnect cleanup runs.", "The recovered Player kickSessionReason value is evidence-blocked, so no guessed reason packet is sent."]),
  adapter("server.RuntimePlayer.link", "server.GamePlayerEntity.link", "partial", ["The recovered string coercion and isConfirm/isNewTab defaults are sent through Player ref.openLink.", "The Player-only warning field has no recovered Script Runtime source and is sent as false."]),
  adapter("server.RuntimePlayer.setSkinByName", "server.GamePlayerEntity.setSkinByName", "partial", ["Script-visible parts and preserved Player avatarSkin ids update for an explicitly validated name-to-id mapping.", "The recovered package skin table remains evidence-deferred."]),
  adapter("server.RuntimePlayer.resetToDefaultSkin", "server.GamePlayerEntity.resetToDefaultSkin", "partial", ["Script-visible parts and preserved Player avatarSkin ids update when a validated default mapping is supplied.", "The recovered package default mapping remains evidence-deferred."]),
  adapter("server.RuntimePlayer.clearSkin", "server.GamePlayerEntity.clearSkin", "partial", ["Script-visible parts are set to null and preserved Player avatarSkin ids are set to zero as recovered."]),
  adapter("server.global.voxels", "server.global.voxels", "compatible", []),
  adapter("server.GameVoxels.getVoxelId", "server.GameVoxels.getVoxelId", "compatible", []),
  adapter("server.GameVoxels.setVoxelId", "server.GameVoxels.setVoxelId", "compatible", []),
  adapter("server.GameVoxels.id", "server.GameVoxels.id", "compatible", []),
  adapter("server.GameVoxels.setVoxel", "server.GameVoxels.setVoxel", "compatible", ["Four Chinese string rotation aliases remain unresolved because the recovered historical source contains mojibake at those switch cases."]),
  adapter("server.GameVoxels.getVoxel", "server.GameVoxels.getVoxel", "compatible", []),
  adapter("server.GameVoxels.name", "server.GameVoxels.name", "compatible", []),
  adapter("server.GameVoxels.getVoxelRotation", "server.GameVoxels.getVoxelRotation", "compatible", []),
  adapter("server.GameVoxels.shape", "server.GameVoxels.shape", "compatible", []),
  adapter("server.GameVoxels.VoxelTypes", "server.GameVoxels.VoxelTypes", "compatible", []),
  adapter("server.GameGUI.init", "server.GameGUI.init", "compatible", []),
  adapter("server.GameGUI.show", "server.GameGUI.show", "compatible", []),
  adapter("server.GameGUI.remove", "server.GameGUI.remove", "compatible", []),
  adapter("server.GameGUI.getAttribute", "server.GameGUI.getAttribute", "compatible", []),
  adapter("server.GameGUI.setAttribute", "server.GameGUI.setAttribute", "compatible", []),
  adapter("server.GameGUI.onMessage", "server.GameGUI.onMessage", "compatible", []),
  adapter("server.GameGUI.ui", "server.GameGUI.ui", "compatible", []),
  adapter("server.GameHttpAPI.fetch", "server.GameHttpAPI.fetch", "partial", ["Origin allowlisting, timeout handling, redirect rejection, and response size limits are implemented locally; historical network policy and response error semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.ok", "server.GameHttpFetchResponse.ok", "partial", ["The local response preserves the boolean status projection; historical response construction and network error semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.status", "server.GameHttpFetchResponse.status", "partial", ["The local response preserves the numeric HTTP status; historical response construction and network error semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.statusText", "server.GameHttpFetchResponse.statusText", "partial", ["The local response preserves the status text returned by the configured fetch implementation; historical normalization remains unrecovered."]),
  adapter("server.GameHttpFetchResponse.headers", "server.GameHttpFetchResponse.headers", "partial", ["The local response collects lowercase headers and repeated values; historical header ordering and wrapper semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.json", "server.GameHttpFetchResponse.json", "partial", ["The local response decodes JSON from the bounded body buffer; historical parse errors and stream lifecycle semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.text", "server.GameHttpFetchResponse.text", "partial", ["The local response decodes text from the bounded body buffer; historical encoding and stream lifecycle semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.arrayBuffer", "server.GameHttpFetchResponse.arrayBuffer", "partial", ["The local response exposes bounded bytes as an ArrayBuffer; historical stream lifecycle semantics remain unrecovered."]),
  adapter("server.GameHttpFetchResponse.close", "server.GameHttpFetchResponse.close", "partial", ["The local response releases its buffered body; historical close idempotency and transport cancellation semantics remain unrecovered."]),
  adapter("server.GameStorage.getDataStorage", "server.GameStorage.getDataStorage", "partial", ["Local JSON persistence implements the recovered data-space operations; native cloud scope, quotas, consistency, and version semantics remain unverified."]),
  adapter("server.GameStorage.getGroupStorage", "server.GameStorage.getGroupStorage", "partial", ["The default project Runtime disables group storage when the historical groupId input is empty.", "Capability Manifest v14 can bind a non-empty project package storage.groupId and the local provider isolates spaces by that id; DAO3 cloud scope, quotas, distributed consistency, and external group authority remain unrecovered."]),
  adapter("server.object.RuntimeGameStorage", "server.object.GameStorage", "partial", ["The local root exposes recovered getDataStorage/getGroupStorage methods behind the server.storage capability.", "Configured group storage is isolated by a launch-verified groupId, while DAO3 cloud provider semantics remain unrecovered."]),
  adapter("server.RuntimeDataStorage.key", "server.GameDataStorage.key", "partial", ["The immutable local namespace key is exposed exactly.", "Cloud namespace allocation remains unrecovered."]),
  adapter("server.RuntimeDataStorage.set", "server.GameDataStorage.set", "partial", ["The declared JSONValue union is recursively enforced before dense arrays or plain string-keyed objects persist to the local project file; values that JSON would silently rewrite are rejected.", "DAO3 byte quotas, backend error codes, distributed durability and cross-process consistency remain unrecovered."]),
  adapter("server.RuntimeDataStorage.update", "server.GameDataStorage.update", "partial", ["The previous ReturnValue, async handler, replacement validation and persistence are serialized through one local mutation queue, preventing same-process lost updates.", "The historical distributed ticket-based compare/update protocol, cross-process locking and retry behavior remain unavailable."]),
  adapter("server.RuntimeDataStorage.get", "server.GameDataStorage.get", "partial", ["The local result preserves key, value, version, createTime and updateTime or undefined.", "Cloud consistency and backend scheduling semantics remain unrecovered."]),
  adapter("server.RuntimeDataStorage.increment", "server.GameDataStorage.increment", "partial", ["Missing values start at zero, numeric increments default to one, nonnumeric stored values reject, and concurrent same-process increments are serialized without lost updates.", "The operation is not a distributed atomic increment and has no recovered cloud error mapping."]),
  adapter("server.RuntimeDataStorage.list", "server.GameDataStorage.list", "partial", ["Cursor-as-page-index, pageSize capped at 100, up-to-five-level constraintTarget traversal, stored-value fallback warnings, numeric min/max filtering, same-type scalar ordering, QueryList paging and last-page state are implemented.", "Exact backend natural order, mixed-type ordering, cloud query snapshots and backend error semantics remain unrecovered."]),
  adapter("server.RuntimeDataStorage.remove", "server.GameDataStorage.remove", "partial", ["The removed ReturnValue or undefined is returned and persisted locally.", "Cloud consistency and backend error semantics remain unrecovered."]),
  adapter("server.RuntimeDataStorage.destroy", "server.GameDataStorage.destroy", "partial", ["The local namespace is deleted and resolves after file replacement.", "Cloud scope deletion, quotas and multi-runtime visibility remain unrecovered."]),
  adapter("server.remoteChannel.onServerEvent", "server.remoteChannel.onServerEvent", "compatible", []),
  adapter("server.remoteChannel.sendClientEvent", "server.remoteChannel.sendClientEvent", "compatible", ["RuntimePlayer remains a subset of historical GamePlayerEntity."]),
  adapter("server.remoteChannel.broadcastClientEvent", "server.remoteChannel.broadcastClientEvent", "compatible", ["RuntimePlayer remains a subset of historical GamePlayerEntity."]),
];

const analysis = {
  format: "nea-local-server-runtime-analysis",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: {
    path: relativeSourcePath,
    bytes: Buffer.byteLength(source),
    sha256: createHash("sha256").update(source).digest("hex"),
  },
  eventTokenSource: {
    path: relativeEventSignalPath,
    bytes: Buffer.byteLength(eventSignalSource),
    sha256: createHash("sha256").update(eventSignalSource).digest("hex"),
  },
  raycastSource: {
    path: relativeGameRaycastPath,
    bytes: Buffer.byteLength(gameRaycastSource),
    sha256: createHash("sha256").update(gameRaycastSource).digest("hex"),
  },
  guiSource: { path: relativeGameGuiPath, bytes: Buffer.byteLength(gameGuiSource), sha256: createHash("sha256").update(gameGuiSource).digest("hex") },
  httpSource: { path: relativeGameHttpPath, bytes: Buffer.byteLength(gameHttpSource), sha256: createHash("sha256").update(gameHttpSource).digest("hex") },
  storageSource: { path: relativeGameStoragePath, bytes: Buffer.byteLength(gameStorageSource), sha256: createHash("sha256").update(gameStorageSource).digest("hex") },
  worldSource: { path: relativeGameWorldPath, bytes: Buffer.byteLength(gameWorldSource), sha256: createHash("sha256").update(gameWorldSource).digest("hex") },
  zonesSource: { path: relativeGameZonesPath, bytes: Buffer.byteLength(gameZonesSource), sha256: createHash("sha256").update(gameZonesSource).digest("hex") },
  contract: "nea-server-runtime/v1",
  entries,
  adapters,
  summary: {
    localEntries: entries.length,
    compatibleAdapters: adapters.filter(item => item.status === "compatible").length,
    partialAdapters: adapters.filter(item => item.status === "partial").length,
    extensions: entries.length - adapters.length,
  },
};

await mkdir(resolve(root, "generated"), { recursive: true });
await writeFile(resolve(root, "generated", "local-server-runtime-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
await writeFile(resolve(root, "abi", "server-adapter-map.json"), `${JSON.stringify({
  format: "nea-server-adapter-map",
  version: 1,
  generatedAt: analysis.generatedAt,
  contract: analysis.contract,
  adapters,
}, null, 2)}\n`);
console.log(`Analyzed local Server Runtime; ${entries.length} entries, ${analysis.summary.compatibleAdapters} compatible and ${analysis.summary.partialAdapters} partial adapters.`);

function entry(id, kind, owner, name, signature, capability, compatibility = "emulated", implementsIds = []) {
  return {
    id,
    side: "server",
    kind,
    owner,
    name,
    signature,
    availability: "confirmed",
    compatibility,
    capability,
    since: "0.1.0",
    ...(implementsIds.length > 0 ? { implements: implementsIds } : {}),
    notes: ["Implemented by the local experimental Server Runtime; historical compatibility is tracked separately in server-adapter-map.json."],
    evidence: [evidence],
  };
}

function playerPublicNumberEntry(name) {
  return entry(`server.RuntimePlayer.${name}`, "property", "RuntimePlayer", name, { type: "number", readonly: false }, "server.player.write", "partial", [`server.GamePlayerEntity.${name}`]);
}

function localPlayerStateEntry(name, type) {
  return entry(
    `server.RuntimePlayer.${name}`,
    "property",
    "RuntimePlayer",
    name,
    { type, readonly: false },
    "server.player.write",
    "partial",
    [`server.GamePlayerEntity.${name}`],
  );
}

function zoneEntries() {
  const methods = [
    ["entities", { parameters: [], returns: "GameEntity[]" }],
    ["onEnter", handler("GameTriggerEvent")],
    ["nextEnter", { parameters: [], returns: "Promise<GameTriggerEvent>" }],
    ["onLeave", handler("GameTriggerEvent")],
    ["nextLeave", { parameters: [], returns: "Promise<GameTriggerEvent>" }],
    ["remove", { parameters: [], returns: "void" }],
  ];
  const values = [
    entry("server.object.RuntimeGameZone", "object", null, "RuntimeGameZone", { properties: zonePropertyTypes.map(([name]) => name), methods: methods.map(([name]) => name) }, "server.world.events", "partial"),
    ...methods.map(([name, signature]) => entry(`server.RuntimeGameZone.${name}`, name.startsWith("on") ? "event" : "method", "RuntimeGameZone", name, signature, "server.world.events", "partial", [`server.GameZone.${name}`])),
    ...zonePropertyTypes.map(([name, type]) => entry(`server.RuntimeGameZone.${name}`, "property", "RuntimeGameZone", name, { type, readonly: false }, "server.world.events", "partial", [`server.GameZone.${name}`])),
  ];
  for (const value of values) {
    value.evidence = [
      { type: "local-source", path: relativeGameZonesPath, symbol: `RuntimeGameZone.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/api/GameZone.js", symbol: `GameZone.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/ScriptZoneWrapper.js", symbol: "ScriptZoneWrapper", confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/mapZone.md", symbol: `GameZone.${value.name}`, confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/game-zone-conformance.test.mjs", symbol: "GameZone conformance", confidence: "direct" },
    ];
  }
  return values;
}

function raycastResultEntries() {
  const properties = [
    ["hit", "boolean"],
    ["hitEntity", "GameEntity | null"],
    ["hitVoxel", "number"],
    ["origin", "GameVector3"],
    ["direction", "GameVector3"],
    ["distance", "number"],
    ["hitPosition", "GameVector3"],
    ["normal", "GameVector3"],
    ["voxelIndex", "GameVector3"],
  ];
  const values = [
    entry("server.object.RuntimeRaycastResult", "object", null, "RuntimeRaycastResult", { properties: [...properties.map(([name]) => name), "voxel"] }, "server.world.entities", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeRaycastResult.${name}`, "property", "RuntimeRaycastResult", name, { type, readonly: true }, "server.world.entities", "partial", [`server.GameRaycastResult.${name}`])),
    entry("server.RuntimeRaycastResult.voxel", "property", "RuntimeRaycastResult", "voxel", { type: "number", readonly: true }, "server.world.entities", "emulated"),
  ];
  for (const value of values) {
    value.notes = value.name === "voxel"
      ? ["Local compatibility alias for hitVoxel; it is not claimed as a historical GameRaycastResult member."]
      : ["The historical result field is present. Entity hits use local RuntimeEntity/RuntimePlayer objects and entity intersection remains an AABB approximation; vector fields use the local Vector3 compatibility type."];
    value.evidence = [
      { type: "local-source", path: relativeGameRaycastPath, symbol: `RuntimeRaycastResult.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/api/GameRaycastResult.js", symbol: `GameRaycastResult.${value.name}`, confidence: value.name === "voxel" ? "supporting" : "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/querySelectorEntity.md", symbol: "GameRaycastResult", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/raycast-result-conformance.test.mjs", symbol: "RaycastResult conformance", confidence: "direct" },
    ];
  }
  return values;
}

function voxelContactEventEntries() {
  const canonicalProperties = [
    ["tick", "number"],
    ["entity", "GameEntity"],
    ["x", "number"],
    ["y", "number"],
    ["z", "number"],
    ["voxel", "voxelId"],
    ["axis", "GameVector3"],
    ["force", "GameVector3"],
  ];
  const extensionProperties = [
    ["player", "RuntimeEntity"],
    ["collider", "Readonly<object>"],
    ["normal", "Vector3"],
    ["compatibility", "Readonly<object>"],
  ];
  const values = [
    entry("server.object.RuntimeVoxelContactEvent", "object", null, "RuntimeVoxelContactEvent", { properties: [...canonicalProperties, ...extensionProperties].map(([name]) => name) }, "server.world.events", "partial"),
    ...canonicalProperties.map(([name, type]) => entry(`server.RuntimeVoxelContactEvent.${name}`, "property", "RuntimeVoxelContactEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameVoxelContactEvent.${name}`])),
    ...extensionProperties.map(([name, type]) => entry(`server.RuntimeVoxelContactEvent.${name}`, "property", "RuntimeVoxelContactEvent", name, { type, readonly: true }, "server.world.events", "emulated")),
  ];
  for (const value of values) {
    const canonical = canonicalProperties.some(([name]) => name === value.name);
    value.notes = canonical
      ? ["The recovered event field and world-before-entity dispatch are implemented from the local fixed-step contact producer. RuntimeEntity/RuntimePlayer and local Vector3 values remain compatibility subsets of the historical engine objects."]
      : ["Local contact diagnostic extension; it is not claimed as a historical GameVoxelContactEvent member."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeVoxelContactEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "physicsEvents.voxelContact / voxelSeparate", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameVoxelContactEvent.${value.name}`, confidence: canonical ? "direct" : "supporting" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/input.md", symbol: "GameVoxelContactEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/voxel-contact-event-conformance.test.mjs", symbol: "Voxel contact event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function fluidContactEventEntries() {
  const properties = [["tick", "number"], ["entity", "GameEntity"], ["voxel", "voxelId"]];
  const values = [
    entry("server.object.RuntimeFluidContactEvent", "object", null, "RuntimeFluidContactEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeFluidContactEvent.${name}`, "property", "RuntimeFluidContactEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameFluidContactEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered event field and world-before-entity dispatch are implemented from local Player body fluid-overlap transitions. RuntimeEntity/RuntimePlayer remains a compatibility subset, and native fluid timing, buoyancy, drag, and exact overlap semantics remain unrecovered."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeFluidContactEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "physicsEvents.fluidContact / fluidSeparate", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameFluidContactEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/input.md", symbol: "GameFluidContactEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/fluid-contact-event-conformance.test.mjs", symbol: "Fluid contact event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function clickEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GameEntity"],
    ["clicker", "GamePlayerEntity"],
    ["button", "GameButtonType.ACTION0 | GameButtonType.ACTION1"],
    ["distance", "number"],
    ["clickerPosition", "GameVector3"],
    ["raycast", "GameRaycastResult"],
  ];
  const values = [
    entry("server.object.RuntimeClickEvent", "object", null, "RuntimeClickEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeClickEvent.${name}`, "property", "RuntimeClickEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameClickEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered click field, real game-net input ingress, RuntimeRaycastResult nesting, and world-before-target dispatch are implemented. RuntimeEntity/RuntimePlayer and local Vector3 remain compatibility subsets, and authoritative target resolution is limited to mapped backend entities."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeClickEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "GameClickEvent input dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameClickEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/input.md", symbol: "GameClickEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/click-event-conformance.test.mjs", symbol: "Click event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function inputEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GamePlayerEntity"],
    ["position", "GameVector3"],
    ["button", "GameButtonType"],
    ["pressed", "boolean"],
    ["raycast", "GameRaycastResult"],
  ];
  const values = [
    entry("server.object.RuntimeInputEvent", "object", null, "RuntimeInputEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeInputEvent.${name}`, "property", "RuntimeInputEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameInputEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered input field, real game-net ingress, PlayerFlags mask, RuntimeRaycastResult nesting, and world-before-player dispatch are implemented. RuntimePlayer and local Vector3 remain compatibility subsets, and public input flags are not projected back to browser control generation."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeInputEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "GameInputEvent press/release dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameInputEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/input.md", symbol: "GameInputEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/input-event-conformance.test.mjs", symbol: "Input event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function entityEventEntries() {
  const canonicalProperties = [["tick", "number"], ["entity", "GameEntity"]];
  const values = [
    entry("server.object.RuntimeEntityEvent", "object", null, "RuntimeEntityEvent", { properties: ["tick", "entity", "player"] }, "server.world.events", "partial"),
    ...canonicalProperties.map(([name, type]) => entry(`server.RuntimeEntityEvent.${name}`, "property", "RuntimeEntityEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameEntityEvent.${name}`])),
    entry("server.RuntimeEntityEvent.player", "property", "RuntimeEntityEvent", "player", { type: "RuntimeEntity | RuntimePlayer", readonly: true }, "server.world.events", "emulated"),
  ];
  for (const value of values) {
    value.notes = value.name === "player"
      ? ["Local compatibility alias of entity retained for existing project scripts; it is not claimed as a historical GameEntityEvent field."]
      : ["The recovered lifecycle field is implemented for local player join/leave, script-created entity create/destroy, and entity destroy dispatch. Independent native engine lifecycle ingress remains partial."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeEntityEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/sync/ScriptWorldSync.js", symbol: "GameEntityEvent create/destroy lifecycle", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameEntityEvent.${value.name}`, confidence: value.name === "player" ? "supporting" : "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/entity.md", symbol: "GameEntityEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/entity-event-conformance.test.mjs", symbol: "Entity event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function damageEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GameEntity"],
    ["damage", "number"],
    ["attacker", "GameEntity | null"],
    ["damageType", "string"],
  ];
  const values = [
    entry("server.object.RuntimeDamageEvent", "object", null, "RuntimeDamageEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeDamageEvent.${name}`, "property", "RuntimeDamageEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameDamageEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered field and entity-before-world dispatch are implemented for script-produced hurt calls and projected damage state. Independent native DamageBinding ingress remains unverified."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeDamageEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "GameDamageEvent hurt dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameDamageEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/fight.md", symbol: "GameDamageEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/damage-event-conformance.test.mjs", symbol: "Damage event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function dieEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GameEntity"],
    ["attacker", "GameEntity | null"],
    ["damageType", "string"],
  ];
  const values = [
    entry("server.object.RuntimeDieEvent", "object", null, "RuntimeDieEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeDieEvent.${name}`, "property", "RuntimeDieEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameDieEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered field and entity-before-world dispatch are implemented when script-produced hurt crosses hp from positive to zero. Independent native death-state production remains unverified."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeDieEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "GameDieEvent death dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameDieEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/fight.md", symbol: "GameDieEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/die-event-conformance.test.mjs", symbol: "Die event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function respawnEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GamePlayerEntity"],
  ];
  const values = [
    entry("server.object.RuntimeRespawnEvent", "object", null, "RuntimeRespawnEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeRespawnEvent.${name}`, "property", "RuntimeRespawnEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameRespawnEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered two-field payload and player-before-world dispatch are implemented for local forceRespawn and projected respawn state. Automatic native respawn production remains unverified."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeRespawnEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "respawnEvents GameRespawnEvent dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameRespawnEvent.${value.name}`, confidence: "direct" },
      { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/fight.md", symbol: "GameRespawnEvent", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/respawn-event-conformance.test.mjs", symbol: "Respawn event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function interactEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GamePlayerEntity"],
    ["targetEntity", "GameEntity"],
  ];
  const values = [
    entry("server.object.RuntimeInteractEvent", "object", null, "RuntimeInteractEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeInteractEvent.${name}`, "property", "RuntimeInteractEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameInteractEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered three-field payload and target-before-world dispatch are implemented for player.entity-interact messages naming a mapped authoritative target. Browser interaction component projection remains unavailable."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeInteractEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "interactEvents GameInteractEvent dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameInteractEvent.${value.name}`, confidence: "direct" },
      { type: "transport", path: "Middleware/runtime-compat/evidence/transport-contracts.json", symbol: "player.entity-interact", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/interact-event-conformance.test.mjs", symbol: "Interact event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function tickEventEntries() {
  const canonicalProperties = [
    ["tick", "number"],
    ["prevTick", "number"],
    ["skip", "boolean"],
    ["elapsedTimeMS", "number"],
  ];
  const values = [
    entry("server.object.RuntimeTickEvent", "object", null, "RuntimeTickEvent", { properties: [...canonicalProperties.map(([name]) => name), "deltaTime"] }, "server.world.events", "partial"),
    ...canonicalProperties.map(([name, type]) => entry(`server.RuntimeTickEvent.${name}`, "property", "RuntimeTickEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameTickEvent.${name}`])),
    entry("server.RuntimeTickEvent.deltaTime", "property", "RuntimeTickEvent", "deltaTime", { type: "number", readonly: true }, "server.world.events", "emulated"),
  ];
  for (const value of values) {
    value.notes = value.name === "deltaTime"
      ? ["Local seconds-based convenience extension derived as elapsedTimeMS / 1000; it is not claimed as a canonical GameTickEvent member."]
      : ["The recovered field and wall-clock timing formula are implemented. The local scheduler has no authoritative multi-tick frame input, so delayed-frame catch-up and skip production remain partial."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeTickEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "GameTickEvent tick dispatch", confidence: value.name === "deltaTime" ? "supporting" : "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameTickEvent.${value.name}`, confidence: value.name === "deltaTime" ? "supporting" : "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/tick-event-conformance.test.mjs", symbol: "Tick event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function chatEventEntries() {
  const properties = [
    ["tick", "number"],
    ["entity", "GameEntity"],
    ["message", "string"],
  ];
  const values = [
    entry("server.object.RuntimeChatEvent", "object", null, "RuntimeChatEvent", { properties: properties.map(([name]) => name) }, "server.world.chat", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeChatEvent.${name}`, "property", "RuntimeChatEvent", name, { type, readonly: true }, "server.world.chat", "partial", [`server.GameChatEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered three-field object shape is implemented without the former local player alias. No Player/browser-to-backend chat ingress reaches the Server Script Runtime, so subscriptions remain launch-blocked."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeChatEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "chatEvents GameChatEvent dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameChatEvent.${value.name}`, confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/chat-event-conformance.test.mjs", symbol: "Chat event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function purchaseSuccessEventEntries() {
  const properties = [
    ["tick", "number"],
    ["userId", "string"],
    ["productId", "GameProductAssets"],
    ["orderId", "number"],
  ];
  const values = [
    entry("server.object.RuntimePurchaseSuccessEvent", "object", null, "RuntimePurchaseSuccessEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimePurchaseSuccessEvent.${name}`, "property", "RuntimePurchaseSuccessEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GamePurchaseSuccessEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered four-field object shape is implemented for ABI analysis only. No browser or backend purchase-success producer reaches the Server Script Runtime, so subscriptions remain launch-blocked."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimePurchaseSuccessEvent.${value.name}`, confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GamePurchaseSuccessEvent.${value.name}`, confidence: "direct" },
      { type: "transport", path: "local-player/reports/runtime-abi.md", symbol: "market-script", confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/purchase-success-event-conformance.test.mjs", symbol: "Purchase success event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function keyBoardEventEntries() {
  const properties = [
    ["tick", "number"],
    ["keyCode", "number"],
  ];
  const values = [
    entry("server.object.RuntimeKeyBoardEvent", "object", null, "RuntimeKeyBoardEvent", { properties: properties.map(([name]) => name) }, "server.world.events", "partial"),
    ...properties.map(([name, type]) => entry(`server.RuntimeKeyBoardEvent.${name}`, "property", "RuntimeKeyBoardEvent", name, { type, readonly: true }, "server.world.events", "partial", [`server.GameKeyBoardEvent.${name}`])),
  ];
  for (const value of values) {
    value.notes = ["The recovered two-field object shape is produced from game-net.sendKeyBoardEvent keyDownState and prevKeyDownState transitions through the authoritative backend bridge."];
    value.evidence = [
      { type: "local-source", path: relativeSourcePath, symbol: `RuntimeKeyBoardEvent.${value.name}`, confidence: "direct" },
      { type: "origin-source", path: "origin/origin/origin/shell/ScriptShell.js", symbol: "keyboardEvents GameKeyBoardEvent dispatch", confidence: "direct" },
      { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameKeyBoardEvent.${value.name}`, confidence: "direct" },
      { type: "test", path: "Middleware/runtime-compat/test/keyboard-event-conformance.test.mjs", symbol: "Keyboard event conformance", confidence: "direct" },
    ];
  }
  return values;
}

function gameButtonTypeEntries() {
  const values = { WALK: "walk", RUN: "run", CROUCH: "crouch", JUMP: "jump", DOUBLE_JUMP: "jump2", FLY: "fly", ACTION0: "action0", ACTION1: "action1" };
  const evidence = [
    { type: "local-source", path: relativeSourcePath, symbol: "GameButtonType", confidence: "direct" },
    { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: "GameButtonType", confidence: "direct" },
    { type: "historical-bundle", path: "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js", symbol: "GameButtonType", confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "game-net input events reconstruct GameInputEvent press and release payloads", confidence: "direct" },
  ];
  const object = entry("server.global.GameButtonType", "object", null, "GameButtonType", { type: "Readonly<GameButtonType>" }, null, "emulated");
  object.evidence = evidence;
  return [object, ...Object.entries(values).map(([name, value]) => {
    const member = entry(`server.GameButtonType.${name}`, "property", "GameButtonType", name, { type: JSON.stringify(value), readonly: true }, null, "emulated");
    member.evidence = evidence;
    return member;
  })];
}

function gameCameraModeEntries() {
  const values = ["FIXED", "FOLLOW", "FPS", "RELATIVE"];
  const evidence = [
    { type: "local-source", path: relativeSourcePath, symbol: "GameCameraMode", confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GamePlayerEntity/camera.md", symbol: "GameCameraMode", confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/api/GamePlayer.js", symbol: "GameCameraMode.FOLLOW", confidence: "direct" },
  ];
  const object = entry("server.global.GameCameraMode", "object", null, "GameCameraMode", { type: "Readonly<GameCameraMode>" }, null, "emulated");
  object.evidence = evidence;
  return [object, ...values.map(name => {
    const member = entry(`server.GameCameraMode.${name}`, "property", "GameCameraMode", name, { type: JSON.stringify(name), readonly: true }, null, "emulated");
    member.evidence = evidence;
    return member;
  })];
}

function worldSizeEntry() {
  const value = entry("server.world.size", "property", "world", "size", {
    type: "Readonly<{x:number,y:number,z:number}>",
    readonly: true,
  }, "server.world.voxels", "emulated");
  value.notes = ["Recovered-only native surface: real scripts read x/y/z as inclusive maximum voxel coordinates; no public DAO3 declaration or historical GameWorld class member was found."];
  value.evidence = [
    { type: "local-source", path: relativeSourcePath, symbol: "world.size", confidence: "direct" },
    { type: "local-source", path: relativeGameVoxelsPath, symbol: "GameVoxelsRuntime.shape", confidence: "direct" },
    { type: "script-corpus", path: "Middleware/runtime-compat/evidence/script-corpus-usage.json", symbol: "world.size", confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/runtime.test.mjs", symbol: "GameWorld.size exposes recovered maximum voxel indices", confidence: "direct" },
  ];
  return value;
}

function worldValueEntry(id, name, type) {
  const value = entry(id, "property", "world", name, { type, readonly: false }, "server.world.config", "partial", [`server.GameWorld.${name}`]);
  value.evidence = [
    { type: "local-source", path: relativeGameWorldPath, symbol: `GameWorld.${name}`, confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/api/GameWorld.js", symbol: `GameWorld.${name}`, confidence: "direct" },
  ];
  return value;
}

function guiEntry(id, kind, name, signature) {
  const value = entry(id, kind, "GameGUI", name, signature, "server.gui", "compatible", [id]);
  value.evidence = [
    { type: "local-source", path: relativeGameGuiPath, symbol: `GameGuiRuntime.${name}`, confidence: "direct" },
    { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameGUI.${name}`, confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/api/GameGUI.js", symbol: `GameGUI.${name}`, confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/shell/GUIScriptShell.js", symbol: `GUIScriptShell.${name}`, confidence: "direct" },
    { type: "protocol-schema", path: "Middleware/runtime-compat/evidence/protocol.ts", symbol: "gui", confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/game-gui.test.mjs", symbol: "GameGUI command surface", confidence: "direct" },
    { type: "test", path: "Middleware/runtime-compat/test/backend-gui-transport.test.mjs", symbol: "Player GUI transport conformance", confidence: "direct" },
  ];
  return value;
}

function storageEntry(id, name) {
  const value = entry(id, "method", "GameStorage", name, { parameters: [{ name: "key", type: "string" }], returns: "GameDataStorage" }, "server.storage", "partial", [id]);
  value.evidence = [
    { type: "local-source", path: relativeGameStoragePath, symbol: `LocalGameStorage.${name}`, confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/api/GameStorage.js", symbol: `GameStorage.${name}`, confidence: "direct" },
    { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameStorage.${name}`, confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/game-storage.test.mjs", symbol: "GameDataStorage persistence surface", confidence: "direct" },
  ];
  return value;
}

function httpEntry(id, kind, owner, name, signature) {
  const value = entry(id, kind, owner, name, signature, "server.http", "partial", [id]);
  value.evidence = [
    { type: "local-source", path: relativeGameHttpPath, symbol: `${owner}.${name}`, confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GameHttpAPI/request.md", symbol: `${owner}.${name}`, confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/game-http.test.mjs", symbol: "GameHttpAPI runtime boundary", confidence: "direct" },
  ];
  return value;
}

function raycastEntry() {
  const value = entry("server.world.raycast", "method", "world", "raycast", {
    parameters: [
      { name: "origin", type: "GameVector3" },
      { name: "direction", type: "GameVector3" },
      { name: "options", type: "Partial<GameRaycastOptions>", optional: true },
    ],
    returns: "GameRaycastResult",
  }, "server.world.entities", "partial", ["server.GameWorld.raycast"]);
  value.notes = ["Implemented from DAO3 documentation, ArenaPro declarations, historical ScriptWorldSync source, BlockInfo fluid records, and real captured script usage. The recovered source proves an Infinity default, zero-direction preservation, entity-first then voxel-nearest resolution, and zero-vector no-hit intersection fields; engine raycastBoxes orientation semantics remain explicit in the adapter map."];
  value.evidence = [
    { type: "local-source", path: relativeGameRaycastPath, symbol: "raycastWorld", confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/querySelectorEntity.md", symbol: "GameWorld.raycast", confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/api/GameRaycastResult.js", symbol: "GameRaycastResult", confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/sync/ScriptWorldSync.js", symbol: "ScriptWorldSync.raycast", confidence: "direct" },
    { type: "test", path: "Frontend/demo-map/test/game-raycast.test.mjs", symbol: "GameWorld.raycast conformance", confidence: "direct" },
  ];
  return value;
}

function searchBoxEntry() {
  const value = entry("server.world.searchBox", "method", "world", "searchBox", {
    parameters: [{ name: "bounds", type: "GameBounds3" }],
    returns: "GameEntity[]",
  }, "server.world.entities", "partial", ["server.GameWorld.searchBox"]);
  value.notes = ["Implements axis-aligned overlap for RuntimeEntity and RuntimePlayer using recovered body-center half extents. Native oriented-body search remains unavailable."];
  value.evidence = [
    { type: "local-source", path: relativeEntityBoundsPath, symbol: "searchRuntimeEntities", confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/querySelectorEntity.md", symbol: "GameWorld.searchBox", confidence: "direct" },
    { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: "GameWorld.searchBox", confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/ScriptZoneWrapper.js", symbol: "GameEntity.bounds half-extents overlap", confidence: "supporting" },
    { type: "test", path: "Middleware/runtime-compat/test/world-search-box-api-conformance.test.mjs", symbol: "GameWorld.searchBox conformance", confidence: "direct" },
  ];
  return value;
}

function entityQuotaEntry() {
  const value = entry("server.world.entityQuota", "method", "world", "entityQuota", { parameters: [], returns: "number" }, "server.world.entities", "compatible", ["server.GameWorld.entityQuota"]);
  value.notes = ["Uses the recovered entityLimit - entityCount + playerCount formula, represented locally as entityLimit minus the non-player RuntimeEntity registry size. The project value is launch-bound and defaults to the script-protocol identity 3400."];
  value.evidence = [
    { type: "local-source", path: relativeSourcePath, symbol: "world.entityQuota", confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/sync/ScriptEntitySync.js", symbol: "ScriptEntitySync.quota", confidence: "direct" },
    { type: "protocol", path: "origin/server-protocols.json", symbol: "script-protocol.start.config.entityLimit", confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GameWorld/entityCD.md", symbol: "GameWorld.entityQuota", confidence: "direct" },
    { type: "test", path: "Middleware/runtime-compat/test/world-entity-quota-api-conformance.test.mjs", symbol: "GameWorld.entityQuota conformance", confidence: "direct" },
  ];
  return value;
}

function voxelEntry(id, kind, owner, name, signature, phase = 1) {
  const value = entry(id, kind, owner, name, signature, "server.world.voxels", "emulated");
  value.notes = ["Implemented from the preserved BlockInfo catalog and historical ScriptVoxelSync behavior; see the phase-specific evidence map."];
  value.evidence = [
    { type: "local-source", path: relativeGameVoxelsPath, symbol: `GameVoxelsRuntime.${name}`, confidence: "direct" },
    { type: "origin-source", path: "origin/origin/origin/sync/ScriptVoxelSync.js", symbol: name, confidence: "direct" },
    { type: "docs", path: "dao3-docs-mirror/markdown/api/GameVoxels/operate.md", symbol: name, confidence: "direct" },
    { type: "declaration", path: "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts", symbol: `GameVoxels.${name}`, confidence: "direct" },
    { type: "evidence-map", path: `Middleware/runtime-compat/evidence/server-voxels-phase-${phase}.json`, symbol: id, confidence: "direct" },
  ];
  return value;
}

function handler(eventType) {
  return { parameters: [{ name: "handler", type: `(${eventType})=>void` }], returns: "listener-token" };
}

function adapter(localId, canonicalId, status, gaps) {
  return { localId, canonicalId, status, gaps };
}
