import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EventSignal, GameEventHandlerToken } from "./event-signal.mjs";
import { FixedStepPlayerPhysics } from "./physics/fixed-step-physics.mjs";
import { PlayerPhysicsBody } from "./physics/player-body.mjs";
import { VoxelCollisionWorld } from "./physics/voxel-collision-world.mjs";
import { GameVoxelsRuntime } from "./game-voxels.mjs";
import { CommonJsModuleLoader, normalizeModulePath } from "./commonjs-module-loader.mjs";
import { LocalGameStorage } from "./game-storage.mjs";
import { HistoricalChatFifo } from "./chat-fifo.mjs";
import { GameGuiRuntime } from "./game-gui.mjs";
import { createRuntimeHttpClient } from "./game-http.mjs";
import { Vector3 } from "./vector3.mjs";
import { GameQuaternion } from "./quaternion.mjs";
import { GameRGBColor, GameRGBAColor } from "./colors.mjs";
import { GameBounds3, GameZoneSystem } from "./game-zones.mjs";
import { GameWorld } from "./game-world.mjs";
import { GameSoundEffect } from "./game-sound-effect.mjs";
import { GameAnimation } from "./game-animation.mjs";
import { normalizeEntitySound, normalizePlayerSound, normalizeWorldSound, Sound } from "./game-sound.mjs";
import { GameBodyPart } from "./game-body-part.mjs";
import { raycastWorld, RuntimeRaycastResult } from "./game-raycast.mjs";
import { searchRuntimeEntities } from "./entity-bounds.mjs";
import { entityLookAtQuaternion, rotateEntityLocal, scaleEntityLocal } from "./entity-look-at.mjs";
import { matchesGameSelector } from "./game-selector.mjs";
import { EntityBackendBridge } from "./entity-backend-bridge.mjs";

const EMPTY_PLAYER_TAGS = Object.freeze(new Set());
const GUI_CAPABILITY_MEMBERS = new Set(["init", "show", "remove", "getAttribute", "setAttribute", "onMessage", "ui"]);
const WORLD_CONFIG_CAPABILITY_MEMBERS = new Set([
  "gravity", "airFriction", "fogColor", "fogStartDistance", "fogHeightOffset",
  "fogHeightFalloff", "fogUniformDensity", "maxFog", "snowDensity", "snowSizeLo",
  "snowSizeHi", "snowFallSpeed", "snowSpinSpeed", "snowColor", "snowTexture",
  "rainDensity", "rainDirection", "rainSpeed", "rainSizeLo", "rainSizeHi",
  "rainInterference", "rainColor", "lightMode", "sunPhase", "sunFrequency",
  "lunarPhase", "sunDirection", "sunLight", "skyLeftLight", "skyRightLight",
  "skyBottomLight", "skyTopLight", "skyFrontLight", "skyBackLight", "useOBB",
  "projectName", "teleport", "breakVoxelSound", "placeVoxelSound", "playerJoinSound",
  "playerLeaveSound", "ambientSound",
]);

export const GameButtonType = Object.freeze({
  WALK: "walk",
  RUN: "run",
  CROUCH: "crouch",
  JUMP: "jump",
  DOUBLE_JUMP: "jump2",
  FLY: "fly",
  ACTION0: "action0",
  ACTION1: "action1",
});

export const GameCameraMode = Object.freeze({
  FIXED: "FIXED",
  FOLLOW: "FOLLOW",
  FPS: "FPS",
  RELATIVE: "RELATIVE",
});

const INPUT_BUTTONS = Object.freeze([
  Object.freeze({ mask: 1, button: GameButtonType.ACTION0 }),
  Object.freeze({ mask: 2, button: GameButtonType.ACTION1 }),
  Object.freeze({ mask: 4, button: GameButtonType.JUMP }),
  Object.freeze({ mask: 8, button: GameButtonType.WALK }),
  Object.freeze({ mask: 16, button: GameButtonType.CROUCH }),
  Object.freeze({ mask: 32, button: GameButtonType.RUN }),
  Object.freeze({ mask: 64, button: GameButtonType.DOUBLE_JUMP }),
  Object.freeze({ mask: 128, button: GameButtonType.FLY }),
]);

const PLAYER_INPUT_PERMISSIONS = Object.freeze([
  Object.freeze({ mask: 1, property: "enableAction0" }),
  Object.freeze({ mask: 2, property: "enableAction1" }),
  Object.freeze({ mask: 4, property: "enableJump" }),
  Object.freeze({ mask: 16, property: "enableCrouch" }),
  Object.freeze({ mask: 64, property: "enableDoubleJump" }),
]);

const PLAYER_PUBLIC_NUMBER_FIELDS = Object.freeze([
  "walkSpeed",
  "runSpeed",
  "runAcceleration",
  "jumpPower",
  "jumpSpeedFactor",
  "jumpAccelerationFactor",
  "doubleJumpPower",
  "crouchSpeed",
  "crouchAcceleration",
  "flySpeed",
  "flyAcceleration",
  "swimAcceleration",
  "swimSpeed",
  "walkAcceleration",
]);

const KNOWN_CAPABILITIES = new Set([
  "server.world.events",
  "server.world.chat",
  "server.world.entities",
  "server.world.voxels",
  "server.world.config",
  "server.gui",
  "server.storage",
  "server.player",
  "server.player.write",
  "server.remote-channel",
  "server.http",
]);

export class ScriptRuntime {
  #context;
  #interval;
  #moduleLoader;
  #moduleEnvironment = {};
  #moduleEnvironmentKey = "__neaCommonJsModuleEnvironment";
  #timers = new Set();
  #players = new Map();
  #playerIds = new WeakMap();
  #entities = new Map();
  #messages = [];
  #chatFifo;
  #outboundEvents = [];
  #collisionFilters = new Map();
  #tempChats = new Map();
  #animations = new Set();
  #entityBackendBridge;
  #world;
  #worldPhysicsSnapshot;
  #initialWorldPhysics;
  #worldMaterials;
  #seed = 0;
  #now;
  #prevTickMS;
  #signals = {
    tick: new EventSignal(),
    playerJoin: new EventSignal(),
    playerLeave: new EventSignal(),
    entityCreate: new EventSignal(),
    entityDestroy: new EventSignal(),
    respawn: new EventSignal(),
    takeDamage: new EventSignal(),
    clientEvent: new EventSignal(),
    chat: new EventSignal(),
    press: new EventSignal(),
    click: new EventSignal(),
    interact: new EventSignal(),
    release: new EventSignal(),
    fluidEnter: new EventSignal(),
    fluidLeave: new EventSignal(),
    die: new EventSignal(),
    entityContact: new EventSignal(),
    entitySeparate: new EventSignal(),
    playerPurchaseSuccess: new EventSignal(),
    keyDown: new EventSignal(),
    keyUp: new EventSignal(),
    voxelContact: new EventSignal(),
    voxelSeparate: new EventSignal(),
    contact: new EventSignal(),
    contactSeparate: new EventSignal(),
    triggerEnter: new EventSignal(),
    triggerLeave: new EventSignal(),
  };

  constructor(options) {
    this.projectRoot = resolve(options.projectRoot);
    this.tickRate = options.tickRate;
    this.capabilities = new Set(options.capabilities);
    this.logger = options.logger ?? console;
    this.entry = options.entry;
    this.moduleSources = options.modules;
    this.storage = options.storage ?? new LocalGameStorage({
      file: options.storageFile ?? resolve(this.projectRoot, ".runtime-storage.json"),
      logger: this.logger,
      groupId: options.storageScope?.groupId,
    });
    this.gui = options.gui ?? new GameGuiRuntime({
      transport: options.sendGuiCommand,
      resolvePlayerId: entity => this.#playerIds.get(entity) ?? entity?.id,
    });
    this.zones = new GameZoneSystem();
    this.http = options.http ?? createRuntimeHttpClient({ ...options.httpOptions, logger: this.logger });
    this.runtimeApiVersion = options.runtimeApiVersion;
    this.serverContract = options.serverContract;
    this.compatibilityLevel = options.compatibilityLevel;
    if (typeof options.projectName !== "string" || options.projectName.length === 0) throw new Error("Runtime requires a project name");
    this.projectName = options.projectName;
    this.entityLimit = requireEntityLimit(options.entityLimit ?? 3400);
    this.#now = options.now ?? Date.now;
    this.#prevTickMS = this.#now();
    this.#initialWorldPhysics = normalizeInitialWorldPhysics(options.physics);
    this.#worldMaterials = Object.freeze(Object.fromEntries(
      Object.entries(options.physics?.materials ?? {}).map(([id, material]) => [id, Object.freeze({
        friction: Number(material.friction ?? 8),
        restitution: Number(material.restitution ?? 0),
      })]),
    ));
    this.playerBodyProfile = options.physics?.playerBody;
    if (!this.playerBodyProfile) throw new Error("Runtime requires an explicit player body profile");
    this.sendClientEvent = options.sendClientEvent ?? (() => {});
    this.sendChatMessage = options.sendChatMessage ?? (() => {});
    this.sendChatMessages = options.sendChatMessages ?? (deliveries => Promise.all(deliveries.map(delivery => this.sendChatMessage(delivery.sessionId, delivery.message))));
    this.sendSoundCommand = options.sendSoundCommand ?? (() => Promise.reject(new Error("Sound transport is not configured")));
    this.kickPlayer = options.kickPlayer ?? (() => Promise.reject(new Error("Player kick transport is not configured")));
    this.linkPlayer = options.linkPlayer ?? (() => Promise.reject(new Error("Player link transport is not configured")));
    this.validatedSkinIds = requireValidatedSkinIds(options.validatedSkinIds);
    this.defaultSkinName = requireOptionalSkinName(options.defaultSkinName, "defaultSkinName");
    this.#chatFifo = new HistoricalChatFifo(options.chatMessagesPerTick ?? null);
    this.writePlayerState = options.writePlayerState ?? (() => {});
    this.writeDamageState = options.writeDamageState ?? (() => {});
    this.#entityBackendBridge = new EntityBackendBridge({
      validatedMeshNames: options.validatedMeshNames,
      createEntity: options.createEntity ?? (() => null),
      writeEntityState: options.writeEntityState ?? (() => {}),
      destroyEntity: options.destroyEntity ?? (() => {}),
      reportError: (source, error) => this.#reportError(source, error),
    });
    // Dialog transport is optional; without one, player.dialog resolves null so
    // real maps (parkour "帮助") treat it as dismissed instead of throwing.
    this.showDialog = options.showDialog ?? (() => Promise.resolve(null));
    this.cancelDialogs = options.cancelDialogs ?? (() => false);
    this.collisionWorld = new VoxelCollisionWorld({
      voxels: options.voxels ?? [],
      materials: options.physics?.materials ?? {},
      fluidIds: (options.blockCatalog ?? []).filter(entry => entry.fluid === true).map(entry => entry.id),
      colliders: options.physics?.colliders ?? [],
      triggers: options.physics?.triggers ?? [],
    });
    this.voxels = new GameVoxelsRuntime({
      shape: options.shape,
      catalog: options.blockCatalog,
      collisionWorld: this.collisionWorld,
      onVoxelChange: options.onVoxelChange,
    });
    this.physics = new FixedStepPlayerPhysics(this.collisionWorld, options.physics);
    this.currentTick = 0;
    this.started = false;
    for (const capability of this.capabilities) {
      if (!KNOWN_CAPABILITIES.has(capability)) throw new Error(`Unknown runtime capability: ${capability}`);
    }
    for (const entity of options.entities ?? []) this.#entities.set(entity.id, createRuntimeEntity({
      ...entity,
      _backendEntityId: Number.isSafeInteger(entity.sourceIndex) ? 0x10000 + entity.sourceIndex : null,
      _backendEntityBound: false,
    }, this));
  }

  static async load(projectRoot, options = {}) {
    const root = resolve(projectRoot);
    const project = JSON.parse(await readFile(resolve(root, "dao3.project.json"), "utf8"));
    const world = JSON.parse(await readFile(resolve(root, project.world), "utf8"));
    const scriptManifest = JSON.parse(await readFile(resolve(root, project.scripts), "utf8"));
    const entitySnapshot = JSON.parse(await readFile(resolve(root, world.entities), "utf8"));
    const terrainSnapshot = JSON.parse(await readFile(resolve(root, world.terrain), "utf8"));
    const physicsSnapshot = world.physics
      ? JSON.parse(await readFile(resolve(root, world.physics), "utf8"))
      : {};
    const entities = (entitySnapshot.entities ?? []).map((entity, index) => {
      const packageTags = Array.isArray(entity.tags) ? entity.tags : [];
      const sourceTags = Array.isArray(entity.source?.tags) ? entity.source.tags : [];
      return {
        id: packageTags.find(tag => tag.startsWith("id-"))?.slice(3) ?? `entity-${index + 1}`,
        kind: entity.kind,
        name: entity.name ?? entity.source?.name,
        position: entity.position,
        tags: [...new Set([...sourceTags, ...packageTags])],
        mesh: entity.mesh ?? entity.source?.mesh,
        bounds: entity.bounds ?? entity.source?.bounds,
        meshScale: entity.meshScale ?? entity.source?.scale,
        meshOrientation: entity.meshOrientation ?? entity.source?.orientation,
        collides: entity.collides ?? entity.source?.collision,
        fixed: entity.fixed ?? entity.source?.fixed,
        gravity: entity.gravity ?? entity.source?.gravity,
        mass: entity.mass ?? entity.source?.mass,
        friction: entity.friction ?? entity.source?.friction,
        restitution: entity.restitution ?? entity.source?.restitution,
        meshMetalness: entity.meshMetalness ?? entity.source?.metalness,
        meshEmissive: entity.meshEmissive ?? entity.source?.emissive,
        meshShininess: entity.meshShininess ?? entity.source?.shininess,
        anchorOffset: entity.anchorOffset ?? entity.source?.anchorOffset,
        source: entity.source,
        sourceIndex: index,
        enableDamage: entity.enableDamage ?? entity.source?.enableDamage,
        showHealthBar: entity.showHealthBar ?? entity.source?.showHealthBar,
        hp: entity.hp ?? entity.source?.hp,
        maxHp: entity.maxHp ?? entity.source?.maxHp,
      };
    });
    if (scriptManifest.entry === null) throw new Error("Project has no server script entry");
    const modulePaths = scriptManifest.modules ?? [scriptManifest.entry];
    if (!Array.isArray(modulePaths) || !modulePaths.includes(scriptManifest.entry)) throw new Error("Script manifest modules must include the entry");
    const modules = Object.fromEntries(await Promise.all(modulePaths.map(async modulePath => [modulePath, await readFile(resolve(root, modulePath), "utf8")])));
    if (scriptManifest.contract?.side !== "server") throw new Error("Script manifest must bind a server runtime contract");
    if (scriptManifest.contract.id !== project.engine.serverContract) throw new Error("Server runtime contract mismatch");
    if (scriptManifest.contract.apiVersion !== project.engine.runtimeApiVersion) throw new Error("Server runtime API version mismatch");
    return new ScriptRuntime({
      projectRoot: root,
      tickRate: project.engine.tickRate,
      capabilities: scriptManifest.capabilities ?? [],
      entry: scriptManifest.entry,
      modules,
      runtimeApiVersion: project.engine.runtimeApiVersion,
      serverContract: project.engine.serverContract,
      compatibilityLevel: project.engine.compatibilityLevel,
      projectName: project.display?.name,
      entityLimit: world.entityLimit ?? 3400,
      entities,
      shape: world.shape,
      blockCatalog: options.blockCatalog,
      voxels: terrainSnapshot.voxels ?? [],
      onVoxelChange: options.onVoxelChange,
      logger: options.logger,
      sendClientEvent: options.sendClientEvent,
      sendChatMessage: options.sendChatMessage,
      sendChatMessages: options.sendChatMessages,
      kickPlayer: options.kickPlayer,
      linkPlayer: options.linkPlayer,
      validatedSkinIds: options.validatedSkinIds,
      defaultSkinName: options.defaultSkinName,
      chatMessagesPerTick: options.chatMessagesPerTick,
      writePlayerState: options.writePlayerState,
      writeDamageState: options.writeDamageState,
      sendSoundCommand: options.sendSoundCommand,
      createEntity: options.createEntity,
      writeEntityState: options.writeEntityState,
      destroyEntity: options.destroyEntity,
      validatedMeshNames: options.validatedMeshNames,
      sendGuiCommand: options.sendGuiCommand,
      showDialog: options.showDialog,
      cancelDialogs: options.cancelDialogs,
      physics: { ...physicsSnapshot, ...options.physics },
      storageScope: options.storageScope ?? project.storage,
      storageFile: options.storageFile,
      httpOptions: options.httpOptions,
    });
  }

  async start() {
    if (this.started) return;
    const globals = this.#createGlobals();
    // DAO3 脚本常用 `global.foo = ...` 再裸调用 `foo(...)`（index.js 的
    // playerGo/randa）。`global` 必须指向 context 全局对象本身，裸标识符才能
    // 解析；getter 写法会在 Node 主 realm 求值 globalThis，因此这里直接
    // 把 globals 自引用为 `global`（vm.createContext 后 globalThis 即 globals）。
    Object.defineProperty(globals, "global", { value: globals, enumerable: true, configurable: false, writable: false });
    Object.defineProperty(globals, this.#moduleEnvironmentKey, { value: this.#moduleEnvironment });
    Object.freeze(globals);
    this.#context = vm.createContext(globals, {
      name: `nea-script:${this.projectRoot}`,
      codeGeneration: { strings: false, wasm: false },
    });
    this.#moduleLoader = new CommonJsModuleLoader({
      context: this.#context,
      modules: this.moduleSources,
      // Real map scripts run heavy top-level work at load (e.g. the captured
      // parkour map's water-flood scan); keep a generous bound.
      timeout: 60_000,
      environment: this.#moduleEnvironment,
      environmentKey: this.#moduleEnvironmentKey,
    });
    this.#moduleLoader.loadModule(this.entry);
    this.#prevTickMS = this.#now();
    this.started = true;
    this.#interval = setInterval(() => this.tick(), 1000 / this.tickRate);
    this.#interval.unref?.();
  }

  moduleExecutionSummary() {
    const executed = this.#moduleLoader?.snapshot() ?? [];
    const entry = normalizeModulePath(this.entry);
    return Object.freeze({
      declared: Object.keys(this.moduleSources).length,
      loaded: executed.filter(module => module.loaded).length,
      entryLoaded: executed.some(module => module.id === entry && module.loaded),
    });
  }

  stop() {
    if (this.#interval !== undefined) clearInterval(this.#interval);
    this.#interval = undefined;
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
    Object.values(this.#signals).forEach(signal => signal.clear());
    this.started = false;
  }

  tick() {
    this.#deliverChatBatch(this.#chatFifo.drainTickBoundary());
    const prevTick = this.currentTick;
    this.currentTick += 1;
    for (const animation of this.#animations) {
      animation.advance(this.currentTick);
      if (["finished", "cancelled"].includes(animation.playState)) this.#animations.delete(animation);
    }
    const now = this.#now();
    const timing = createTickTiming(this.currentTick, prevTick, now, this.#prevTickMS);
    this.#prevTickMS = now;
    const deltaTime = 1 / this.tickRate;
    this.#syncWorldPhysics();
    for (const player of this.#players.values()) {
      const contacts = player._authority === "backend"
        ? this.physics.observe(player._body)
        : this.physics.step(player._body, deltaTime);
      this.#enforcePlayerMovementBounds(player);
      for (const contact of contacts.entered) {
        const event = createContactEvent(this.currentTick, player, contact);
        this.#signals.contact.emit(event, error => this.#reportError("contact", error));
        if (contact.collider.kind === "voxel") {
          this.#signals.voxelContact.emit(event, error => this.#reportError("voxelContact", error));
          player._signals.voxelContact.emit(event, error => this.#reportError("entityVoxelContact", error));
        }
      }
      for (const contact of contacts.separated) {
        const event = createContactEvent(this.currentTick, player, contact);
        this.#signals.contactSeparate.emit(event, error => this.#reportError("contactSeparate", error));
        if (contact.collider.kind === "voxel") {
          this.#signals.voxelSeparate.emit(event, error => this.#reportError("voxelSeparate", error));
          player._signals.voxelSeparate.emit(event, error => this.#reportError("entityVoxelSeparate", error));
        }
      }
      for (const trigger of contacts.triggerEntered) {
        this.#signals.triggerEnter.emit(triggerEvent(player, trigger), error => this.#reportError("triggerEnter", error));
      }
      for (const trigger of contacts.triggerLeft) {
        this.#signals.triggerLeave.emit(triggerEvent(player, trigger), error => this.#reportError("triggerLeave", error));
      }
      for (const fluid of contacts.fluidEntered) this.#dispatchFluidEvent("fluidEnter", player, fluid);
      for (const fluid of contacts.fluidLeft) this.#dispatchFluidEvent("fluidLeave", player, fluid);
      // entity-entity contacts: recovered maps (e.g. parkour checkpoints) register
      // per-entity handlers via entity.onEntityContact. Stationary colliding props
      // are tested against each player body AABB; enter/leave is edge-triggered so
      // the handler fires once per overlap, matching the historical semantics.
      const playerMin = [
        player._body.position.x - player._body.boundsHalfExtents.x,
        player._body.position.y - player._body.boundsHalfExtents.y,
        player._body.position.z - player._body.boundsHalfExtents.z,
      ];
      const playerMax = [
        player._body.position.x + player._body.boundsHalfExtents.x,
        player._body.position.y + player._body.boundsHalfExtents.y,
        player._body.position.z + player._body.boundsHalfExtents.z,
      ];
      for (const entity of this.#entities.values()) {
        if (entity.destroyed || entity._collides !== true) continue;
        const half = entity._bounds;
        const entityMin = [
          entity._position.x - half.x,
          entity._position.y - half.y,
          entity._position.z - half.z,
        ];
        const entityMax = [
          entity._position.x + half.x,
          entity._position.y + half.y,
          entity._position.z + half.z,
        ];
        const overlap =
          playerMin[0] < entityMax[0] && playerMax[0] > entityMin[0] &&
          playerMin[1] < entityMax[1] && playerMax[1] > entityMin[1] &&
          playerMin[2] < entityMax[2] && playerMax[2] > entityMin[2];
        const wasInContact = entity._contactPlayers.has(player);
        if (overlap && !wasInContact) {
          entity._contactPlayers.add(player);
          const event = Object.freeze({ tick: this.currentTick, entity, self: entity, other: player });
          entity._signals.contact.emit(
            event,
            error => this.#reportError(`${entity.id}.contact`, error),
          );
          this.#signals.entityContact.emit(event, error => this.#reportError("entityContact", error));
        } else if (!overlap && wasInContact) {
          entity._contactPlayers.delete(player);
          const event = Object.freeze({ tick: this.currentTick, entity, self: entity, other: player });
          entity._signals.contactSeparate.emit(
            event,
            error => this.#reportError(`${entity.id}.contactSeparate`, error),
          );
          this.#signals.entitySeparate.emit(event, error => this.#reportError("entitySeparate", error));
        }
      }
    }
    this.zones.poll(this.currentTick, this.#allQueryableEntities());
    this.#signals.tick.emit(
      createGameTickEvent(this.currentTick, prevTick, timing.elapsedTimeMS, timing.skip),
      error => this.#reportError("tick", error),
    );
  }

  addPlayer(input = {}) {
    this.#require("server.world.events");
    const id = String(input.id ?? `guest-${this.#players.size + 1}`);
    const existing = this.#players.get(id);
    if (existing) return existing;
    const player = createRuntimePlayer(this, {
      id,
      name: input.name ?? "Guest",
      position: input.position ?? [0, 0, 0],
      authority: input.authority ?? "runtime",
      userId: input.userId,
      boxId: input.boxId,
      userKey: input.userKey,
      avatar: input.avatar,
      url: input.url,
    });
    this.#playerIds.set(player, id);
    this.#players.set(id, player);
    this.#signals.playerJoin.emit(createGameEntityEvent(this.currentTick, player), error => this.#reportError("playerJoin", error));
    this.#queueDamageStateWrite(player);
    return player;
  }

  removePlayer(id) {
    const player = this.#players.get(id);
    if (!player) return false;
    this.#players.delete(id);
    player._destroyed = true;
    const event = createGameEntityEvent(this.currentTick, player);
    this.#signals.playerLeave.emit(event, error => this.#reportError("playerLeave", error));
    player._signals.destroy.emit(event, error => this.#reportError("entityDestroy", error));
    this.#signals.entityDestroy.emit(event, error => this.#reportError("entityDestroy", error));
    return true;
  }

  dispatchWorldEvent(type, playerId, details = {}) {
    const signal = this.#signals[type];
    const player = this.#players.get(playerId);
    if (!signal || !player) return false;
    signal.emit(Object.freeze({ tick: this.currentTick, entity: player, player, ...structuredClone(details) }), error => this.#reportError(type, error));
    player._signals?.[type]?.emit(Object.freeze({ tick: this.currentTick, entity: player, player, ...structuredClone(details) }), error => this.#reportError(type, error));
    return true;
  }

  dispatchKeyboardEvent(type, playerId, tick, keyCode) {
    if (type !== "keyDown" && type !== "keyUp") return false;
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isInteger(keyCode) || keyCode < 0 || keyCode > 255) return false;
    const player = this.#players.get(playerId);
    if (!player) return false;
    const event = createGameKeyBoardEvent(tick, keyCode);
    this.#signals[type].emit(event, error => this.#reportError(type, error));
    player._signals[type].emit(event, error => this.#reportError(type, error));
    return true;
  }

  bindBackendEntities(bindings) {
    if (!Array.isArray(bindings)) return 0;
    const entities = [...this.#entities.values()];
    let bound = 0;
    for (const binding of bindings) {
      const backendEntityId = Number(binding?.entityId);
      if (!Number.isSafeInteger(backendEntityId) || backendEntityId < 1) continue;
      let entity = null;
      if (Number.isSafeInteger(binding?.entityIndex) && binding.entityIndex >= 0) {
        entity = entities.find(candidate => candidate._sourceIndex === binding.entityIndex) ?? null;
      } else if (typeof binding?.sourceId === "string") {
        entity = this.#entities.get(binding.sourceId) ?? null;
      }
      if (!entity) continue;
      entity._backendEntityId = backendEntityId;
      entity._backendEntityBound = true;
      this.#queueDamageStateWrite(entity);
      bound += 1;
    }
    return bound;
  }

  dispatchInputEvents(playerId, packet) {
    const player = this.#players.get(playerId);
    if (!player || !Array.isArray(packet?.events)) return 0;
    let dispatched = 0;
    for (const rawEvent of packet.events) {
      if (!isByte(rawEvent?.buttonState) || !isByte(rawEvent?.prevButtonState)) continue;
      const permissionMask = inputPermissionMask(player);
      const buttonState = rawEvent.buttonState & permissionMask;
      const prevButtonState = rawEvent.prevButtonState & permissionMask;
      updatePlayerButtonState(player, buttonState);
      const changed = buttonState ^ prevButtonState;
      if (changed === 0) continue;
      const raycast = reconstructInputRaycast(this, rawEvent);
      const position = Vector3.from(rawEvent.position ?? [0, 0, 0]);
      const pressedMask = changed & buttonState;
      if ((pressedMask & 3) !== 0 && raycast.hitEntity) {
        const button = (pressedMask & 1) !== 0 ? GameButtonType.ACTION0 : GameButtonType.ACTION1;
        const clickEvent = createGameClickEvent(rawEvent.tick, raycast.hitEntity, player, button, position.distance(raycast.hitPosition), position, raycast);
        this.#signals.click.emit(clickEvent, error => this.#reportError("click", error));
        raycast.hitEntity._signals.click.emit(clickEvent, error => this.#reportError("entityClick", error));
      }
      for (const { mask, button } of INPUT_BUTTONS) {
        if ((changed & mask) === 0) continue;
        const pressed = (buttonState & mask) !== 0;
        const event = createGameInputEvent(rawEvent.tick, player, position, button, pressed, raycast);
        const type = pressed ? "press" : "release";
        this.#signals[type].emit(event, error => this.#reportError(type, error));
        player._signals[type].emit(event, error => this.#reportError(type, error));
        dispatched += 1;
      }
    }
    return dispatched;
  }

  dispatchInteract(playerId, backendEntityId, tick) {
    const player = this.#players.get(playerId);
    if (!player || !Number.isSafeInteger(backendEntityId) || backendEntityId < 0 || !Number.isFinite(tick)) return false;
    const targetEntity = this.#allQueryableEntities().find(entity => entity._backendEntityId === backendEntityId);
    if (!targetEntity) return false;
    const event = createGameInteractEvent(tick, player, targetEntity);
    targetEntity._signals.interact.emit(event, error => this.#reportError("entityInteract", error));
    this.#signals.interact.emit(event, error => this.#reportError("interact", error));
    return true;
  }

  dispatchChat(playerId, message) {
    const player = this.#players.get(playerId);
    if (!player) return false;
    const text = String(message ?? "").trim();
    if (!text) return false;
    // The native player echoes submitted chat into the game-chat stream before
    // map callbacks run. Keep that visible behavior for the local runner.
    Promise.resolve(this.sendChatMessage(undefined, { text: `${player.name}: ${text}` }))
      .catch(error => this.#reportError("chat-send", error));
    this.#signals.chat.emit(createGameChatEvent(this.currentTick, player, text), error => this.#reportError("chat", error));
    return true;
  }

  dispatchGuiMessage(playerId, name, payload) {
    const player = this.#players.get(playerId);
    if (!player) return false;
    this.gui.dispatch(player, name, payload);
    return true;
  }

  dispatchClientEvent(playerId, event) {
    this.#require("server.remote-channel");
    const player = this.#players.get(playerId);
    if (!player) return false;
    this.#signals.clientEvent.emit(Object.freeze({ tick: this.currentTick, player, event: structuredClone(event) }), error => this.#reportError("clientEvent", error));
    return true;
  }

  applyAuthoritativeState(playerId, state) {
    const player = this.#players.get(playerId);
    if (!player || player._authority !== "backend") return false;
    if (this.currentTick < player._writeBarrierTick) return false;
    const version = Number(state.tick ?? 0);
    if (Number.isFinite(version) && version < player._stateVersion) return false;
    if (state.position) player._body.position.copy(Vector3.from(state.position));
    if (state.velocity) player._body.velocity.copy(Vector3.from(state.velocity));
    for (const field of PLAYER_PUBLIC_NUMBER_FIELDS) {
      if (Object.hasOwn(state, field)) player[`_${field}`] = requireFiniteRange(state[field], `player ${field}`, 0, 1024);
    }
    if (Object.hasOwn(state, "bodyHalfExtents") || Object.hasOwn(state, "bodyShapeHalfExtents")) {
      const shape = state.bodyHalfExtents === null && state.bodyShapeHalfExtents === null
        ? null
        : { boundsHalfExtents: state.bodyHalfExtents, shapeHalfExtents: state.bodyShapeHalfExtents };
      player._body.applyAuthoritativePostureShape(shape);
    }
    player._stateVersion = Number.isFinite(version) ? version : player._stateVersion + 1;
    player._backendPlayerId = state.playerId ?? player._backendPlayerId;
    player._lastBackendTick = Number.isFinite(version) ? version : player._lastBackendTick;
    return true;
  }

  snapshot() {
    return Object.freeze({
      tick: this.currentTick,
      players: Object.freeze([...this.#players.values()].map(player => player.snapshot())),
      entities: Object.freeze([...this.#entities.values()].map(entity => entity.snapshot())),
      messages: Object.freeze(this.#messages.map(message => ({ ...message }))),
      outboundEvents: Object.freeze(this.#outboundEvents.map(event => structuredClone(event))),
      physics: this.collisionWorld.diagnostics(),
      worldPhysics: Object.freeze({
        gravity: Number(this.#world?.gravity ?? -0.1),
        airFriction: Number(this.#world?.airFriction ?? 0.01),
        tickRate: this.tickRate,
        materials: this.#worldMaterials,
      }),
    });
  }

  #createGlobals() {
    const worldProperties = {
      get currentTick() { return runtime.currentTick; },
      get size() {
        runtime.#require("server.world.voxels");
        return runtime.voxels.shape;
      },
      // DAO3 世界随机种子（index.js 用 Math.random(`${world.seed}`) 决定植物/装饰分布）。
      // 本地确定性：0 表示固定世界；脚本可自行赋值覆盖。
      get seed() { return runtime.#seed; },
      set seed(value) { runtime.#seed = Number(value); },
      onTick: handler => this.#listen("server.world.events", this.#signals.tick, handler),
      onPlayerJoin: handler => this.#listen("server.world.events", this.#signals.playerJoin, handler),
      onPlayerLeave: handler => this.#listen("server.world.events", this.#signals.playerLeave, handler),
      nextPlayerLeave: filter => this.#next("server.world.events", this.#signals.playerLeave, filter),
      onEntityCreate: handler => this.#listen("server.world.events", this.#signals.entityCreate, handler),
      nextEntityCreate: filter => this.#next("server.world.events", this.#signals.entityCreate, filter),
      onEntityDestroy: handler => this.#listen("server.world.events", this.#signals.entityDestroy, handler),
      nextEntityDestroy: filter => this.#next("server.world.events", this.#signals.entityDestroy, filter),
      onRespawn: handler => this.#listen("server.world.events", this.#signals.respawn, handler),
      nextRespawn: filter => this.#next("server.world.events", this.#signals.respawn, filter),
      onTakeDamage: handler => this.#listen("server.world.events", this.#signals.takeDamage, handler),
      nextTakeDamage: filter => this.#next("server.world.events", this.#signals.takeDamage, filter),
      onChat: handler => this.#listen("server.world.chat", this.#signals.chat, handler),
      nextChat: filter => this.#next("server.world.chat", this.#signals.chat, filter),
      onPress: handler => this.#listen("server.world.events", this.#signals.press, handler),
      nextPress: filter => this.#next("server.world.events", this.#signals.press, filter),
      onClick: handler => this.#listen("server.world.events", this.#signals.click, handler),
      nextClick: filter => this.#next("server.world.events", this.#signals.click, filter),
      onInteract: handler => this.#listen("server.world.events", this.#signals.interact, handler),
      nextInteract: filter => this.#next("server.world.events", this.#signals.interact, filter),
      onRelease: handler => this.#listen("server.world.events", this.#signals.release, handler),
      nextRelease: filter => this.#next("server.world.events", this.#signals.release, filter),
      onFluidEnter: handler => this.#listen("server.world.events", this.#signals.fluidEnter, handler),
      nextFluidEnter: filter => this.#next("server.world.events", this.#signals.fluidEnter, filter),
      onFluidLeave: handler => this.#listen("server.world.events", this.#signals.fluidLeave, handler),
      nextFluidLeave: filter => this.#next("server.world.events", this.#signals.fluidLeave, filter),
      onDie: handler => this.#listen("server.world.events", this.#signals.die, handler),
      nextDie: filter => this.#next("server.world.events", this.#signals.die, filter),
      onEntityContact: handler => this.#listen("server.world.events", this.#signals.entityContact, handler),
      nextEntityContact: filter => this.#next("server.world.events", this.#signals.entityContact, filter),
      onEntitySeparate: handler => this.#listen("server.world.events", this.#signals.entitySeparate, handler),
      nextEntitySeparate: filter => this.#next("server.world.events", this.#signals.entitySeparate, filter),
      onPlayerPurchaseSuccess: handler => this.#listen("server.world.events", this.#signals.playerPurchaseSuccess, handler),
      nextPlayerPurchaseSuccess: filter => this.#next("server.world.events", this.#signals.playerPurchaseSuccess, filter),
      onVoxelContact: handler => this.#listen("server.world.events", this.#signals.voxelContact, handler),
      nextVoxelContact: filter => this.#next("server.world.events", this.#signals.voxelContact, filter),
      onVoxelSeparate: handler => this.#listen("server.world.events", this.#signals.voxelSeparate, handler),
      nextVoxelSeparate: filter => this.#next("server.world.events", this.#signals.voxelSeparate, filter),
      onContact: handler => this.#listen("server.world.events", this.#signals.contact, handler),
      onContactSeparate: handler => this.#listen("server.world.events", this.#signals.contactSeparate, handler),
      onTriggerEnter: handler => this.#listen("server.world.events", this.#signals.triggerEnter, handler),
      onTriggerLeave: handler => this.#listen("server.world.events", this.#signals.triggerLeave, handler),
      nextTick: filter => this.#next("server.world.events", this.#signals.tick, filter),
      nextPlayerJoin: filter => this.#next("server.world.events", this.#signals.playerJoin, filter),
      say: message => {
        this.#require("server.world.chat");
        const text = String(message);
        this.#messages.push({ tick: this.currentTick, text });
        this.logger.info(`[script:world] ${text}`);
        this.#queueChat(undefined, { text, senderId: 0, private: false, duration: 0, hideFloat: false });
      },
      createEntity: spec => {
        this.#require("server.world.entities");
        if (this.#entities.size >= this.entityLimit) {
          this.logger.error("[script:world] entity limit exceeded");
          return null;
        }
        const id = spec?.id ?? `runtime-entity-${this.#entities.size + 1}`;
        if (this.#entities.has(id)) throw new Error(`Entity already exists: ${id}`);
        const entity = createRuntimeEntity({
          id,
          name: spec?.name,
          kind: spec?.kind ?? "entity",
          position: spec?.position ?? [0, 0, 0],
          velocity: spec?.velocity,
          tags: spec?.tags ?? [],
          source: spec?.source,
          mesh: spec?.mesh,
          collides: spec?.collides,
          fixed: spec?.fixed,
          gravity: spec?.gravity,
          mass: spec?.mass,
          friction: spec?.friction,
          restitution: spec?.restitution,
          meshScale: spec?.meshScale,
          meshOrientation: spec?.meshOrientation,
          meshOffset: spec?.meshOffset,
          anchorOffset: spec?.anchorOffset,
          meshColor: spec?.meshColor,
          meshInvisible: spec?.meshInvisible,
          meshMetalness: spec?.meshMetalness,
          meshEmissive: spec?.meshEmissive,
          meshShininess: spec?.meshShininess,
          enableInteract: spec?.enableInteract,
          interactHint: spec?.interactHint,
          enableDamage: spec?.enableDamage,
          showHealthBar: spec?.showHealthBar,
          hp: spec?.hp,
          maxHp: spec?.maxHp,
          particleRate: spec?.particleRate,
          particleRateSpread: spec?.particleRateSpread,
          particleLimit: spec?.particleLimit,
          particleLifetime: spec?.particleLifetime,
          particleLifetimeSpread: spec?.particleLifetimeSpread,
          particleSize: spec?.particleSize,
          particleSizeSpread: spec?.particleSizeSpread,
          particleColor: spec?.particleColor,
          particleVelocity: spec?.particleVelocity,
          particleVelocitySpread: spec?.particleVelocitySpread,
          particleDamping: spec?.particleDamping,
        }, this);
        this.#entities.set(id, entity);
        const event = createGameEntityEvent(this.currentTick, entity);
        this.#signals.entityCreate.emit(event, error => this.#reportError("entityCreate", error));
        this.#projectEntity(entity);
        return entity;
      },
      querySelector: selector => this.#query(selector)[0] ?? null,
      entityQuota: () => Math.max(0, this.entityLimit - this.#entities.size),
      querySelectorAll: selector => this.#query(selector),
      testSelector: (selector, entity) => this.#matchesSelector(entity, selector),
      raycast: (origin, direction, options) => raycastWorld({
        origin,
        direction,
        options,
        voxels: this.voxels,
        entities: this.#allQueryableEntities(),
        matchesSelector: (entity, selector) => this.#matchesSelector(entity, selector),
      }),
      searchBox: bounds => searchRuntimeEntities(bounds, this.#allQueryableEntities()),
      zones: () => Object.freeze(runtime.zones.list()),
      addZone: config => runtime.zones.add(config),
      removeZone: zone => runtime.zones.remove(zone),
      addCollisionFilter: (aSelector, bSelector) => {
        const pair = [aSelector, bSelector];
        this.#collisionFilters.set(JSON.stringify(pair), pair);
      },
      removeCollisionFilter: (aSelector, bSelector) => {
        this.#collisionFilters.delete(JSON.stringify([aSelector, bSelector]));
      },
      clearCollisionFilters: () => this.#collisionFilters.clear(),
      collisionFilters: () => [...this.#collisionFilters.values()].map(pair => [...pair]),
      teleport: (target, position, serverId) => {
        // DAO3's privileged overload moves a batch to another map. The local
        // runner cannot launch an external published container, but preserves
        // the async contract and stable destination server id for scripts.
        if (typeof target === "string" && Array.isArray(position)) {
          const destination = serverId && serverId !== "public" ? String(serverId) : `local-${target}-${this.projectName}`;
          return Promise.resolve({ serverId: destination });
        }
        const entity = target?.isPlayer ? target.player : target;
        if (!entity || !entity.position) throw new TypeError("world.teleport target must be an entity");
        entity.position = Vector3.from(position);
        if (entity.isPlayer) entity.player.spawnPoint = Vector3.from(position);
        return entity;
      },
      animate: (keyframes, playback) => this._createAnimation(world, keyframes, playback),
      getAnimations: () => this._getAnimations(world),
      getEntityAnimations: () => Object.freeze([...this.#animations].filter(animation => animation.target !== world && !animation.target?._entity)),
      getPlayerAnimations: () => Object.freeze([...this.#animations].filter(animation => Boolean(animation.target?._entity))),
      sound: spec => this._playSound(normalizeWorldSound(spec)),
      createTempChat: users => {
        const id = `local-chat-${this.#tempChats.size + 1}`;
        const members = new Set(Array.isArray(users) ? users.map(String) : []);
        this.#tempChats.set(id, members);
        return Promise.resolve(id);
      },
      destroyTempChat: chatId => {
        const existed = this.#tempChats.delete(String(chatId));
        return Promise.resolve(existed);
      },
      addTempChatPlayer: (chatId, users) => {
        const members = this.#tempChats.get(String(chatId));
        if (!members) return Promise.resolve([]);
        for (const user of Array.isArray(users) ? users : [users]) members.add(String(user));
        return Promise.resolve([...members]);
      },
      removeTempChatPlayer: (chatId, users) => {
        const members = this.#tempChats.get(String(chatId));
        if (!members) return Promise.resolve([]);
        for (const user of Array.isArray(users) ? users : [users]) members.delete(String(user));
        return Promise.resolve([...members]);
      },
      getTempChats: () => Promise.resolve([...this.#tempChats.keys()]),
      getTempChatUsers: chatId => Promise.resolve([...(this.#tempChats.get(String(chatId)) ?? [])]),
    };
    const world = Object.defineProperties(new GameWorld(), Object.getOwnPropertyDescriptors(worldProperties));
    Object.defineProperty(world, "projectName", { value: this.projectName, enumerable: true, writable: false, configurable: false });
    if (this.#initialWorldPhysics !== null) {
      world.gravity = this.#initialWorldPhysics.gravity;
      world.airFriction = this.#initialWorldPhysics.airFriction;
      this.physics.setDaoWorldPhysics(world.gravity, world.airFriction, this.tickRate);
    }
    this.#world = world;
    this.#worldPhysicsSnapshot = Object.freeze({ gravity: world.gravity, airFriction: world.airFriction });
    const guardedWorld = createCapabilityFacade(world, () => this.#require("server.world.config"), WORLD_CONFIG_CAPABILITY_MEMBERS);
    const sendRemoteEvent = (player, event) => {
      const playerId = this.#playerIds.get(player);
      if (!playerId || !this.#players.has(playerId)) return;
      const clonedEvent = cloneJsonValue(event);
      this.#outboundEvents.push({ playerId, event: clonedEvent });
      this.logger.info(`[script:remote] -> ${player.name} ${JSON.stringify(clonedEvent)}`);
      Promise.resolve(this.sendClientEvent(playerId, structuredClone(clonedEvent))).catch(error => this.#reportError("remote-send", error));
    };
    const remoteChannel = Object.freeze({
      onClientEvent: handler => this.#listen("server.remote-channel", this.#signals.clientEvent, handler),
      nextClientEvent: filter => this.#next("server.remote-channel", this.#signals.clientEvent, filter),
      onServerEvent: handler => this.#listen("server.remote-channel", this.#signals.clientEvent, ({ tick, player, event }) => handler(Object.freeze({
        tick,
        entity: player,
        args: event,
      }))),
      sendClientEvent: (players, event) => {
        this.#require("server.remote-channel");
        for (const player of Array.isArray(players) ? players : [players]) sendRemoteEvent(player, event);
      },
      broadcastClientEvent: event => {
        this.#require("server.remote-channel");
        for (const player of this.#players.values()) sendRemoteEvent(player, event);
      },
    });
    const runtime = this;
    const voxels = createCapabilityFacade(this.voxels, () => this.#require("server.world.voxels"));
    const gui = createCapabilityFacade(this.gui, () => this.#require("server.gui"), GUI_CAPABILITY_MEMBERS);
    const storage = createCapabilityFacade(this.storage, () => this.#require("server.storage"));
    const http = createCapabilityFacade(this.http, () => this.#require("server.http"));
    return {
      world: guardedWorld,
      remoteChannel,
      storage,
      gui,
      voxels,
      // DAO3 worldBlock API：方块读写（getBlock/setBlock/getVoxel/setVoxel）。
      // getBlock 返回 blockId（不含 rotation），setBlock 支持字符串方块名
      // （如 "air"/"stone"），与 GameVoxelsRuntime.setVoxel 一致。
      worldBlock: Object.freeze({
        getBlock: (x, y, z) => this.voxels.getVoxel(x | 0, y | 0, z | 0),
        setBlock: (x, y, z, voxel, rotation) => this.voxels.setVoxel(x | 0, y | 0, z | 0, voxel, rotation),
        getVoxel: (x, y, z) => this.voxels.getVoxel(x | 0, y | 0, z | 0),
        setVoxel: (x, y, z, voxel, rotation) => this.voxels.setVoxel(x | 0, y | 0, z | 0, voxel, rotation),
        getVoxelId: (x, y, z) => this.voxels.getVoxelId(x | 0, y | 0, z | 0),
        setVoxelId: (x, y, z, fullId) => this.voxels.setVoxelId(x | 0, y | 0, z | 0, fullId),
        name: id => this.voxels.name(id),
        id: name => this.voxels.id(name),
        isFluid: id => this.voxels.isFluid(id),
      }),
      http,
      Vector3,
      GameVector3: Vector3,
      GameQuaternion,
      GameEventHandlerToken,
      GameRGBColor,
      GameRGBAColor,
      GameBounds3,
      GameButtonType,
      GameCameraMode,
      GameWorld,
      GameEntity: class GameEntity {},
      GameSoundEffect,
      GameBodyPart,
      Vec3: Object.freeze({ create: value => Vector3.from(value) }),
      console: Object.freeze({
        clear: () => this.logger.clear?.(),
        dir: () => {},
        dirxml: () => {},
        group: () => {},
        groupCollapsed: () => {},
        groupEnd: () => {},
        table: () => {},
        time: () => {},
        timeEnd: () => {},
        timeLog: () => {},
        timeStamp: () => {},
        trace: () => {},
        assert: (assertion, ...values) => { if (!assertion) this.logger.error(`[script] ${values.map(formatValue).join(" ")}`); },
        log: (...values) => this.logger.info(`[script] ${values.map(formatValue).join(" ")}`),
        info: (...values) => this.logger.info(`[script] ${values.map(formatValue).join(" ")}`),
        debug: (...values) => (this.logger.debug ?? this.logger.info)(`[script] ${values.map(formatValue).join(" ")}`),
        warn: (...values) => this.logger.warn(`[script] ${values.map(formatValue).join(" ")}`),
        error: (...values) => this.logger.error(`[script] ${values.map(formatValue).join(" ")}`),
      }),
      setTimeout: (handler, milliseconds, ...args) => this.#schedule(handler, milliseconds, args),
      setInterval: (handler, milliseconds, ...args) => this.#scheduleInterval(handler, milliseconds, args),
      clearTimeout: timer => {
        this.#timers.delete(timer);
        clearTimeout(timer);
      },
      clearInterval: timer => {
        this.#timers.delete(timer);
        clearInterval(timer);
      },
      sleep: milliseconds => new Promise(resolveSleep => this.#schedule(resolveSleep, milliseconds, [])),
      // Recovered dialog enum used by real maps (parkour "帮助" command).
      Box3DialogType: Object.freeze({ TEXT: 0, RICH_TEXT: 1, PLAYER_LIST: 2, PLAYER: 3 }),
      structuredClone,
    };
  }

  #listen(capability, signal, handler) {
    this.#require(capability);
    return signal.on(handler);
  }

  #next(capability, signal, filter) {
    this.#require(capability);
    return signal.next(filter);
  }

  #schedule(handler, milliseconds, args) {
    if (typeof handler !== "function") throw new TypeError("Timer handler must be a function");
    const delay = Math.max(0, Math.min(Number(milliseconds) || 0, 60_000));
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      try {
        Promise.resolve(handler(...args)).catch(error => this.#reportError("timer", error));
      } catch (error) {
        this.#reportError("timer", error);
      }
    }, delay);
    timer.unref?.();
    this.#timers.add(timer);
    return timer;
  }

  #scheduleInterval(handler, milliseconds, args) {
    if (typeof handler !== "function") throw new TypeError("Timer handler must be a function");
    const delay = Math.max(1, Math.min(Number(milliseconds) || 0, 60_000));
    const timer = setInterval(() => {
      try { Promise.resolve(handler(...args)).catch(error => this.#reportError("timer", error)); } catch (error) { this.#reportError("timer", error); }
    }, delay);
    timer.unref?.();
    this.#timers.add(timer);
    return timer;
  }

  #query(selector) {
    this.#require("server.world.entities");
    return this.#allQueryableEntities().filter(entity => this.#matchesSelector(entity, selector));
  }

  #dispatchFluidEvent(signalName, entity, contact) {
    const event = Object.freeze(new RuntimeFluidContactEvent(this.currentTick, entity, contact.voxel));
    this.#signals[signalName].emit(event, error => this.#reportError(signalName, error));
    entity._signals[signalName].emit(event, error => this.#reportError(`${entity.id}.${signalName}`, error));
  }

  #syncWorldPhysics() {
    if (!this.#world || !this.#worldPhysicsSnapshot) return;
    const gravity = this.#world.gravity;
    const airFriction = this.#world.airFriction;
    if (Object.is(gravity, this.#worldPhysicsSnapshot.gravity) && Object.is(airFriction, this.#worldPhysicsSnapshot.airFriction)) return;
    this.physics.setDaoWorldPhysics(gravity, airFriction, this.tickRate);
    this.#worldPhysicsSnapshot = Object.freeze({ gravity, airFriction });
  }

  #enforcePlayerMovementBounds(player) {
    if (player.movementBounds.contains(player.position)) return;
    player._body.position.copy(player.spawnPoint);
    player._body.velocity.set(0, 0, 0);
  }

  #allQueryableEntities() {
    return [...this.#entities.values(), ...this.#players.values()];
  }

  #matchesSelector(entity, selector) {
    return matchesGameSelector(entity, selector);
  }

  #require(capability) {
    if (!this.capabilities.has(capability)) throw new Error(`Script capability not granted: ${capability}`);
  }

  #reportError(source, error) {
    this.logger.error(`[script:${source}] ${formatRuntimeError(error)}`);
  }

  _runtimePlayerId(player) {
    return this.#playerIds.get(player);
  }

  _entityByBackendId(id) {
    if (!Number.isInteger(id) || id <= 0) return null;
    for (const player of this.#players.values()) {
      if (player._backendPlayerId === id) return player;
    }
    for (const entity of this.#entities.values()) {
      if (entity._backendEntityId === id) return entity;
    }
    return null;
  }

  _writePlayer(player, field, value) {
    this.#require("server.player.write");
    if (field === "name") player._name = String(value).slice(0, 64);
    else if (field === "position") player._body.position.copy(Vector3.from(value));
    else if (field === "velocity") player._body.velocity.copy(Vector3.from(value));
    else if (PLAYER_PUBLIC_NUMBER_FIELDS.includes(field)) player[`_${field}`] = requireFiniteRange(value, `player ${field}`, 0, 1024);
    if (field === "position" || field === "velocity" || PLAYER_PUBLIC_NUMBER_FIELDS.includes(field)) this.#queuePlayerStateWrite(player);
  }

  _dialogPlayer(player, config) {
    this.#require("server.player");
    return Promise.resolve(this.showDialog(this.#playerIds.get(player), structuredClone(config)));
  }

  _entityContactsForPlayer(player) {
    return [...this.#entities.values()]
      .filter(entity => !entity.destroyed && entity._contactPlayers.has(player))
      .map(entity => Object.freeze({ other: entity, force: new Vector3(0, 0, 0), axis: new Vector3(0, 0, 0) }));
  }

  _cancelPlayerDialogs(player) {
    this.#require("server.player");
    return this.cancelDialogs(this.#playerIds.get(player));
  }

  _messagePlayer(player, message) {
    this.#require("server.world.chat");
    if (!isLiveChatEntity(player)) return;
    const text = String(message);
    this.#messages.push({ tick: this.currentTick, playerId: player.id, text });
    this.logger.info(`[script:player:${player.name}] ${text}`);
    this.#queueChat(this.#playerIds.get(player), { text, senderId: 0, private: true, duration: 0, hideFloat: false });
  }

  _messageEntity(entity, message, options) {
    this.#require("server.world.chat");
    if (!isLiveChatEntity(entity)) return;
    const text = String(message);
    const duration = options?.duration ? options.duration === Infinity ? -1 : Number(options.duration) : 0;
    const hideFloat = Boolean(options?.hideFloat);
    this.#messages.push({ tick: this.currentTick, entityId: entity.id, text, duration, hideFloat });
    this.logger.info(`[script:entity:${entity.id}] ${text}`);
    if (entity._backendEntityBound !== true || !Number.isSafeInteger(entity._backendEntityId) || entity._backendEntityId < 1) return;
    this.#queueChat(undefined, {
      text,
      senderId: entity._backendEntityId,
      private: false,
      duration,
      hideFloat,
    });
  }

  _soundEntity(entity, spec) {
    return this._playSound(entity.isPlayer
      ? normalizePlayerSound(spec, entity._backendPlayerId)
      : normalizeEntitySound(spec, entity._backendEntityId));
  }

  _createAnimation(target, keyframes, playback) {
    const animation = new GameAnimation(target, keyframes, playback, this.currentTick);
    this.#animations.add(animation);
    return animation;
  }

  _getAnimations(target) { return Object.freeze([...this.#animations].filter(animation => animation.target === target)); }

  _playSound(spec) {
    this.#require("server.world.entities");
    const soundId = this._nextSoundId = (this._nextSoundId ?? 0) + 1;
    const command = { action: "play", soundId, ...spec };
    const send = next => Promise.resolve(this.sendSoundCommand(structuredClone(next))).catch(error => this.#reportError("sound-send", error));
    send(command);
    return new Sound(
      currentTime => send(typeof currentTime === "number" ? { action: "setCurrentTimeAndResume", soundId, currentTime } : { action: "resume", soundId }),
      currentTime => send({ action: "setCurrentTime", soundId, currentTime: Number(currentTime) }),
      () => send({ action: "pause", soundId }),
      () => send({ action: "stop", soundId }),
    );
  }

  #queueChat(sessionId, message) {
    for (const delivery of this.#chatFifo.enqueue(Object.freeze({ sessionId, message: structuredClone(message) }))) this.#deliverChat(delivery);
  }

  #deliverChat(delivery) {
    Promise.resolve(this.sendChatMessage(delivery.sessionId, structuredClone(delivery.message))).catch(error => this.#reportError("chat-send", error));
  }

  #deliverChatBatch(deliveries) {
    if (deliveries.length === 0) return;
    const batch = deliveries.map(delivery => Object.freeze({ sessionId: delivery.sessionId, message: structuredClone(delivery.message) }));
    Promise.resolve(this.sendChatMessages(Object.freeze(batch))).catch(error => this.#reportError("chat-send", error));
  }

  _applyImpulse(player, value) {
    this.#require("server.player.write");
    const impulse = Vector3.from(value);
    player._body.velocity.x += impulse.x;
    player._body.velocity.y += impulse.y;
    player._body.velocity.z += impulse.z;
    this.#queuePlayerStateWrite(player);
  }

  _forceRespawnPlayer(player) {
    this.#require("server.player.write");
    player._body.position.copy(player.spawnPoint);
    player._body.velocity.set(0, 0, 0);
    player._body.grounded = false;
    player._body.contacts.clear();
    player._body.fluids.clear();
    player._body.triggers.clear();
    this.#queuePlayerStateWrite(player);
    this.#queueDamageStateWrite(player, { respawn: true });
    const event = createGameRespawnEvent(this.currentTick, player);
    player._signals.respawn.emit(event, error => this.#reportError("playerRespawn", error));
    this.#signals.respawn.emit(event, error => this.#reportError("respawn", error));
  }

  _kickPlayer(player) {
    this.#require("server.player.write");
    const playerId = this.#playerIds.get(player);
    if (!playerId || !this.#players.has(playerId)) return;
    Promise.resolve(this.kickPlayer(playerId)).catch(error => this.#reportError("player-kick", error));
  }

  _linkPlayer(player, href, options) {
    this.#require("server.player.write");
    const playerId = this.#playerIds.get(player);
    if (!playerId || !this.#players.has(playerId)) return;
    if (options !== undefined && (!options || typeof options !== "object" || Array.isArray(options))) throw new TypeError("Player link options must be an object");
    const normalizedOptions = options === undefined ? undefined : {
      isConfirm: options.isConfirm === undefined ? true : Boolean(options.isConfirm),
      isNewTab: options.isNewTab === undefined ? true : Boolean(options.isNewTab),
    };
    Promise.resolve(this.linkPlayer(playerId, String(href), normalizedOptions)).catch(error => this.#reportError("player-link", error));
  }

  _setPlayerSkin(player, skinName) {
    this.#require("server.player.write");
    if (typeof skinName !== "string") {
      this.logger.warn(`Player skin name must be a string: ${JSON.stringify(skinName)}`);
      return false;
    }
    const skinId = this.validatedSkinIds.get(skinName);
    if (skinId === undefined) {
      this.logger.warn(`Player skin name is not present in the validated resource catalog: ${skinName}`);
      return false;
    }
    for (const bodyPart of Object.values(GameBodyPart)) {
      player.skin[bodyPart] = skinName;
      player._skinIds[bodyPart] = skinId;
    }
    this.#queuePlayerStateWrite(player);
    return true;
  }

  _resetPlayerSkin(player) {
    if (typeof this.defaultSkinName !== "string" || !this.validatedSkinIds.has(this.defaultSkinName)) {
      this.logger.warn("Player default skin is unavailable because no validated default skin mapping was provided");
      return false;
    }
    return this._setPlayerSkin(player, this.defaultSkinName);
  }

  _clearPlayerSkin(player) {
    this.#require("server.player.write");
    for (const bodyPart of Object.values(GameBodyPart)) {
      player.skin[bodyPart] = null;
      player._skinIds[bodyPart] = 0;
    }
    this.#queuePlayerStateWrite(player);
  }

  _hurtEntity(entity, amount, options) {
    this.#require("server.world.events");
    const damage = Number(amount);
    // Historical Player semantics: damage is ignored while dead, but negative
    // damage (healing) is still accepted so hp can cross back to non-negative
    // and emit respawn.
    if (entity.destroyed || Number.isNaN(damage) || !entity.enableDamage || (Number(entity.hp) < 0 && damage >= 0)) return;
    const normalized = normalizeHurtOptions(options);
    const attacker = damage < 0 ? null : this.#resolveHurtAttacker(normalized.attacker);
    const damageType = damage < 0 ? "" : normalized.damageType;
    const previousHp = Number(entity.hp);
    if (damage < 0) {
      if (Number(entity.hp) < Number(entity.maxHp)) entity._hp = Math.min(Number(entity.maxHp), Number(entity.hp) - damage);
    } else {
      entity._hp = Number(entity.hp) - damage;
    }
    entity._lastAttacker = attacker;
    entity._lastDamageType = damageType;
    const damageEvent = createGameDamageEvent(this.currentTick, entity, damage, attacker, damageType);
    entity._signals.takeDamage.emit(damageEvent, error => this.#reportError("entityTakeDamage", error));
    this.#signals.takeDamage.emit(damageEvent, error => this.#reportError("takeDamage", error));
    const died = previousHp >= 0 && Number(entity.hp) < 0;
    const respawned = previousHp < 0 && Number(entity.hp) >= 0;
    if (died) {
      const dieEvent = createGameDieEvent(this.currentTick, entity, attacker, damageType);
      entity._signals.die.emit(dieEvent, error => this.#reportError("entityDie", error));
      this.#signals.die.emit(dieEvent, error => this.#reportError("die", error));
    }
    if (entity.hurtSound?.sample) this._soundEntity(entity, entity.hurtSound);
    if (died && entity.dieSound?.sample) this._soundEntity(entity, entity.dieSound);
    if (respawned) {
      const respawnEvent = createGameRespawnEvent(this.currentTick, entity);
      entity._signals.respawn?.emit(respawnEvent, error => this.#reportError("entityRespawn", error));
      this.#signals.respawn.emit(respawnEvent, error => this.#reportError("respawn", error));
    }
    this.#queueDamageStateWrite(entity, { hurt: damage, die: died, respawn: respawned });
  }

  _damagePlayer(player, amount) {
    this.#require("server.player.write");
    const enabled = player.enableDamage;
    player.enableDamage = true;
    try {
      this._hurtEntity(player, amount);
      return player.hp;
    } finally {
      player.enableDamage = enabled;
    }
  }

  _givePlayer(player, name, count = 1) {
    const item = String(name);
    const amount = Math.trunc(Number(count));
    if (!item || !Number.isSafeInteger(amount) || amount === 0) throw new TypeError("Give requires a non-empty item and nonzero integer count");
    const next = Math.max(0, (player._inventory.get(item) ?? 0) + amount);
    if (next === 0) player._inventory.delete(item);
    else player._inventory.set(item, next);
    this._syncPlayerGameplay(player, { action: "give", item, amount, count: next });
    return next;
  }

  _clearPlayerBuffs(player) {
    player._buffs.clear();
    this._syncPlayerGameplay(player, { action: "buff-clear" });
    return Object.freeze({});
  }

  _setPlayerGameMode(player, mode) {
    const value = Math.max(0, Math.min(3, Math.trunc(Number(mode) || 0)));
    player._gameMode = value;
    player.spectator = value === 3;
    player.canFly = value === 1 || value === 3;
    this.#queuePlayerStateWrite(player);
    this._syncPlayerGameplay(player, { action: "gamemode", mode: value });
    return value;
  }

  _syncPlayerGameplay(player, detail) {
    const playerId = this.#playerIds.get(player);
    if (!playerId) return;
    const event = {
      type: "nea-revive:player-gameplay",
      ...detail,
      gamemode: player._gameMode,
      inventory: Object.fromEntries(player._inventory),
      buffs: [...player._buffs],
    };
    Promise.resolve(this.sendClientEvent(playerId, event)).catch(error => this.#reportError("gameplay-send", error));
  }

  _sendPlayerUiEvent(player, action, payload = {}) {
    const playerId = this.#playerIds.get(player);
    if (!playerId) return false;
    Promise.resolve(this.sendClientEvent(playerId, { type: "nea-revive:player-ui", action, ...structuredClone(payload) }))
      .catch(error => this.#reportError("player-ui-send", error));
    return true;
  }

  #resolveHurtAttacker(attacker) {
    if (!attacker || typeof attacker !== "object") return null;
    for (const player of this.#players.values()) {
      if (player === attacker) return attacker;
    }
    for (const entity of this.#entities.values()) {
      if (entity === attacker) return attacker;
    }
    return null;
  }

  #queuePlayerStateWrite(player) {
    if (player._authority !== "backend") return;
    player._stateVersion += 1;
    player._writeBarrierTick = this.currentTick + 4;
    const state = {
      position: player._body.position.toArray(),
      velocity: player._body.velocity.toArray(),
      version: player._stateVersion,
    };
    for (const field of PLAYER_PUBLIC_NUMBER_FIELDS) state[field] = player[`_${field}`];
    if (Object.values(player._skinIds).every(Number.isSafeInteger)) state.avatarSkin = { ...player._skinIds };
    Promise.resolve(this.writePlayerState(this.#playerIds.get(player), state)).catch(error => this.#reportError("state-write", error));
  }

  _damageFieldChanged(entity) {
    this.#queueDamageStateWrite(entity);
  }

  _destroyEntity(entity) {
    this.#require("server.world.entities");
    if (entity.isPlayer || entity.destroyed) return;
    entity._destroyed = true;
    this.#entities.delete(entity._id);
    const event = createGameEntityEvent(this.currentTick, entity);
    entity._signals.destroy.emit(event, error => this.#reportError("entityDestroy", error));
    this.#signals.entityDestroy.emit(event, error => this.#reportError("entityDestroy", error));
    if (Number.isSafeInteger(entity._backendEntityId) && entity._backendEntityId > 0) {
      this.#entityBackendBridge.destroy(entity);
    }
  }

  #queueDamageStateWrite(entity, events = {}) {
    const playerId = this.#playerIds.get(entity);
    const target = playerId !== undefined
      ? { playerId }
      : Number.isSafeInteger(entity._backendEntityId) && entity._backendEntityId > 0
        ? { entityId: entity._backendEntityId }
        : null;
    if (!target) return;
    const state = {
      showHealthBar: Boolean(entity.showHealthBar),
      hp: Number(entity.hp),
      maxHp: Number(entity.maxHp),
    };
    Promise.resolve(this.writeDamageState(target, state, structuredClone(events))).catch(error => this.#reportError("damage-state-write", error));
  }

  #projectEntity(entity) {
    this.#entityBackendBridge.project(entity, projected => this.#queueDamageStateWrite(projected));
  }

  _entityTransformChanged(entity) {
    this.#entityBackendBridge.queueStateWrite(entity);
  }

  _entityPhysicsChanged(entity) {
    this.#entityBackendBridge.queueStateWrite(entity);
  }

  _particleFieldChanged(entity) {
    if (entity?.isPlayer) {
      this._syncPlayerGameplay(entity, { action: "particles", particles: particleSnapshot(entity) });
      return;
    }
    this.#entityBackendBridge.queueStateWrite(entity);
  }
}

function createParticleState(input = {}) {
  return {
    _particleRate: Number(input.particleRate ?? 0),
    _particleRateSpread: Number(input.particleRateSpread ?? 0),
    _particleLimit: Math.max(0, Math.trunc(Number(input.particleLimit ?? 100))),
    _particleLifetime: Number(input.particleLifetime ?? 10),
    _particleLifetimeSpread: Number(input.particleLifetimeSpread ?? 0),
    _particleSize: Array.isArray(input.particleSize) ? [...input.particleSize].map(Number) : [1, 1, 1, 1, 1],
    _particleSizeSpread: Number(input.particleSizeSpread ?? 0),
    _particleColor: Array.isArray(input.particleColor) ? structuredClone(input.particleColor) : [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]],
    _particleVelocity: Vector3.from(input.particleVelocity ?? [0, 0, 0]),
    _particleVelocitySpread: Vector3.from(input.particleVelocitySpread ?? [0, 0, 0]),
    _particleDamping: Number(input.particleDamping ?? 0),
  };
}

function createParticleAccessors() {
  return {
    get particleRate() { return this._particleRate; },
    set particleRate(value) { this._particleRate = Number(value); this._runtime?._particleFieldChanged(this); },
    get particleRateSpread() { return this._particleRateSpread; },
    set particleRateSpread(value) { this._particleRateSpread = Number(value); this._runtime?._particleFieldChanged(this); },
    get particleLimit() { return this._particleLimit; },
    set particleLimit(value) { this._particleLimit = Math.max(0, Math.trunc(Number(value))); this._runtime?._particleFieldChanged(this); },
    get particleLifetime() { return this._particleLifetime; },
    set particleLifetime(value) { this._particleLifetime = Number(value); this._runtime?._particleFieldChanged(this); },
    get particleLifetimeSpread() { return this._particleLifetimeSpread; },
    set particleLifetimeSpread(value) { this._particleLifetimeSpread = Number(value); this._runtime?._particleFieldChanged(this); },
    get particleSize() { return this._particleSize; },
    set particleSize(value) { this._particleSize = Array.isArray(value) ? [...value].map(Number) : []; this._runtime?._particleFieldChanged(this); },
    get particleSizeSpread() { return this._particleSizeSpread; },
    set particleSizeSpread(value) { this._particleSizeSpread = Number(value); this._runtime?._particleFieldChanged(this); },
    get particleColor() { return this._particleColor; },
    set particleColor(value) { this._particleColor = Array.isArray(value) ? structuredClone(value) : []; this._runtime?._particleFieldChanged(this); },
    get particleVelocity() { return this._particleVelocity; },
    set particleVelocity(value) { this._particleVelocity = Vector3.from(value); this._runtime?._particleFieldChanged(this); },
    get particleVelocitySpread() { return this._particleVelocitySpread; },
    set particleVelocitySpread(value) { this._particleVelocitySpread = Vector3.from(value); this._runtime?._particleFieldChanged(this); },
    get particleDamping() { return this._particleDamping; },
    set particleDamping(value) { this._particleDamping = Number(value); this._runtime?._particleFieldChanged(this); },
  };
}

function particleSnapshot(entity) {
  return Object.freeze({
    rate: finiteOr(entity.particleRate, 0),
    rateSpread: finiteOr(entity.particleRateSpread, 0),
    limit: finiteOr(entity.particleLimit, 100),
    lifetime: finiteOr(entity.particleLifetime, 10),
    lifetimeSpread: finiteOr(entity.particleLifetimeSpread, 0),
    size: Object.freeze([...(entity.particleSize ?? [])]),
    sizeSpread: finiteOr(entity.particleSizeSpread, 0),
    color: structuredClone(entity.particleColor ?? []),
    velocity: Vector3.from(entity.particleVelocity ?? [0, 0, 0]).toArray(),
    velocitySpread: Vector3.from(entity.particleVelocitySpread ?? [0, 0, 0]).toArray(),
    damping: finiteOr(entity.particleDamping, 0),
  });
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasParticleState(entity) {
  const velocity = Vector3.from(entity.particleVelocity ?? [0, 0, 0]);
  const spread = Vector3.from(entity.particleVelocitySpread ?? [0, 0, 0]);
  return finiteOr(entity.particleRate, 0) !== 0
    || finiteOr(entity.particleRateSpread, 0) !== 0
    || finiteOr(entity.particleLimit, 100) !== 100
    || finiteOr(entity.particleLifetime, 10) !== 10
    || finiteOr(entity.particleLifetimeSpread, 0) !== 0
    || (Array.isArray(entity.particleSize) && entity.particleSize.some(value => Number(value) !== 1))
    || finiteOr(entity.particleSizeSpread, 0) !== 0
    || (Array.isArray(entity.particleColor) && entity.particleColor.length > 0)
    || velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0
    || spread.x !== 0 || spread.y !== 0 || spread.z !== 0
    || finiteOr(entity.particleDamping, 0) !== 0;
}

function normalizeInitialWorldPhysics(physics) {
  const hasAirFriction = physics?.airFriction !== undefined;
  if (!hasAirFriction) return null;
  if (!Number.isFinite(physics.gravity) || !Number.isFinite(physics.airFriction)) {
    throw new Error("Runtime world physics must include finite gravity and airFriction values together");
  }
  return Object.freeze({ gravity: physics.gravity, airFriction: physics.airFriction });
}

function createCapabilityFacade(target, requireCapability, guardedMembers = null) {
  const methods = new Map();
  const requiresCapability = property => guardedMembers === null || guardedMembers.has(property);
  return new Proxy(target, {
    get(object, property, receiver) {
      if (requiresCapability(property)) requireCapability();
      const value = Reflect.get(object, property, object);
      if (typeof value !== "function") return value;
      if (!methods.has(property)) methods.set(property, value.bind(object));
      return methods.get(property);
    },
    set(object, property, value, receiver) {
      if (requiresCapability(property)) requireCapability();
      return Reflect.set(object, property, value, object);
    },
  });
}

function quaternionFrom(value) {
  if (value instanceof GameQuaternion) return value.clone();
  if (Array.isArray(value) && value.length === 4) return new GameQuaternion(value[0], value[1], value[2], value[3]);
  if (value && typeof value === "object") return new GameQuaternion(value.w, value.x, value.y, value.z);
  throw new TypeError("Expected a GameQuaternion-compatible value");
}

export function createRuntimeEntity(input, runtime = null) {
  const tags = new Set(input.tags ?? []);
  const position = Vector3.from(input.position ?? [0, 0, 0]);
  return {
    _id: String(input.id),
    _kind: input.kind ?? "entity",
    _name: input.name ?? input.source?.name ?? String(input.id),
    _source: input.source ?? null,
    _sourceIndex: Number.isSafeInteger(input.sourceIndex) ? input.sourceIndex : null,
    _backendEntityId: Number.isSafeInteger(input._backendEntityId) ? input._backendEntityId : null,
    _backendEntityBound: Boolean(input._backendEntityBound),
    _position: position,
    _velocity: Vector3.from(input.velocity ?? [0, 0, 0]),
    _runtime: runtime,
    _lastAttacker: null,
    _lastDamageType: "",
    _bounds: requirePositiveVector3(input.bounds ?? input.source?.bounds ?? [1, 1, 1], "entity bounds"),
    mesh: input.mesh ?? input.source?.mesh ?? "",
    _meshInvisible: Boolean(input.meshInvisible ?? false),
    _meshScale: requireBoundedVector3(input.meshScale ?? [1 / 64, 1 / 64, 1 / 64], "entity meshScale"),
    _meshOrientation: quaternionFrom(input.meshOrientation ?? [0, 0, 0, 1]),
    _meshOffset: requireBoundedVector3(input.meshOffset ?? [0, 0, 0], "entity meshOffset"),
    _anchorOffset: requireBoundedVector3(input.anchorOffset ?? [0, 0, 0], "entity anchorOffset"),
    _meshColor: requireRgbaColor(input.meshColor ?? [1, 1, 1, 1], "entity meshColor"),
    _meshMetalness: requireFiniteRange(input.meshMetalness ?? 0, "entity meshMetalness", 0, 1),
    _meshEmissive: requireFiniteRange(input.meshEmissive ?? 0, "entity meshEmissive", 0, 1),
    _meshShininess: requireFiniteRange(input.meshShininess ?? 0, "entity meshShininess", 0, 1),
    _collides: Boolean(input.collides ?? true),
    _fixed: Boolean(input.fixed ?? false),
    _gravity: Boolean(input.gravity ?? true),
    _mass: Number(input.mass ?? 1),
    _friction: Number(input.friction ?? 0),
    _restitution: Number(input.restitution ?? 0),
    _showEntityName: Boolean(input.showEntityName ?? false),
    _customName: String(input.customName ?? ""),
    _nameRadius: requireFiniteRange(input.nameRadius ?? 16, "entity nameRadius", 0, 4096),
    _nameColor: requireRgbColor(input.nameColor ?? [1, 1, 1], "entity nameColor"),
    ...createEntitySoundSlots(),
    enableInteract: Boolean(input.enableInteract ?? false),
    interactRadius: Number(input.interactRadius ?? 3),
    interactHint: String(input.interactHint ?? ""),
    interactColor: requireRgbColor(input.interactColor ?? [1, 1, 1], "entity interactColor"),
    _tags: tags,
    _signals: { click: new EventSignal(), interact: new EventSignal(), destroy: new EventSignal(), voxelContact: new EventSignal(), voxelSeparate: new EventSignal(), fluidEnter: new EventSignal(), fluidLeave: new EventSignal(), takeDamage: new EventSignal(), die: new EventSignal(), contact: new EventSignal(), contactSeparate: new EventSignal() },
    _contactPlayers: new Set(),
    _destroyed: false,
    _zone: { selector: "" },
    _enableDamage: Boolean(input.enableDamage ?? false),
    _showHealthBar: Boolean(input.showHealthBar ?? true),
    _hp: Number(input.hp ?? 100),
    _maxHp: Number(input.maxHp ?? 100),
    ...createParticleState(input),
    get id() { return this._id; },
    get kind() { return this._kind; },
    get name() { return this._name; },
    get source() { return this._source; },
    get isPlayer() { return false; },
    get player() { return undefined; },
    get destroyed() { return this._destroyed; },
    get zone() { return this._zone; },
    get enableDamage() { return this._enableDamage; },
    set enableDamage(value) { this._enableDamage = Boolean(value); },
    get showHealthBar() { return this._showHealthBar; },
    set showHealthBar(value) { this._showHealthBar = Boolean(value); this._runtime?._damageFieldChanged(this); },
    get hp() { return this._hp; },
    set hp(value) { this._hp = Number(value); this._runtime?._damageFieldChanged(this); },
    get maxHp() { return this._maxHp; },
    set maxHp(value) { this._maxHp = Number(value); this._runtime?._damageFieldChanged(this); },
    ...createParticleAccessors(),
    get dead() { return this._hp < 0; },
    get position() { return this._position; },
    set position(value) { this._position.copy(Vector3.from(value)); this._runtime?._entityTransformChanged(this); },
    get velocity() { return this._velocity; },
    set velocity(value) { this._velocity.copy(Vector3.from(value)); this._runtime?._entityTransformChanged(this); },
    get bounds() { return this._bounds.clone(); },
    get collides() { return this._collides; },
    set collides(value) { this._collides = Boolean(value); this._runtime?._entityPhysicsChanged(this); },
    get fixed() { return this._fixed; },
    set fixed(value) { this._fixed = Boolean(value); this._runtime?._entityPhysicsChanged(this); },
    get gravity() { return this._gravity; },
    set gravity(value) { this._gravity = Boolean(value); this._runtime?._entityPhysicsChanged(this); },
    get mass() { return this._mass; },
    set mass(value) { this._mass = Number(value); this._runtime?._entityPhysicsChanged(this); },
    get friction() { return this._friction; },
    set friction(value) { this._friction = Number(value); this._runtime?._entityPhysicsChanged(this); },
    get restitution() { return this._restitution; },
    set restitution(value) { this._restitution = Number(value); this._runtime?._entityPhysicsChanged(this); },
    get meshInvisible() { return this._meshInvisible; },
    set meshInvisible(value) { this._meshInvisible = Boolean(value); this._runtime?._entityPhysicsChanged(this); },
    get meshScale() { return this._meshScale; },
    set meshScale(value) { this._meshScale.copy(requireBoundedVector3(value, "entity meshScale")); this._runtime?._entityPhysicsChanged(this); },
    get meshOrientation() { return this._meshOrientation; },
    set meshOrientation(value) { this._meshOrientation.copy(quaternionFrom(value)); this._runtime?._entityPhysicsChanged(this); },
    lookAt(targetPosition, meshFacing = "Z", up = new Vector3(0, 1, 0)) { this.meshOrientation = entityLookAtQuaternion(this.position, targetPosition, meshFacing, up, message => (this._runtime?.logger ?? console).warn(message)); },
    rotateLocal(localPosition, axis, radians) {
      const rotated = rotateEntityLocal(this.position, this.meshScale, this.meshOrientation, localPosition, axis, radians);
      this.meshOrientation = rotated.orientation;
      this.position = rotated.position;
    },
    scaleLocal(localPosition, scale) {
      const scaled = scaleEntityLocal(this.position, this.meshScale, this.meshOrientation, localPosition, scale);
      this.meshScale = scaled.scale;
      this.position = scaled.position;
    },
    get meshOffset() { return this._meshOffset; },
    set meshOffset(value) { this._meshOffset.copy(requireBoundedVector3(value, "entity meshOffset")); this._runtime?._entityPhysicsChanged(this); },
    get anchorOffset() { return this._anchorOffset; },
    set anchorOffset(value) { this._anchorOffset.copy(requireBoundedVector3(value, "entity anchorOffset")); this._runtime?._entityPhysicsChanged(this); },
    get meshColor() { return this._meshColor; },
    set meshColor(value) { this._meshColor.copy(requireRgbaColor(value, "entity meshColor")); this._runtime?._entityPhysicsChanged(this); },
    get meshMetalness() { return this._meshMetalness; },
    set meshMetalness(value) { this._meshMetalness = requireFiniteRange(value, "entity meshMetalness", 0, 1); this._runtime?._entityPhysicsChanged(this); },
    get meshEmissive() { return this._meshEmissive; },
    set meshEmissive(value) { this._meshEmissive = requireFiniteRange(value, "entity meshEmissive", 0, 1); this._runtime?._entityPhysicsChanged(this); },
    get meshShininess() { return this._meshShininess; },
    set meshShininess(value) { this._meshShininess = requireFiniteRange(value, "entity meshShininess", 0, 1); this._runtime?._entityPhysicsChanged(this); },
    get showEntityName() { return this._showEntityName; },
    set showEntityName(value) { this._showEntityName = Boolean(value); this._runtime?._entityPhysicsChanged(this); },
    get customName() { return this._customName; },
    set customName(value) { this._customName = String(value); this._runtime?._entityPhysicsChanged(this); },
    get nameRadius() { return this._nameRadius; },
    set nameRadius(value) { this._nameRadius = requireFiniteRange(value, "entity nameRadius", 0, 4096); this._runtime?._entityPhysicsChanged(this); },
    get nameColor() { return this._nameColor; },
    set nameColor(value) { this._nameColor.copy(requireRgbColor(value, "entity nameColor")); this._runtime?._entityPhysicsChanged(this); },
    tags() { return Object.freeze([...this._tags]); },
    get fluidContacts() { return Object.freeze([...this._body.fluids.values()].map(contact => Object.freeze({ voxel: contact.voxel, volume: contact.volume }))); },
    get entityContacts() { return Object.freeze([...this._contactPlayers].map(other => Object.freeze({ other, force: new Vector3(0, 0, 0), axis: new Vector3(0, 0, 0) }))); },
    get voxelContacts() { return activeVoxelContacts(this._body); },
    get contactForce() { return new Vector3(0, 0, 0); },
    addTag(tag) { this._tags.add(String(tag)); },
    removeTag(tag) { this._tags.delete(String(tag)); },
    hasTag(tag) { return this._tags.has(String(tag)); },
    animate(keyframes, playback) {
      if (!this._runtime) throw new Error("Entity is not attached to a Script Runtime");
      return this._runtime._createAnimation(this, keyframes, playback);
    },
    getAnimations() { return this._runtime?._getAnimations(this) ?? Object.freeze([]); },
    say(message, options) {
      if (!this._runtime) throw new Error("Entity is not attached to a Script Runtime");
      this._runtime._messageEntity(this, message, options);
    },
    Give(name, count) { if (!this.isPlayer) return 0; return this._runtime._givePlayer(this, name, count); },
    BuffClear() { if (!this.isPlayer) return Object.freeze({}); return this._runtime._clearPlayerBuffs(this); },
    get gamemode() { return { gamemode: mode => this.isPlayer ? this._runtime._setPlayerGameMode(this, mode) : 0 }; },
    sound(spec) {
      if (!this._runtime) throw new Error("Entity is not attached to a Script Runtime");
      return this._runtime._soundEntity(this, spec);
    },
    onClick(handler) { return this._signals.click.on(handler); },
    nextClick(filter) { return this._signals.click.next(filter); },
    onInteract(handler) { return this._signals.interact.on(handler); },
    nextInteract(filter) { return this._signals.interact.next(filter); },
    onEntityContact(handler) { return this._signals.contact.on(handler); },
    nextEntityContact(filter) { return this._signals.contact.next(filter); },
    onEntitySeparate(handler) { return this._signals.contactSeparate.on(handler); },
    nextEntitySeparate(filter) { return this._signals.contactSeparate.next(filter); },
    destroy() {
      if (!this._runtime) throw new Error("Entity is not attached to a Script Runtime");
      this._runtime._destroyEntity(this);
    },
    onDestroy(handler) { return this._signals.destroy.on(handler); },
    nextDestroy(filter) { return this._signals.destroy.next(filter); },
    onFluidEnter(handler) { return this._signals.fluidEnter.on(handler); },
    nextFluidEnter(filter) { return this._signals.fluidEnter.next(filter); },
    onFluidLeave(handler) { return this._signals.fluidLeave.on(handler); },
    nextFluidLeave(filter) { return this._signals.fluidLeave.next(filter); },
    onVoxelContact(handler) { return this._signals.voxelContact.on(handler); },
    nextVoxelContact(filter) { return this._signals.voxelContact.next(filter); },
    onVoxelSeparate(handler) { return this._signals.voxelSeparate.on(handler); },
    nextVoxelSeparate(filter) { return this._signals.voxelSeparate.next(filter); },
    onTakeDamage(handler) { return this._signals.takeDamage.on(handler); },
    nextTakeDamage(filter) { return this._signals.takeDamage.next(filter); },
    onDie(handler) { return this._signals.die.on(handler); },
    nextDie(filter) { return this._signals.die.next(filter); },
    hurt(amount, options) {
      if (!this._runtime) throw new Error("Entity is not attached to a Script Runtime");
      this._runtime._hurtEntity(this, amount, options);
    },
    snapshot() {
      return Object.freeze({ id: this.id, name: this.name, kind: this.kind, position: this.position.toArray(), tags: [...this._tags].sort(), destroyed: this.destroyed, enableInteract: this.enableInteract, interactHint: this.interactHint, enableDamage: this.enableDamage, showHealthBar: this.showHealthBar, hp: this.hp, maxHp: this.maxHp, ...(this.dead ? { dead: true } : {}), ...(hasParticleState(this) ? { particles: particleSnapshot(this) } : {}) });
    },
  };
}

export function isLiveChatEntity(entity) {
  return Boolean(entity && entity.destroyed === false);
}

function requireValidatedSkinIds(value) {
  if (value === undefined) return new Map();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("validatedSkinIds must be an object");
  const entries = Object.entries(value);
  if (entries.some(([name, id]) => name.length === 0 || !Number.isSafeInteger(id) || id < 1 || id > 0xffffffff)) {
    throw new TypeError("validatedSkinIds must map non-empty names to nonzero unsigned 32-bit ids");
  }
  return new Map(entries);
}

function requireOptionalSkinName(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function createRuntimePlayer(runtime, input) {
  const body = new PlayerPhysicsBody({ position: input.position, profile: runtime.playerBodyProfile });
  const userId = String(input.userId ?? input.id);
  const boxId = String(input.boxId ?? userId).slice(0, 15);
  const userKey = String(input.userKey ?? stablePlayerUserKey(userId));
  const player = {
    _runtime: runtime,
    _id: String(input.id),
    _name: String(input.name),
    _userId: userId,
    _boxId: boxId,
    _userKey: userKey,
    _avatar: String(input.avatar ?? ""),
    _url: normalizePlayerUrl(input.url),
    _body: body,
    _lastAttacker: null,
    _lastDamageType: "",
    _authority: input.authority,
    _stateVersion: 0,
    _backendPlayerId: null,
    _lastBackendTick: 0,
    _writeBarrierTick: 0,
    _tags: new Set(),
    _signals: { click: new EventSignal(), destroy: new EventSignal(), voxelContact: new EventSignal(), voxelSeparate: new EventSignal(), fluidEnter: new EventSignal(), fluidLeave: new EventSignal(), press: new EventSignal(), release: new EventSignal(), keyDown: new EventSignal(), keyUp: new EventSignal(), respawn: new EventSignal(), takeDamage: new EventSignal(), die: new EventSignal() },
    _wearables: [],
    _inventory: new Map(),
    _buffs: new Set(),
    _gameMode: 0,
    _destroyed: false,
    _zone: { selector: "" },
    _enableDamage: false,
    _showHealthBar: true,
    _hp: 100,
    _maxHp: 100,
    ...createParticleState(input),
    _spawnPoint: Vector3.from(input.position ?? [0, 0, 0]),
    get spawnPoint() { return this._spawnPoint; },
    set spawnPoint(value) { this._spawnPoint = Vector3.from(value); },
    movementBounds: new GameBounds3(new Vector3(-50, -50, -50), new Vector3(178, 178, 178)),
    color: new GameRGBColor(1, 1, 1),
    skin: Object.fromEntries(Object.values(GameBodyPart).map(part => [part, undefined])),
    _skinIds: Object.fromEntries(Object.values(GameBodyPart).map(part => [part, undefined])),
    cameraYaw: 0,
    cameraPitch: 0,
    cameraMode: GameCameraMode.FOLLOW,
    cameraEntity: null,
    cameraPosition: Vector3.from(input.position ?? [0, 0, 0]),
    cameraTarget: Vector3.from(input.position ?? [0, 0, 0]),
    cameraUp: new Vector3(0, 1, 0),
    cameraFovY: 0.25,
    enable3DCursor: false,
    cameraFreezedAxis: "NONE",
    freezedForwardDirection: null,
    cameraDistance: 6,
    disableInputDirection: "NONE",
    swapInputDirection: false,
    reverseInputDirection: "NONE",
    facingDirection: new Vector3(1, 0, 0),
    canFly: false,
    get gameMode() { return this._gameMode; },
    _walkSpeed: 0.22,
    _runSpeed: 0.4,
    _runAcceleration: 0.35,
    _jumpPower: 0.96,
    _jumpSpeedFactor: 0.85,
    _jumpAccelerationFactor: 0.55,
    _doubleJumpPower: 0.9,
    _crouchSpeed: 0.1,
    _crouchAcceleration: 0.09,
    _flySpeed: 2,
    _flyAcceleration: 2,
    _swimAcceleration: 0.1,
    _swimSpeed: 0.4,
    _walkAcceleration: 0.19,
    moveState: "FALL",
    walkState: "NONE",
    spectator: false,
    invisible: false,
    showName: true,
    showIndicator: false,
    ...createPlayerSoundSlots(),
    walkButton: false,
    crouchButton: false,
    jumpButton: false,
    action0Button: false,
    action1Button: false,
    enableAction0: true,
    enableAction1: true,
    enableJump: true,
    enableDoubleJump: true,
    enableCrouch: true,
    get id() { return runtime._runtimePlayerId(this); },
    get isPlayer() { return true; },
    get zone() { return this._zone; },
    get player() { return this; },
    get destroyed() { return this._destroyed; },
    get userId() { return this._userId; },
    get boxId() { return this._boxId; },
    get userKey() { return this._userKey; },
    get avatar() { return this._avatar; },
    get url() { return this._url; },
    get enableDamage() { return this._enableDamage; },
    set enableDamage(value) { this._enableDamage = Boolean(value); },
    get showHealthBar() { return this._showHealthBar; },
    set showHealthBar(value) { this._showHealthBar = Boolean(value); runtime._damageFieldChanged(this); },
    get hp() { return this._hp; },
    set hp(value) { this._hp = Number(value); runtime._damageFieldChanged(this); },
    get maxHp() { return this._maxHp; },
    set maxHp(value) { this._maxHp = Number(value); runtime._damageFieldChanged(this); },
    ...createParticleAccessors(),
    get dead() { return this._hp < 0; },
    get voxelContacts() { return activeVoxelContacts(this._body); },
    get entityContacts() { return Object.freeze(runtime._entityContactsForPlayer(this)); },
    get fluidContacts() { return Object.freeze([...this._body.fluids.values()].map(contact => Object.freeze({ voxel: contact.voxel, volume: contact.volume }))); },
    get contactForce() { return sumContactForce(this._body); },
    tags() { return Object.freeze([...this._tags]); },
    addTag(tag) { this._tags.add(String(tag)); },
    removeTag(tag) { this._tags.delete(String(tag)); },
    hasTag(tag) { return this._tags.has(String(tag)); },
    onFluidEnter(handler) { return this._signals.fluidEnter.on(handler); },
    nextFluidEnter(filter) { return this._signals.fluidEnter.next(filter); },
    onFluidLeave(handler) { return this._signals.fluidLeave.on(handler); },
    nextFluidLeave(filter) { return this._signals.fluidLeave.next(filter); },
    onVoxelContact(handler) { return this._signals.voxelContact.on(handler); },
    nextVoxelContact(filter) { return this._signals.voxelContact.next(filter); },
    onVoxelSeparate(handler) { return this._signals.voxelSeparate.on(handler); },
    nextVoxelSeparate(filter) { return this._signals.voxelSeparate.next(filter); },
    onClick(handler) { return this._signals.click.on(handler); },
    nextClick(filter) { return this._signals.click.next(filter); },
    destroy() { return runtime._destroyEntity(this); },
    onDestroy(handler) { return this._signals.destroy.on(handler); },
    nextDestroy(filter) { return this._signals.destroy.next(filter); },
    onPress(handler) { return this._signals.press.on(handler); },
    nextPress(filter) { return this._signals.press.next(filter); },
    onRelease(handler) { return this._signals.release.on(handler); },
    nextRelease(filter) { return this._signals.release.next(filter); },
    onKeyDown(handler) { return this._signals.keyDown.on(handler); },
    onKeyUp(handler) { return this._signals.keyUp.on(handler); },
    onRespawn(handler) { return this._signals.respawn.on(handler); },
    nextRespawn(filter) { return this._signals.respawn.next(filter); },
    onTakeDamage(handler) { return this._signals.takeDamage.on(handler); },
    nextTakeDamage(filter) { return this._signals.takeDamage.next(filter); },
    onDie(handler) { return this._signals.die.on(handler); },
    nextDie(filter) { return this._signals.die.next(filter); },
    forceRespawn() { return runtime._forceRespawnPlayer(this); },
    kick() { runtime._kickPlayer(this); },
    setCameraPitch(value) { this.cameraPitch = Number(value) || 0; },
    setCameraYaw(value) { this.cameraYaw = Number(value) || 0; },
    animate(keyframes, playback) { return runtime._createAnimation(this, keyframes, playback); },
    getAnimations() { return runtime._getAnimations(this); },
    link(href, options) { runtime._linkPlayer(this, href, options); },
    setSkinByName(skinName) { runtime._setPlayerSkin(this, skinName); },
    resetToDefaultSkin() { runtime._resetPlayerSkin(this); },
    clearSkin() { runtime._clearPlayerSkin(this); },
    directMessage(message) { return runtime._messagePlayer(this, message); },
    async getMiaoShells() { return 0; },
    async querySocial() { return Object.freeze([]); },
    async querySocialStatistic() { return Object.freeze({ followingNum: 0, followerNum: 0, friendsNum: 0 }); },
    openUserProfileDialog(userId) { return runtime._sendPlayerUiEvent(this, "profile", { userId: Number(userId) }); },
    openMarketplace(productIds) {
      if (!Array.isArray(productIds)) throw new TypeError("openMarketplace productIds must be an array");
      return runtime._sendPlayerUiEvent(this, "marketplace", { productIds: productIds.map(Number).filter(Number.isFinite) });
    },
    share(content = "") {
      const text = String(content);
      const truncated = text.length > 40 ? `${text.slice(0, 39)}……` : text;
      return runtime._sendPlayerUiEvent(this, "share", { content: `${truncated}\n#神奇代码岛 #地图` });
    },
    Give(name, count) { return runtime._givePlayer(this, name, count); },
    BuffClear() { return runtime._clearPlayerBuffs(this); },
    get gamemode() { return { gamemode: mode => runtime._setPlayerGameMode(this, mode) }; },
    wearables(bodyPart) { return this._wearables.filter(item => item.bodyPart === bodyPart); },
    addWearable(spec) { const wearable = { ...structuredClone(spec) }; this._wearables.push(wearable); return wearable; },
    removeWearable(wearable) { const index = this._wearables.indexOf(wearable); if (index >= 0) this._wearables.splice(index, 1); },
    dialog(config) { return runtime._dialogPlayer(this, config); },
    cancelDialogs() { return runtime._cancelPlayerDialogs(this); },
    get name() { return this._name; },
    set name(value) { runtime._writePlayer(this, "name", value); },
    get position() { return this._body.position; },
    set position(value) { runtime._writePlayer(this, "position", value); },
    get velocity() { return this._body.velocity; },
    set velocity(value) { runtime._writePlayer(this, "velocity", value); },
    get bounds() { return Vector3.from(this._body.boundsHalfExtents); },
    get walkSpeed() { return this._walkSpeed; },
    set walkSpeed(value) { runtime._writePlayer(this, "walkSpeed", value); },
    get runSpeed() { return this._runSpeed; },
    set runSpeed(value) { runtime._writePlayer(this, "runSpeed", value); },
    get runAcceleration() { return this._runAcceleration; },
    set runAcceleration(value) { runtime._writePlayer(this, "runAcceleration", value); },
    get jumpPower() { return this._jumpPower; },
    set jumpPower(value) { runtime._writePlayer(this, "jumpPower", value); },
    get jumpSpeedFactor() { return this._jumpSpeedFactor; },
    set jumpSpeedFactor(value) { runtime._writePlayer(this, "jumpSpeedFactor", value); },
    get jumpAccelerationFactor() { return this._jumpAccelerationFactor; },
    set jumpAccelerationFactor(value) { runtime._writePlayer(this, "jumpAccelerationFactor", value); },
    get doubleJumpPower() { return this._doubleJumpPower; },
    set doubleJumpPower(value) { runtime._writePlayer(this, "doubleJumpPower", value); },
    get crouchSpeed() { return this._crouchSpeed; },
    set crouchSpeed(value) { runtime._writePlayer(this, "crouchSpeed", value); },
    get crouchAcceleration() { return this._crouchAcceleration; },
    set crouchAcceleration(value) { runtime._writePlayer(this, "crouchAcceleration", value); },
    get flySpeed() { return this._flySpeed; },
    set flySpeed(value) { runtime._writePlayer(this, "flySpeed", value); },
    get flyAcceleration() { return this._flyAcceleration; },
    set flyAcceleration(value) { runtime._writePlayer(this, "flyAcceleration", value); },
    get swimAcceleration() { return this._swimAcceleration; },
    set swimAcceleration(value) { runtime._writePlayer(this, "swimAcceleration", value); },
    get swimSpeed() { return this._swimSpeed; },
    set swimSpeed(value) { runtime._writePlayer(this, "swimSpeed", value); },
    get walkAcceleration() { return this._walkAcceleration; },
    set walkAcceleration(value) { runtime._writePlayer(this, "walkAcceleration", value); },
    get grounded() { return this._body.grounded; },
    get health() { return this.hp; },
    applyImpulse(value) { runtime._applyImpulse(this, value); },
    hurt(amount, options) { runtime._hurtEntity(this, amount, options); },
    damage(amount) { return runtime._damagePlayer(this, amount); },
    sendMessage(message) { runtime._messagePlayer(this, message); },
    snapshot() {
      return Object.freeze({
        id: this.id,
        name: this.name,
        position: this.position.toArray(),
        velocity: this.velocity.toArray(),
        collision: this._body.collisionSnapshot(),
        grounded: this.grounded,
        health: this.health,
        hp: this.hp,
        maxHp: this.maxHp,
        dead: this.dead,
        enableDamage: this.enableDamage,
        showHealthBar: this.showHealthBar,
        particles: particleSnapshot(this),
        spawnPoint: this.spawnPoint.toArray(),
        movementBounds: { lo: this.movementBounds.lo.toArray(), hi: this.movementBounds.hi.toArray() },
        color: { r: this.color.r, g: this.color.g, b: this.color.b },
        userId: this.userId,
        boxId: this.boxId,
        userKey: this.userKey,
        avatar: this.avatar,
        url: this.url.toString(),
        canFly: this.canFly,
        gamemode: this._gameMode,
        inventory: Object.fromEntries(this._inventory),
        buffs: [...this._buffs],
        cameraMode: this.cameraMode,
        cameraFovY: this.cameraFovY,
        invisible: this.invisible,
        showName: this.showName,
        showIndicator: this.showIndicator,
        walkSpeed: this.walkSpeed,
        runSpeed: this.runSpeed,
        runAcceleration: this.runAcceleration,
        jumpPower: this.jumpPower,
        jumpSpeedFactor: this.jumpSpeedFactor,
        jumpAccelerationFactor: this.jumpAccelerationFactor,
        doubleJumpPower: this.doubleJumpPower,
        crouchSpeed: this.crouchSpeed,
        crouchAcceleration: this.crouchAcceleration,
        flySpeed: this.flySpeed,
        flyAcceleration: this.flyAcceleration,
        swimAcceleration: this.swimAcceleration,
        swimSpeed: this.swimSpeed,
        walkAcceleration: this.walkAcceleration,
        authority: this._authority,
        stateVersion: this._stateVersion,
        backendPlayerId: this._backendPlayerId,
        lastBackendTick: this._lastBackendTick,
        writeBarrierTick: this._writeBarrierTick,
      });
    },
  };
  return player;
}

function createEntitySoundSlots() {
  return Object.fromEntries(["chatSound", "hurtSound", "dieSound", "interactSound"].map(name => [name, {
    sample: "",
    gain: 1,
    gainRange: 0,
    pitch: 1,
    pitchRange: 0,
    radius: 32,
  }]));
}

function createPlayerSoundSlots() {
  const slots = [
    "action0", "action1", "chat", "crouch", "die", "doubleJump", "endFly",
    "enterWater", "hurt", "interact", "jump", "land", "leaveWater", "music",
    "spawn", "startFly", "step", "swim",
  ];
  return Object.fromEntries(slots.map(name => [name, {
    sample: "",
    gain: 1,
    gainRange: 0,
    pitch: 1,
    pitchRange: 0,
    radius: 32,
  }]));
}

function stablePlayerUserKey(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").repeat(2).slice(0, 16);
}

function normalizePlayerUrl(value) {
  try {
    return new URL(value ?? "http://127.0.0.1/play");
  } catch {
    return new URL("http://127.0.0.1/play");
  }
}

function requirePositiveVector3(value, name) {
  const vector = Vector3.from(value);
  if (![vector.x, vector.y, vector.z].every(component => Number.isFinite(component) && component > 0)) {
    throw new RangeError(`${name} must contain three positive finite numbers`);
  }
  return vector;
}

function requireEntityLimit(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) throw new RangeError("entityLimit must be an integer from 0 to 1000000");
  return value;
}

function requireBoundedVector3(value, name) {
  const vector = Vector3.from(value);
  if (![vector.x, vector.y, vector.z].every(component => Number.isFinite(component) && Math.abs(component) <= 4096)) throw new RangeError(`${name} must contain three finite coordinates within 4096`);
  return vector;
}

function requireFiniteRange(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) throw new RangeError(`${name} must be between ${minimum} and ${maximum}`);
  return number;
}

function requireRgbColor(value, name) {
  const components = Array.isArray(value) ? value : [value?.r, value?.g, value?.b];
  if (components.length !== 3 || !components.every(component => Number.isFinite(component) && component >= 0 && component <= 1)) throw new RangeError(`${name} must contain three finite components between 0 and 1`);
  return new GameRGBColor(...components);
}

function requireRgbaColor(value, name) {
  const components = Array.isArray(value) ? value : [value?.r, value?.g, value?.b, value?.a];
  if (components.length !== 4 || !components.every(component => Number.isFinite(component) && component >= 0 && component <= 1)) throw new RangeError(`${name} must contain four finite components between 0 and 1`);
  return new GameRGBAColor(...components);
}


export class RuntimeVoxelContactEvent {
  constructor({ tick, entity, x, y, z, voxel, axis, force, player, collider, normal, compatibility }) {
    this.tick = tick;
    this.entity = entity;
    this.x = x;
    this.y = y;
    this.z = z;
    this.voxel = voxel;
    this.axis = axis;
    this.force = force;
    this.player = player;
    this.collider = collider;
    this.normal = normal;
    this.compatibility = compatibility;
  }
}

export class RuntimeFluidContactEvent {
  constructor(tick, entity, voxel) {
    this.tick = tick;
    this.entity = entity;
    this.voxel = voxel;
  }
}

export class RuntimeClickEvent {
  constructor(tick, entity, clicker, button, distance, clickerPosition, raycast) {
    this.tick = tick;
    this.entity = entity;
    this.clicker = clicker;
    this.button = button;
    this.distance = distance;
    this.clickerPosition = Vector3.from(clickerPosition);
    this.raycast = raycast;
  }
}

export class RuntimeInputEvent {
  constructor(tick, entity, position, button, pressed, raycast) {
    this.tick = tick;
    this.entity = entity;
    this.position = Vector3.from(position);
    this.button = button;
    this.pressed = Boolean(pressed);
    this.raycast = raycast;
  }
}

export class RuntimeEntityEvent {
  constructor(tick, entity) {
    this.tick = tick;
    this.entity = entity;
    this.player = entity;
  }
}

export class RuntimeDamageEvent {
  constructor(tick, entity, damage, attacker = null, damageType = "") {
    this.tick = tick;
    this.entity = entity;
    this.damage = damage;
    this.attacker = attacker;
    this.damageType = damageType || "";
  }
}

export class RuntimeDieEvent {
  constructor(tick, entity, attacker = null, damageType = "") {
    this.tick = tick;
    this.entity = entity;
    this.attacker = attacker;
    this.damageType = damageType || "";
  }
}

export class RuntimeRespawnEvent {
  constructor(tick, entity) {
    this.tick = tick;
    this.entity = entity;
  }
}

export class RuntimeInteractEvent {
  constructor(tick, entity, targetEntity) {
    this.tick = tick;
    this.entity = entity;
    this.targetEntity = targetEntity;
  }
}

export class RuntimeTickEvent {
  constructor(tick, prevTick, elapsedTimeMS, skip) {
    this.tick = tick;
    this.prevTick = prevTick;
    this.skip = Boolean(skip);
    this.elapsedTimeMS = elapsedTimeMS;
    this.deltaTime = elapsedTimeMS / 1_000;
  }
}

export class RuntimeChatEvent {
  constructor(tick, entity, message) {
    this.tick = tick;
    this.entity = entity;
    this.message = String(message);
  }
}

export class RuntimePurchaseSuccessEvent {
  constructor(tick, userId, productId, orderId) {
    this.tick = tick;
    this.userId = String(userId);
    this.productId = productId;
    this.orderId = orderId;
  }
}

export class RuntimeKeyBoardEvent {
  constructor(tick, keyCode) {
    this.tick = tick;
    this.keyCode = keyCode;
  }
}

export function activeVoxelContacts(body) {
  if (!body?.contacts) return Object.freeze([]);
  return Object.freeze([...body.contacts.values()]
    .filter(contact => contact.collider?.kind === "voxel")
    .map(contact => Object.freeze({
      x: contact.collider.x,
      y: contact.collider.y,
      z: contact.collider.z,
      voxel: contact.collider.blockId,
      axis: Vector3.from(contact.normal),
      force: Vector3.from(contact.force ?? [0, 0, 0]),
    })));
}

export function sumContactForce(body) {
  const total = new Vector3(0, 0, 0);
  if (!body?.contacts) return total;
  for (const contact of body.contacts.values()) total.addEq(Vector3.from(contact.force ?? [0, 0, 0]));
  return total;
}

export function createContactEvent(tick, entity, contact) {
  const collider = contact.collider;
  const axis = Vector3.from(contact.normal);
  const force = Vector3.from(contact.force ?? [0, 0, 0]);
  const extension = {
    player: entity,
    collider: Object.freeze({ kind: collider.kind, id: collider.id, tags: collider.tags, material: collider.material }),
    normal: axis,
    compatibility: contactCompatibility(...(collider.kind === "voxel" ? [] : ["other"])),
  };
  if (collider.kind === "voxel") {
    return Object.freeze(new RuntimeVoxelContactEvent({
      tick,
      entity,
      x: collider.x,
      y: collider.y,
      z: collider.z,
      voxel: collider.blockId,
      axis,
      force,
      ...extension,
    }));
  }
  return Object.freeze({
    tick,
    entity,
    other: null,
    axis,
    force,
    ...extension,
  });
}

function contactCompatibility(...unresolved) {
  return Object.freeze({ canonical: unresolved.length === 0 ? "compatible" : "partial", unresolved: Object.freeze(unresolved) });
}

function triggerEvent(player, trigger) {
  return Object.freeze({
    player,
    trigger: Object.freeze({ id: trigger.id, tags: trigger.tags, material: trigger.material }),
  });
}

function cloneJsonValue(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError("RemoteChannel events must be JSON values");
  return JSON.parse(serialized);
}

function formatRuntimeError(error) {
  if (error && typeof error === "object") {
    if (typeof error.stack === "string" && error.stack.length > 0) return error.stack;
    if (typeof error.message === "string" && error.message.length > 0) return error.message;
  }
  return String(error);
}

function formatValue(value) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function createGameTickEvent(tick, prevTick, elapsedTimeMS, skip) {
  return Object.freeze(new RuntimeTickEvent(tick, prevTick, elapsedTimeMS, skip));
}

export function createTickTiming(tick, prevTick, nowMS, prevTickMS) {
  return Object.freeze({
    elapsedTimeMS: nowMS - prevTickMS,
    skip: tick - prevTick > 1,
  });
}

export function createGameEntityEvent(tick, entity) {
  return Object.freeze(new RuntimeEntityEvent(tick, entity));
}

export function createGameDamageEvent(tick, entity, damage, attacker = null, damageType = "") {
  return Object.freeze(new RuntimeDamageEvent(tick, entity, damage, attacker, damageType));
}

export function createGameDieEvent(tick, entity, attacker = null, damageType = "") {
  return Object.freeze(new RuntimeDieEvent(tick, entity, attacker, damageType));
}

export function createGameRespawnEvent(tick, entity) {
  return Object.freeze(new RuntimeRespawnEvent(tick, entity));
}

export function createGameInteractEvent(tick, entity, targetEntity) {
  return Object.freeze(new RuntimeInteractEvent(tick, entity, targetEntity));
}

export function createGameChatEvent(tick, entity, message) {
  return Object.freeze(new RuntimeChatEvent(tick, entity, message));
}

export function createGamePurchaseSuccessEvent(tick, userId, productId, orderId) {
  return Object.freeze(new RuntimePurchaseSuccessEvent(tick, userId, productId, orderId));
}

export function createGameKeyBoardEvent(tick, keyCode) {
  return Object.freeze(new RuntimeKeyBoardEvent(tick, keyCode));
}

function normalizeHurtOptions(options) {
  if (options === undefined || options === null) return Object.freeze({ attacker: null, damageType: "" });
  if (typeof options === "string") return Object.freeze({ attacker: null, damageType: options });
  if (typeof options !== "object" || Array.isArray(options)) throw new TypeError("GameHurtOptions must be an object");
  return Object.freeze({ attacker: options.attacker ?? null, damageType: String(options.damageType ?? "") });
}

function inputPermissionMask(player) {
  let mask = 0xff;
  for (const permission of PLAYER_INPUT_PERMISSIONS) {
    if (!player[permission.property]) mask &= ~permission.mask;
  }
  return mask;
}

function updatePlayerButtonState(player, buttonState) {
  player.action0Button = (buttonState & 1) !== 0;
  player.action1Button = (buttonState & 2) !== 0;
  player.jumpButton = (buttonState & 4) !== 0;
  player.walkButton = (buttonState & 8) !== 0;
  player.crouchButton = (buttonState & 16) !== 0;
}

export function createGameInputEvent(tick, entity, position, button, pressed, raycast) {
  return Object.freeze(new RuntimeInputEvent(tick, entity, position, button, pressed, raycast));
}

export function createGameClickEvent(tick, entity, clicker, button, distance, clickerPosition, raycast) {
  return Object.freeze(new RuntimeClickEvent(tick, entity, clicker, button, distance, clickerPosition, raycast));
}

function reconstructInputRaycast(runtime, event) {
  const origin = Vector3.from(event.rayOrigin ?? [0, 0, 0]);
  const rawDirection = Vector3.from(event.rayDirection ?? [0, 0, 0]);
  const direction = rawDirection.sqrMag() > 1e-16 ? rawDirection.normalize() : new Vector3(0, 0, 0);
  const distance = Number(event.rayTime) >= 0 ? Number(event.rayTime) : Infinity;
  const hit = Number.isFinite(distance);
  const hitEntity = hit ? runtime._entityByBackendId(event.rayHitEntity) : null;
  const voxelIndex = new Vector3(event.rayHitVoxelX ?? 0, event.rayHitVoxelY ?? 0, event.rayHitVoxelZ ?? 0);
  const hitVoxel = hit && !hitEntity ? runtime.voxels.getVoxel(voxelIndex.x, voxelIndex.y, voxelIndex.z) : 0;
  return Object.freeze(new RuntimeRaycastResult({
    hit,
    hitEntity,
    hitVoxel,
    voxel: hitVoxel,
    origin,
    direction,
    distance,
    hitPosition: hit ? origin.add(direction.scale(distance)) : origin.clone(),
    normal: Vector3.from(event.rayHitNormal ?? [0, 0, 0]).normalize(),
    voxelIndex,
  }));
}

function isByte(value) {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}
