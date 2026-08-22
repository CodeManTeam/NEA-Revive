// NEA Runtime Server — 自写后端整合
// 协议层：box-go compat-server（mudb 3-WS + 20 恢复协议组）
// 运行时层：demo-map ScriptRuntime（执行地图 server script）
// 服务层：createSession + 会话
//
// 当前里程碑：createSession → mudb 3-WS → gameNet.join → ScriptRuntime.addPlayer
// → parkour server script onPlayerJoin → world.say → gameChat log 回传客户端。
import { createServer, type Server as HttpServer } from "node:http"
import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"
import { MuServer } from "mudb"
import { MuWebSocketServer } from "mudb/socket/web/server"
import { box3Protocols, gameClock, gameNet, gameChat, gameTerrain, entityInteract, remoteChannel, dialog, compareTerrainBoxes } from "../protocol"
import { ScriptRuntime } from "../../demo-map/src/runtime/script-runtime.mjs"
import { importMapProject } from "../../demo-map/src/import-project.mjs"
import { buildProjectAssetResolver, isSafeLogicalAssetName } from "../../demo-map/src/project-asset-resolver.mjs"
import { loadPreservedBlockCatalog } from "../../local-player/src/block-info.mjs"
import { encodeNetPublicPacket, LOCAL_AVATAR_SKIN_PART_IDS } from "./netstate"
import { encodeEmptyAvatarPart, EMPTY_PARTS } from "./empty-avatar"
import { readFileSync, existsSync, createReadStream } from "node:fs"
import { join, resolve } from "node:path"
import { gzipSync } from "node:zlib"

let decodeMeshAssetTool: ((bytes: Uint8Array) => any) | undefined
let decodeMeshTextureTool: ((texture: any) => any) | undefined
let staticEntitySceneGzip: Buffer | undefined

export interface RuntimeServerOptions {
  host?: string
  port?: number
  path?: string
  quiet?: boolean
  sourceRoot: string // nea-map/v1 源工程目录
  assetRoot: string // 方块目录（含 world-bedwars.json 的 block-info）
  worldManifest?: string
  buildRoot?: string
  spawn?: [number, number, number]
}

export interface RuntimeServerHandle {
  host: string
  port: number
  path: string
  httpServer: HttpServer
  mudbServer: MuServer
  runtime: ScriptRuntime
  close(): Promise<void>
}

interface ResolvedProjectAsset {
  name: string
  path: string
}

function playerFlags(player: any): number {
  let flags = 252 | (player?.canFly ? 2 : 0) | (player?.spectator ? 1 : 0)
  // Missing fields retain the recovered defaults. Explicit false values are
  // the only state that removes an input permission.
  if (player?.enableJump === false) flags &= ~32
  if (player?.enableCrouch === false) flags &= ~128
  if (player?.enableDoubleJump === false) flags &= ~64
  return flags
}

function buildRuntimeProjectAssetResolver(
  buildRoot: string,
  assets: ReadonlyArray<{ name?: unknown; path?: unknown }>,
): { get(name: string): ResolvedProjectAsset | undefined } {
  const root = resolve(buildRoot)
  const declared: ResolvedProjectAsset[] = []
  for (const entry of assets) {
    if (typeof entry.name !== "string" || typeof entry.path !== "string") continue
    if (!isSafeLogicalAssetName(entry.name) || !isSafeLogicalAssetName(entry.path)) continue
    const path = resolve(root, entry.path)
    if (!path.startsWith(`${root}\\`) && !path.startsWith(`${root}/`)) continue
    declared.push({ name: entry.name, path })
  }
  return buildProjectAssetResolver(declared) as { get(name: string): ResolvedProjectAsset | undefined }
}

export async function startRuntimeServer(options: RuntimeServerOptions): Promise<RuntimeServerHandle> {
  if (!decodeMeshAssetTool) {
    const tool = await import("../tools/decode-engine-model.mjs") as any
    decodeMeshAssetTool = tool.decodeMeshAsset
    decodeMeshTextureTool = tool.decodeMeshTexture
  }
  const host = options.host ?? "127.0.0.1"
  const requestedPort = options.port ?? 8080
  const path = options.path ?? "/ws"
  const log = options.quiet ? () => undefined : console.log
  const logger = options.quiet ? { log() {}, error() {}, exception() {} } : undefined
  const sessions = new Map<string, string>() // sessionId -> playerId
  const sessionNames = new Map<string, string>() // sessionId -> playerName（来自 createSession）
  const playerSessions = new Map<string, string>() // playerId -> sessionId
  const pendingClientEvents = new Map<string, unknown[]>() // playerId -> pre-join RemoteChannel events
  const chatLogIds = new Map<string, number>() // sessionId -> chat log id
  let gameChatProtocolRef: any = null
  let gameTerrainProtocolRef: any = null
  let gameNetProtocolRef: any = null
  let gameClockProtocolRef: any = null
  let modelsProtocolRef: any = null
  let remoteChannelProtocolRef: any = null
  let dialogProtocolRef: any = null
  let dialogRpcId = 1
  let remoteEventTick = 1
  const maxPendingClientEvents = 32
  const pendingVoxelChanges: Array<{ x: number, y: number, z: number, voxel: number }> = []
  let handleVoxelChange = (change: { x: number, y: number, z: number, voxel: number }) => {
    pendingVoxelChanges.push(change)
  }

  function gameChatClients(): Record<string, any> { return gameChatProtocolRef?.clients ?? {} }
  function gameTerrainClients(): Record<string, any> { return gameTerrainProtocolRef?.clients ?? {} }
  function gameNetClients(): Record<string, any> { return gameNetProtocolRef?.clients ?? {} }
  function gameClockClients(): Record<string, any> { return gameClockProtocolRef?.clients ?? {} }
  function modelsClients(): Record<string, any> { return modelsProtocolRef?.clients ?? {} }
  function remoteChannelClients(): Record<string, any> { return remoteChannelProtocolRef?.clients ?? {} }
  function dialogClients(): Record<string, any> { return dialogProtocolRef?.clients ?? {} }
  const pendingDialogs = new Map<string, { rpcId: number, resolve: (result: unknown) => void, reject: (error: unknown) => void }[]>() // playerId -> pending dialog promises

  // Convert a script-facing dialog config into the mudb dialog.open payload.
  // The client-direction union is { text, input, select }; each arm nests the
  // shared dialogCommon fields plus its own config.
  function dialogConfigToProtocol(config: any): any {
    const common = {
      lookEyeEntity: 0, lookTargetEntity: 0, lookEyeEnabled: false,
      lookTargetEnabled: false, lookUpEnabled: false,
      content: String(config?.content ?? ""),
      contentBackgroundColor: { a: 0, b: 0, g: 0, r: 0 },
      contentTextColor: { a: 1, b: 1, g: 1, r: 1 },
      lookEyeOffset: { x: 0, y: 0, z: 0 },
      lookTargetOffset: { x: 0, y: 0, z: 0 },
      lookUp: { x: 0, y: 0, z: 0 },
      title: String(config?.title ?? ""),
      titleBackgroundColor: { a: 0, b: 0, g: 0, r: 0 },
      titleTextColor: { a: 1, b: 1, g: 1, r: 1 },
    }
    const type = String(config?.type ?? "text")
    if (type === "input") {
      return { type: "input", data: { common, confirmText: String(config?.confirmText ?? "确定"), placeholder: String(config?.placeholder ?? "") } }
    }
    if (type === "select") {
      return { type: "select", data: { common, options: Array.isArray(config?.options) ? config.options.map(String) : [] } }
    }
    return { type: "text", data: { hasArrow: Boolean(config?.hasArrow), common } }
  }

  function deliverClientEvent(playerId: string, event: unknown): boolean {
    const sessionId = playerSessions.get(playerId)
    const client = sessionId === undefined ? undefined : remoteChannelClients()[sessionId]
    if (!client) return false
    try {
      client.message.sendClientEvent({ tick: remoteEventTick++, args: JSON.stringify(event) })
      return true
    } catch (error) {
      log(`[remote-channel] failed to send event to ${playerId}: ${String(error)}`)
      return false
    }
  }

  function flushPendingClientEvents(playerId: string): void {
    const events = pendingClientEvents.get(playerId)
    if (!events) return
    pendingClientEvents.delete(playerId)
    for (let index = 0; index < events.length; index++) {
      const event = events[index]
      if (!deliverClientEvent(playerId, event)) {
        const remaining = events.slice(index)
        pendingClientEvents.set(playerId, remaining.slice(-maxPendingClientEvents))
        return
      }
    }
  }

  // ---- 1. 加载地图包 → ScriptRuntime（执行地图 server script）----
  const blockCatalog = await loadPreservedBlockCatalog(options.assetRoot, options.worldManifest ?? "world-bedwars.json")
  const buildRoot = options.buildRoot ?? `${options.sourceRoot}-runtime-build`
  const importedProject = await importMapProject(options.sourceRoot, buildRoot)
  const assetIndex = JSON.parse(readFileSync(resolve(buildRoot, "assets", "index.json"), "utf8"))
  if (!Array.isArray(assetIndex?.assets)) throw new Error("Imported project asset index is missing or invalid")
  const projectAssets = buildRuntimeProjectAssetResolver(buildRoot, assetIndex.assets)
  const spawn = options.spawn ?? importedProject.manifest.world.spawn
  let staticEntitySceneJson: string | null = null
  let staticEntityDiagnostics: { nativeBindings: number; nativeFailures: number; skipped: Array<{ mesh: string; reason: string }> } = {
    nativeBindings: 0,
    nativeFailures: 0,
    skipped: [],
  }
  const clientScriptModules = Object.fromEntries(
    importedProject.clientModules.map((module: { name: string; bytes: Uint8Array }) => [
      module.name,
      Buffer.from(module.bytes).toString("utf8"),
    ]),
  )
  if (importedProject.clientUiState) {
    clientScriptModules["__nea_ui_state__"] = JSON.stringify(importedProject.clientUiState)
  }

  // ---- 1b. 人物模型 bootstrap（skin part hashes）----
  // 从恢复运行时的 bedwars bootstrap 读取 skinPartHashBatches，供 models.appendSkinPartHashes。
  // 若缺失则降级为空（无人物模型，但地形仍工作）。
  const bootstrapPath = join(options.assetRoot, "project", "bedwars", "bootstrap", "bootstrap.json")
  let skinPartHashes: Array<{ id: number; hash: string }> = []
  if (existsSync(bootstrapPath)) {
    try {
      const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"))
      const batches = bootstrap?.skinPartHashBatches ?? []
      skinPartHashes = batches.flat().map((entry: any) => ({ id: Number(entry.id), hash: String(entry.hash) }))
    } catch (error) {
      log(`[bootstrap] failed to load skin part hashes: ${String(error)}`)
    }
  }
  const runtime = await ScriptRuntime.load(buildRoot, {
    blockCatalog,
    validatedMeshNames: importedProject.assets
      .filter((asset: { kind: string | null }) => asset.kind === "mesh")
      .map((asset: { name: string }) => asset.name),
    logger: options.quiet
      ? { info() {}, warn() {}, error() {} }
      : { info: (m: string) => log(`[script] ${m}`), warn: (m: string) => log(`[script] ${m}`), error: (m: string) => log(`[script] ${m}`) },
    sendChatMessage: (_sessionId, message) => {
      const text = String(message?.text ?? "")
      if (!text) return
      // world.say 即时投递（sessionId undefined → 广播）；
      // 玩家 directMessage 的 sessionId 是 runtime playerId → 映射回 WS sessionId
      const targetSession = _sessionId === undefined ? undefined : (playerSessions.get(_sessionId) ?? _sessionId)
      if (targetSession !== undefined) {
        sendChatLog(targetSession, text)
        // Some clients establish the entity-interact/remote-channel sockets
        // before game-chat. Mirror targeted system feedback through the
        // already-live remote channel so directMessage is never invisible.
        deliverClientEvent(String(_sessionId), {
          type: "nea-revive:chat",
          message: text,
          kind: "system",
          valid: true,
          private: true,
        })
      } else {
        for (const sessionId of Object.keys(gameChatClients())) sendChatLog(sessionId, text)
      }
    },
    sendChatMessages: (deliveries) => {
      for (const delivery of deliveries) {
        const text = String(delivery.message?.text ?? "")
        if (!text) continue
        const targetSession = delivery.sessionId === undefined ? undefined : (playerSessions.get(delivery.sessionId) ?? delivery.sessionId)
        if (targetSession !== undefined) {
          sendChatLog(targetSession, text)
          deliverClientEvent(String(delivery.sessionId), {
            type: "nea-revive:chat",
            message: text,
            kind: "system",
            valid: true,
            private: true,
          })
        } else {
          for (const sessionId of Object.keys(gameChatClients())) sendChatLog(sessionId, text)
        }
      }
    },
    sendClientEvent: (playerId: string, event: unknown) => {
      if (deliverClientEvent(playerId, event)) return
      const events = pendingClientEvents.get(playerId) ?? []
      events.push(structuredClone(event))
      pendingClientEvents.set(playerId, events.slice(-maxPendingClientEvents))
    },
    linkPlayer: async (playerId: string, href: string, linkOptions: unknown) => {
      // Historical maps commonly use javascript: links for DAO3 account
      // telemetry. Never execute those in the local player, but keep the API
      // successful so the remainder of an async join handler can run.
      if (href.trimStart().toLowerCase().startsWith("javascript:")) {
        log(`[player-link] ignored legacy javascript URL for ${playerId}`)
        return
      }
      const sessionId = playerSessions.get(playerId)
      const client = sessionId === undefined ? undefined : remoteChannelClients()[sessionId]
      client?.message.sendClientEvent({
        tick: remoteEventTick++,
        args: JSON.stringify({ type: "nea-revive:link", href, options: linkOptions }),
      })
    },
    sendGuiCommand: async (command: any) => {
      if (command.operation === "getAttribute") {
        if (command.name === "width") return 1280
        if (command.name === "height") return 720
        return null
      }
      const sessionId = playerSessions.get(String(command.playerId))
      const client = sessionId === undefined ? undefined : remoteChannelClients()[sessionId]
      client?.message.sendClientEvent({
        tick: remoteEventTick++,
        args: JSON.stringify({ type: "nea-revive:gui", command }),
      })
      return true
    },
    writeEntityState: async (entityId: number, state: unknown) => {
      for (const playerId of playerSessions.keys()) {
        deliverClientEvent(playerId, { type: "nea-revive:entity-state", entityId, state })
      }
    },
    destroyEntity: async (entityId: number) => {
      for (const playerId of playerSessions.keys()) {
        deliverClientEvent(playerId, { type: "nea-revive:entity-destroyed", entityId })
      }
    },
    writeDamageState: async (target: any, state: unknown, events: unknown) => {
      const event = { type: "nea-revive:damage-state", target, state, events }
      if (target?.playerId !== undefined) deliverClientEvent(String(target.playerId), event)
      else for (const playerId of playerSessions.keys()) deliverClientEvent(playerId, event)
    },
    sendSoundCommand: async (command: any) => {
      const sample = typeof command?.sample === "string" ? command.sample.replace(/^\/+/, "") : ""
      const sampleUrl = sample
        ? `http://${host}:${requestedPort}/assets/${sample.split("/").map(encodeURIComponent).join("/")}`
        : undefined
      if (typeof command?.targetPlayerId === "string") {
        deliverClientEvent(command.targetPlayerId, { type: "nea-revive:sound", command: { ...command, sampleUrl } })
        return true
      }
      for (const playerId of playerSessions.keys()) {
        deliverClientEvent(playerId, { type: "nea-revive:sound", command: { ...command, sampleUrl } })
      }
      return true
    },
    onVoxelChange: (change: { x: number, y: number, z: number, voxel: number }) => {
      handleVoxelChange(change)
    },
    showDialog: async (playerId: string, config: any) => {
      const sessionId = playerSessions.get(playerId)
      const client = sessionId === undefined ? undefined : dialogClients()[sessionId]
      if (!client) return null
      const rpcId = dialogRpcId++
      return new Promise<unknown>((resolve, reject) => {
        const pending = pendingDialogs.get(playerId) ?? []
        pending.push({ rpcId, resolve, reject })
        pendingDialogs.set(playerId, pending)
        try {
          client.message.open({
            rpcId,
            config: dialogConfigToProtocol(config),
          })
        } catch (error) {
          const index = pendingDialogs.get(playerId) ?? []
          index.pop()
          pendingDialogs.set(playerId, index)
          reject(error)
        }
      })
    },
    cancelDialogs: (playerId: string) => {
      const sessionId = playerSessions.get(playerId)
      const client = sessionId === undefined ? undefined : dialogClients()[sessionId]
      client?.message.cancelDialogs()
      const pending = pendingDialogs.get(playerId) ?? []
      pendingDialogs.delete(playerId)
      for (const p of pending) p.reject(new Error("dialog cancelled"))
    },
  })
  await runtime.start()
  // 20Hz 逻辑 tick：冲刷聊天 FIFO 并驱动脚本 onTick
  const tickTimer = setInterval(() => runtime.tick(), 50)
  tickTimer.unref?.()
  // 周期 net-state 同步：脚本对玩家属性的修改（walkSpeed/runSpeed/flySpeed/canFly/
  // spectator 等 DAO3 player API）推送到前端本地物理。初始帧在 join 后发一次，
  // 之后每 200ms 按 runtime.snapshot() 的权威玩家状态补发。
  let netStateTick = 4
  const netStateTimer = setInterval(() => {
    const snap: any = runtime.snapshot()
    const tick = netStateTick
    netStateTick += 2
    for (const [playerId, sessionId] of playerSessions) {
      const player = snap.players.find((p: any) => p.id === playerId)
      const netClient = gameNetClients()[sessionId]
      if (!player || !netClient) continue
      deliverClientEvent(playerId, {
        type: "nea-revive:world-physics",
        gravity: snap.worldPhysics?.gravity,
        airFriction: snap.worldPhysics?.airFriction,
        tickRate: snap.worldPhysics?.tickRate,
        materials: snap.worldPhysics?.materials,
      })
      deliverClientEvent(playerId, {
        type: "nea-revive:camera-state",
        mode: player.cameraMode,
        fovY: player.cameraFovY,
        yaw: player.cameraYaw,
        pitch: player.cameraPitch,
        distance: player.cameraDistance,
        position: player.cameraPosition,
        target: player.cameraTarget,
        up: player.cameraUp,
        entityId: player.cameraEntityId,
        entityPosition: player.cameraEntityPosition,
        freezedAxis: player.cameraFreezedAxis,
        freezedForwardDirection: player.freezedForwardDirection,
        enable3DCursor: player.enable3DCursor,
      })
      // DAO3 player flags are authoritative input permissions. Keep the
      // recovered defaults, then clear permissions explicitly disabled by
      // the server script (notably enableDoubleJump=false in Backroom).
      const flags = playerFlags(player)
      try {
        const packet = encodeNetPublicPacket({
          tick,
          pauseCounter: 0,
          displays: [{
            id: 1,
            name: String(player.name ?? "Player"),
            avatarSkin: LOCAL_AVATAR_SKIN_PART_IDS,
            dead: Boolean(player.dead),
          }],
          players: [{
            id: 1,
            position: player.position,
            walkSpeed: player.walkSpeed,
            walkAcceleration: player.walkAcceleration,
            runSpeed: player.runSpeed,
            runAcceleration: player.runAcceleration,
            crouchSpeed: player.crouchSpeed,
            crouchAcceleration: player.crouchAcceleration,
            swimSpeed: player.swimSpeed,
            swimAcceleration: player.swimAcceleration,
            flySpeed: player.flySpeed,
            flyAcceleration: player.flyAcceleration,
            jumpPower: player.jumpPower,
            jumpSpeedFactor: player.jumpSpeedFactor,
            jumpAccelerationFactor: player.jumpAccelerationFactor,
            doubleJumpPower: player.doubleJumpPower,
            stepHeight: importedProject.physics?.stepHeight,
            flags,
          }],
        })
        netClient.sendRaw(packet, false)
      } catch (error) {
        log(`[net-state] send failed: ${String(error)}`)
      }
    }
  }, 200)
  netStateTimer.unref?.()
  function sendChatLog(sessionId: string, text: string): void {
    const client = gameChatClients()[sessionId]
    if (!client) return
    const id = chatLogIds.get(sessionId) ?? 1
    chatLogIds.set(sessionId, id + 1)
    try {
      client.message.log({
        duration: 0,
        id,
        msgType: 0,
        hideFloat: false,
        private: false,
        valid: true,
        i18nPrefix: "",
        i18nSuffix: "",
        text,
      })
    } catch (error) {
      log(`[chat] send failed: ${String(error)}`)
    }
  }

  // ---- 2. HTTP：createSession + 状态 ----
  const httpServer = createServer((request, response) => {
    // CORS：允许 voxweb 前端（不同 origin）访问 createSession/status
    response.setHeader("access-control-allow-origin", "*")
    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
    response.setHeader("access-control-allow-headers", "content-type")
    if (request.method === "OPTIONS") {
      response.writeHead(204)
      response.end()
      return
    }
    const url = new URL(request.url ?? "/", `http://${host}`)
    if (request.method === "POST" && url.pathname === "/api/createSession") {
      // 可选请求体 { name, userId }：玩家名来自会话（voxweb 契约扩展，贴合 box3）
      let body = ""
      request.setEncoding("utf8")
      request.on("data", (chunk: string) => { body += chunk })
      request.on("end", () => {
        let playerName = "Player"
        try {
          const parsed = body ? JSON.parse(body) : null
          if (parsed && typeof parsed.name === "string" && parsed.name.length > 0) playerName = parsed.name
        } catch { /* 忽略无效请求体 */ }
        const sessionId = `local-${randomUUID()}`
        sessionNames.set(sessionId, playerName)
        const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",", 1)[0]?.trim()
        const wsScheme = forwardedProto === "https" ? "wss" : "ws"
        const wsUrl = `${wsScheme}://${request.headers.host ?? `${host}:${requestedPort}`}${path}`
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
        response.end(JSON.stringify({
          config: {
            prefetchHashes: [],
            sessionId,
            socketServerUrl: wsUrl,
            maxSockets: 3,
            configuredAudioHashes: [],
            admin: false,
          },
        }))
      })
      return
    }
    if (url.pathname === "/api/status") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({
        sessions: sessions.size,
        protocols: box3Protocols.map((p) => p.name),
        runtime: "nea-runtime-server",
        assets: {
          nativeBindings: staticEntityDiagnostics.nativeBindings,
          nativeFailures: staticEntityDiagnostics.nativeFailures,
          skipped: staticEntityDiagnostics.skipped,
        },
      }))
      return
    }
    if (url.pathname === "/api/map/entities") {
      try {
        if (staticEntitySceneJson === null) {
          const interactionOverrides = new Map(
            runtime.entityInteractionStates().map((entry: any) => [Number(entry.entityId), entry]),
          )
          const scene = buildStaticEntityScene(options.sourceRoot, importedProject.entities, options.assetRoot, interactionOverrides)
          staticEntityDiagnostics = scene.diagnostics
          staticEntitySceneJson = JSON.stringify(scene)
        }
        const acceptsGzip = String(request.headers["accept-encoding"] ?? "").includes("gzip")
        if (acceptsGzip) {
          staticEntitySceneGzip ??= gzipSync(staticEntitySceneJson, { level: 6 })
          response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "content-encoding": "gzip", "vary": "Accept-Encoding", "content-length": staticEntitySceneGzip.length })
          response.end(staticEntitySceneGzip)
        } else {
          response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "content-length": Buffer.byteLength(staticEntitySceneJson) })
          response.end(staticEntitySceneJson)
        }
      } catch (error) {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
        response.end(String(error))
      }
      return
    }
    if (url.pathname === "/api/map/environment") {
      // Serve the map's recovered DAO3 environment fields so the client can
      // drive sky/sun/globalLight/fog natively instead of engine defaults.
      const environment = importedProject.environment
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" })
      response.end(JSON.stringify(environment === null ? null : (environment.fields ?? null)))
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
      let logicalName: string
      try {
        logicalName = decodeURIComponent(url.pathname.slice("/assets/".length))
      } catch {
        response.writeHead(400)
        response.end("invalid asset path")
        return
      }
      if (!isSafeLogicalAssetName(logicalName)) {
        response.writeHead(403)
        response.end("invalid asset path")
        return
      }
      const asset = projectAssets.get(logicalName)
      if (!asset || !existsSync(asset.path)) {
        response.writeHead(404)
        response.end()
        return
      }
      const extension = asset.name.toLowerCase().split(".").pop()
      const contentType = extension === "mp3" ? "audio/mpeg" : extension === "ogg" ? "audio/ogg" : extension === "wav" ? "audio/wav" : "application/octet-stream"
      response.writeHead(200, { "content-type": contentType, "access-control-allow-origin": "*", "cache-control": "public,max-age=3600" })
      createReadStream(asset.path).pipe(response)
      return
    }
    // gameUI pictureAssets are content-addressed archive entries. Historical
    // Player resolves picture/<name> through this endpoint rather than the
    // page origin, so expose the same engine/m/<sha256-base64url> contract.
    if (request.method === "GET" && url.pathname.startsWith("/engine/m/")) {
      const hash = url.pathname.slice("/engine/m/".length)
      if (!/^[A-Za-z0-9_-]{42,43}$/.test(hash)) {
        response.writeHead(400); response.end("invalid content hash"); return
      }
      const assetPath = resolve(options.assetRoot, "engine", "m", hash)
      if (!existsSync(assetPath)) {
        response.writeHead(404); response.end("picture asset not found"); return
      }
      const extension = assetPath.toLowerCase().split(".").pop()
      const contentType = extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream"
      response.writeHead(200, { "content-type": contentType, "access-control-allow-origin": "*", "cache-control": "public,max-age=3600" })
      createReadStream(assetPath).pipe(response)
      return
    }
    // Mesh assets use the same content-addressed store as pictures, but a
    // dedicated route makes the renderer intent explicit and avoids clients
    // having to special-case the historical engine path.
    if (request.method === "GET" && url.pathname.startsWith("/api/mesh/")) {
      const hash = url.pathname.slice("/api/mesh/".length)
      if (!/^[A-Za-z0-9_-]{42,43}$/.test(hash)) {
        response.writeHead(400); response.end("invalid mesh hash"); return
      }
      const meshPath = resolve(options.assetRoot, "engine", "m", hash)
      if (!existsSync(meshPath)) {
        response.writeHead(404); response.end("mesh asset not found"); return
      }
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "access-control-allow-origin": "*",
        "cache-control": "public,max-age=3600",
      })
      createReadStream(meshPath).pipe(response)
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/mesh-decoded/")) {
      const hash = url.pathname.slice("/api/mesh-decoded/".length)
      if (!/^[A-Za-z0-9_-]{42,43}$/.test(hash)) {
        response.writeHead(400); response.end("invalid mesh hash"); return
      }
      const meshPath = resolve(options.assetRoot, "engine", "m", hash)
      if (!existsSync(meshPath) || !decodeMeshAssetTool) {
        response.writeHead(404); response.end("mesh asset not found"); return
      }
      try {
        let binaryPath = meshPath
        let source = readFileSync(meshPath)
        if (source[0] === 0x7b) {
          const metadata = JSON.parse(source.toString("utf8"))
          if (typeof metadata.dataHash === "string") {
            binaryPath = resolve(options.assetRoot, "engine", "m", metadata.dataHash)
            source = readFileSync(binaryPath)
          }
        }
        const decoded = decodeMeshAssetTool(new Uint8Array(source))
        const texture = decoded.value?.texture && decodeMeshTextureTool
          ? decodeMeshTextureTool(decoded.value.texture)
          : undefined
        const payload = {
          format: decoded.format,
          version: decoded.version,
          bounds: decoded.value?.bounds ?? null,
          nodes: decoded.value?.nodes ?? [],
          meshes: decoded.value?.meshes ?? [],
          texture: texture ? { width: texture.width, height: texture.height, rgba: Array.from(texture.rgba) } : null,
        }
        response.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public,max-age=3600" })
        response.end(JSON.stringify(payload))
      } catch (error) {
        response.writeHead(422, { "content-type": "text/plain" })
        response.end(`mesh decode failed: ${String(error)}`)
      }
      return
    }
    // avatar 模型资源：/avatar/m/{hash} → archive/avatar/m/{hash}
    // （voxweb 前端从 createSession origin 拉取人物皮肤部件）
    if (url.pathname.startsWith("/avatar/m/")) {
      const hash = url.pathname.slice("/avatar/m/".length)
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(hash)) {
        response.writeHead(400)
        response.end("invalid avatar hash")
        return
      }
      // 2 字节占位文件（被匿名化损坏）→ 动态返回合法空部件
      const emptyPart = (EMPTY_PARTS as Record<string, { name: string; id: number }>)[hash]
      if (emptyPart) {
        const bytes = encodeEmptyAvatarPart(emptyPart.name, emptyPart.id)
        response.writeHead(200, { "content-type": "application/octet-stream" })
        response.end(Buffer.from(bytes))
        return
      }
      const avatarFile = resolve(options.assetRoot, "avatar", "m", hash)
      if (!existsSync(avatarFile)) {
        response.writeHead(404)
        response.end("avatar not found")
        return
      }
      response.writeHead(200, { "content-type": "application/octet-stream" })
      createReadStream(avatarFile).pipe(response)
      return
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" })
    response.end("NEA Runtime Server\nWebSocket: " + path + "\n")
  })

  // ---- 3. mudb 3-WS + 协议组 ----
  const socketServer = new MuWebSocketServer({ server: httpServer, path, logger })
  // 与恢复运行时 box3-server 一致：跳过协议 jsonStr 验证（voxweb 前端协议表
  // 与自写 schema 存在 identity 等细微差异，公网部署已验证跳过校验可工作）。
  const mudbServer = new MuServer(socketServer, logger, true)

  // ---- 地形视图（voxweb 前端契约）----
  // 视口 = 源世界本身（前端从 reset 帧的 nx/ny/nz 读取 shape，不再硬编码 256×64×256）。
  // chunk 网格 = 源 shape / 32（parkour 8×2×8，minecraft 8×4×8）。
  const viewShape = runtime.voxels.shape as { x: number; y: number; z: number }
  const sourceShape: [number, number, number] = [viewShape.x + 1, viewShape.y + 1, viewShape.z + 1]
  const WORLD_OFFSET: [number, number, number] = [0, 0, 0]
  const SOURCE_SPAWN = spawn
  const VIEW_SPAWN: [number, number, number] = [
    SOURCE_SPAWN[0] + WORLD_OFFSET[0],
    SOURCE_SPAWN[1] + WORLD_OFFSET[1],
    SOURCE_SPAWN[2] + WORLD_OFFSET[2],
  ]
  const chunkSize = 32
  const gridI = sourceShape[0] / chunkSize
  const gridJ = sourceShape[1] / chunkSize
  const gridK = sourceShape[2] / chunkSize

  // chunkId (voxweb 网格) → 源世界坐标内的方块 box 列表（MuSortedArray 需要排序）。
  // 缓存已计算 chunk：全图 256 chunks 首次 ~1s，后续/重连秒回。
  const chunkBoxCache = new Map<number, Array<Record<string, number>>>()

  function mortonVoxelOffset(x: number, y: number, z: number): number {
    let offset = 0
    for (let bit = 0; bit < 10; bit++) {
      offset |= ((x >>> bit) & 1) << (bit * 3)
      offset |= ((y >>> bit) & 1) << (bit * 3 + 1)
      offset |= ((z >>> bit) & 1) << (bit * 3 + 2)
    }
    return offset >>> 0
  }

  function publishVoxelChange(change: { x: number, y: number, z: number, voxel: number }): void {
    const i = Math.floor((change.x + WORLD_OFFSET[0]) / chunkSize)
    const j = Math.floor((change.y + WORLD_OFFSET[1]) / chunkSize)
    const k = Math.floor((change.z + WORLD_OFFSET[2]) / chunkSize)
    if (i >= 0 && j >= 0 && k >= 0 && i < gridI && j < gridJ && k < gridK) {
      chunkBoxCache.delete(i + j * gridI + k * gridI * gridJ)
    }
    const run = [{
      offset: mortonVoxelOffset(
        change.x + WORLD_OFFSET[0],
        change.y + WORLD_OFFSET[1],
        change.z + WORLD_OFFSET[2],
      ),
      count: 1,
      block: change.voxel & 0xffff,
    }]
    for (const client of Object.values(gameTerrainClients())) client.message.voxelChange(run)
  }

  handleVoxelChange = publishVoxelChange
  for (const change of pendingVoxelChanges.splice(0)) publishVoxelChange(change)

  function collisionBoxesForChunk(chunkId: number): Array<Record<string, number>> {
    if (!Number.isInteger(chunkId) || chunkId < 0) return []
    const cached = chunkBoxCache.get(chunkId)
    if (cached) return cached
    const k = Math.floor(chunkId / (gridI * gridJ))
    const rest = chunkId % (gridI * gridJ)
    const j = Math.floor(rest / gridI)
    const i = rest % gridI
    if (i >= gridI || j >= gridJ || k >= gridK) return []
    const boxes: Array<Record<string, number>> = []
    // chunk 视口起点
    const vx0 = i * chunkSize
    const vy0 = j * chunkSize
    const vz0 = k * chunkSize
    for (let dz = 0; dz < chunkSize; dz++) {
      for (let dy = 0; dy < chunkSize; dy++) {
        for (let dx = 0; dx < chunkSize; dx++) {
          // 视口坐标 → 源世界坐标
          const sx = vx0 + dx - WORLD_OFFSET[0]
          const sy = vy0 + dy - WORLD_OFFSET[1]
          const sz = vz0 + dz - WORLD_OFFSET[2]
          if (sx < 0 || sy < 0 || sz < 0 || sx >= sourceShape[0] || sy >= sourceShape[1] || sz >= sourceShape[2]) continue
          const block = runtime.voxels.getVoxelId(sx, sy, sz) & 0x3fff
          if (block === 0) continue
          // 合并同 y/z 行的连续方块（与恢复运行时 buildChunkBoxes 同思路）
          let maxX = dx + 1
          while (maxX < chunkSize) {
            const nx = vx0 + maxX - WORLD_OFFSET[0]
            if (nx >= sourceShape[0]) break
            const nblock = runtime.voxels.getVoxelId(nx, sy, sz) & 0x3fff
            if (nblock !== block) break
            maxX += 1
          }
          boxes.push({
            block,
            faces: 0,
            maxX: maxX,
            maxY: dy + 1,
            maxZ: dz + 1,
            minX: dx,
            minY: dy,
            minZ: dz,
          })
          dx = maxX - 1
        }
      }
    }
    boxes.sort(compareTerrainBoxes)
    chunkBoxCache.set(chunkId, boxes)
    return boxes
  }

  function terrainResetPayload() {
    return {
      positionX: VIEW_SPAWN[0],
      positionY: VIEW_SPAWN[1],
      positionZ: VIEW_SPAWN[2],
      resetCounter: 1,
      nx: sourceShape[0],
      ny: sourceShape[1],
      nz: sourceShape[2],
      innerAO: false,
      blocks: "QmZ3ot2FZ8jR9z7bY5n8Z6mX4qW2vL9cS1hK7fD3tG5xR8pN4",
      hashes: [],
    }
  }

  for (const schema of box3Protocols) {
    const protocol = mudbServer.protocol(schema as any)
    if (schema === gameChat) gameChatProtocolRef = protocol
    if (schema === gameTerrain) gameTerrainProtocolRef = protocol
    if (schema === gameNet) gameNetProtocolRef = protocol
    if (schema === gameClock) gameClockProtocolRef = protocol
    if (schema.name === "models") modelsProtocolRef = protocol
    if (schema === remoteChannel) remoteChannelProtocolRef = protocol
    if (schema === dialog) dialogProtocolRef = protocol
    const handlers: Record<string, (client: any, data: unknown, unreliable: boolean) => void> = {}

    for (const messageName of Object.keys(schema.server)) {
      handlers[messageName] = (_client, _data, _unreliable) => undefined
    }

    if (schema === gameClock) {
      handlers.ping = (client, clientClock) => {
        client.message.pong({ clientClock, serverClock: Date.now(), frameSkip: 0 })
      }
    }

    if (schema === entityInteract) {
      handlers.interact = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        if (!playerId) return
        const packet = data as { id?: unknown; tick?: unknown }
        const entityId = Number(packet?.id)
        const tick = Number(packet?.tick)
        if (!Number.isSafeInteger(entityId) || entityId < 0 || !Number.isFinite(tick)) return
        runtime.dispatchInteract(playerId, entityId, tick)
      }
    }

    if (schema === gameNet) {
      handlers.input = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        if (!playerId) return
        runtime.dispatchInputEvents(playerId, data)
      }
      handlers.join = (client) => {
        const playerId = `p-${randomUUID().slice(0, 8)}`
        sessions.set(client.sessionId, playerId)
        playerSessions.set(playerId, client.sessionId)
        flushPendingClientEvents(playerId)
        runtime.addPlayer({ id: playerId, name: sessionNames.get(client.sessionId) ?? "Player", position: spawn })
        for (const entity of runtime.entityInteractionStates()) {
          deliverClientEvent(playerId, {
            type: "nea-revive:entity-state",
            entityId: entity.entityId,
            state: {
              enableInteract: entity.enableInteract,
              interactHint: entity.interactHint,
              interactRadius: entity.interactRadius,
            },
          })
        }
        // The game-net join can race the RemoteChannel protocol's client
        // registration across the three websocket transports.
        setTimeout(() => flushPendingClientEvents(playerId), 0)
        setTimeout(() => flushPendingClientEvents(playerId), 25)
        // voxweb 握手：join 后立即发 secret 原始帧（game-net rawId=10）：
        // varint(10) varint(1) 'E' 0 varint(playerId) uint8(5) varint(playerId) uint8(1) varint(playerId)
        const secret = encodeAnonymousPlayerSecret(1)
        client.sendRaw(secret, false)
        log(`[session] join ${client.sessionId} -> player ${playerId}`)
        // 人物模型：models.appendSkinPartHashes（先于 net-state 帧，让 avatar_catalog 解析 part hash）
        if (skinPartHashes.length > 0) {
          setTimeout(() => {
            const modelsClient = modelsClients()[client.sessionId]
            if (modelsClient && typeof modelsClient.message?.appendSkinPartHashes === "function") {
              modelsClient.message.appendSkinPartHashes(skinPartHashes)
            }
          }, 5)
        }
        if (Object.keys(clientScriptModules).length > 0) {
          setTimeout(() => {
            const netClient = gameNetClients()[client.sessionId]
            if (netClient && typeof netClient.message?.syncClientScriptModules === "function") {
              netClient.message.syncClientScriptModules(clientScriptModules)
            }
          }, 7)
        }
        // net-state 帧：replica.players（avatarSkin）+ state.players（位置）
        setTimeout(() => {
          const netClient = gameNetClients()[client.sessionId]
          if (netClient) {
            const packet = encodeNetPublicPacket({
              tick: 4,
              pauseCounter: 0,
              displays: [{ id: 1, name: sessionNames.get(client.sessionId) ?? "Player", avatarSkin: LOCAL_AVATAR_SKIN_PART_IDS }],
              players: [{
                id: 1,
                position: VIEW_SPAWN,
                // onPlayerJoin may already have changed permissions.
                flags: playerFlags(runtime.snapshot().players.find((entry: any) => entry.id === playerId)),
              }],
            })
            netClient.sendRaw(packet, false)
            log(`[session] sent net-state frame to ${client.sessionId}`)
          }
        }, 10)
        // 延迟一拍发地形 reset（确保 secret 先到）
        setTimeout(() => {
          const terrainClient = gameTerrainClients()[client.sessionId]
          if (terrainClient) terrainClient.message.reset(terrainResetPayload())
        }, 20)
      }
    }

    if (schema === gameTerrain) {
      handlers.ready = (_client, resetCounter) => {
        log(`[terrain] ready reset=${resetCounter}`)
      }
      handlers.fetchChunk = (client, request) => {
        const rpcId = Number((request as any)?.rpcId ?? 0)
        const chunkId = Number((request as any)?.chunkId ?? 0)
        client.message.chunkResponse({ rpcId, boxes: collisionBoxesForChunk(chunkId) })
        log(`[terrain] fetchChunk chunkId=${chunkId} rpcId=${rpcId}`)
      }
      handlers.fetchHashes = (client, request) => {
        const req = (request ?? {}) as any
        client.message.hashesResponse({
          startI: Number(req.startI ?? 0),
          startJ: Number(req.startJ ?? 0),
          startK: Number(req.startK ?? 0),
          chunksInfo: (req.chunkIds ?? []).map((idx: number) => ({ idx, hash: "" })),
          dirtyChunks: req.dirtyChunks ?? [],
        })
      }
      handlers.rebuildLightMap = (client, enabled) => {
        client.message.lightMapResponse(!!enabled)
      }
    }

    if (schema === gameChat) {
      handlers.noticeMessage = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        log(`[chat] noticeMessage from ${client.sessionId} -> player ${playerId}: ${JSON.stringify(data)}`)
        if (!playerId) return
        const detail = (data as { detail?: string }).detail ?? ""
        runtime.dispatchChat(playerId, detail)
      }
    }

    if (schema === dialog) {
      handlers.close = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        log(`[dialog] close from ${client.sessionId} -> player ${playerId}: ${JSON.stringify(data)}`)
        if (!playerId) return
        const pending = pendingDialogs.get(playerId) ?? []
        const rpcId = Number((data as any)?.rpcId ?? 0)
        const index = pending.findIndex(entry => entry.rpcId === rpcId)
        const next = index >= 0 ? pending.splice(index, 1)[0] : undefined
        if (next) {
          const result = (data as any)?.result ?? {}
          let value: unknown = result.type === "close" ? null : (result.data ?? result.value)
          if (result.type === "select") value = result
          next.resolve(value)
          if (pending.length === 0) pendingDialogs.delete(playerId)
          else pendingDialogs.set(playerId, pending)
        } else {
          pendingDialogs.delete(playerId)
        }
      }
      handlers.cancelDialog = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        if (!playerId) return
        const pending = pendingDialogs.get(playerId) ?? []
        const rpcId = Number(data ?? 0)
        const index = pending.findIndex(entry => entry.rpcId === rpcId)
        if (index < 0) return
        const [cancelled] = pending.splice(index, 1)
        cancelled.reject(new Error("dialog cancelled"))
        if (pending.length === 0) pendingDialogs.delete(playerId)
        else pendingDialogs.set(playerId, pending)
      }
      handlers.cancelDialogs = (client, _data) => {
        const playerId = sessions.get(client.sessionId)
        if (!playerId) return
        const pending = pendingDialogs.get(playerId) ?? []
        pendingDialogs.delete(playerId)
        for (const p of pending) p.reject(new Error("dialog cancelled"))
      }
    }

    if (schema === remoteChannel) {
      handlers.sendServerEvent = (client, data) => {
        const playerId = sessions.get(client.sessionId)
        if (!playerId) return
        try {
          const event = JSON.parse(String((data as { args?: string })?.args ?? "null"))
          if (event?.type === "nea-revive:chat" && typeof event.message === "string") {
            runtime.dispatchChat(playerId, event.message)
          } else {
            runtime.dispatchClientEvent(playerId, event)
          }
        } catch (error) {
          log(`[remote-channel] rejected event from ${client.sessionId}: ${String(error)}`)
        }
      }
    }

    protocol.configure({
      message: handlers as any,
      raw: () => undefined,
      connect: (client) => {
        if (schema === box3Protocols[0]) {
          log(`[session] connected ${client.sessionId}`)
          // voxweb 前端在收到第一个可解析 client 方向帧后才会发 gameNet.join
          // （driver.on_frame 的 parse_client_frame Ok 分支）。box3-server 在
          // connect 时也主动推协议帧（gameUI.reset 等）。这里发一个轻量的
          // game-clock pong 作为“协商完成”信号，触发 voxweb 进入 Joining。
          setTimeout(() => {
            const clockClient = gameClockClients()[client.sessionId]
            if (clockClient && typeof clockClient.message?.pong === "function") {
              clockClient.message.pong({ frameSkip: 0, clientClock: 0, serverClock: Date.now() })
              log(`[session] sent negotiation pong to ${client.sessionId}`)
            }
          }, 20)
        }
      },
      disconnect: (client) => {
        if (schema === box3Protocols[0]) {
          const playerId = sessions.get(client.sessionId)
          if (playerId) {
            runtime.removePlayer(playerId)
            playerSessions.delete(playerId)
          }
          sessions.delete(client.sessionId)
          sessionNames.delete(client.sessionId)
          chatLogIds.delete(client.sessionId)
          log(`[session] disconnected ${client.sessionId}`)
        }
      },
    })
  }

  const mudbReady = new Promise<void>((resolve, reject) => {
    mudbServer.start({ ready: resolve, close: reject })
  })
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject)
    httpServer.listen(requestedPort, host, () => {
      httpServer.off("error", reject)
      resolve()
    })
  })
  await mudbReady

  const address = httpServer.address()
  if (!address || typeof address === "string") throw new Error("Runtime server did not bind a TCP port")
  log(`NEA Runtime Server: http://${host}:${address.port} (${path})`)

  // 后台预计算全图 chunk boxes（缓存预热），玩家进入时 fetchChunk 秒回。
  // 延迟到启动完成之后，避免阻塞监听就绪。
  const warmupTimer = setTimeout(() => {
    const total = gridI * gridJ * gridK
    for (let chunkId = 0; chunkId < total; chunkId += 1) collisionBoxesForChunk(chunkId)
    log(`[terrain] warmup cached ${chunkBoxCache.size}/${total} chunks`)
  }, 50)
  warmupTimer.unref?.()

  return {
    host,
    port: address.port,
    path,
    httpServer,
    mudbServer,
    runtime,
    async close() {
      clearInterval(tickTimer)
      clearInterval(netStateTimer)
      clearTimeout(warmupTimer)
      runtime.stop()
      if (mudbServer.running) mudbServer.destroy()
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    },
  }
}

// 与恢复运行时 encodeAnonymousPlayerSecret 一致：构造 game-net secret 原始帧 payload
// （sendRaw 会再前缀 varint(rawId)，rawId=game-net 的 10）
function encodeAnonymousPlayerSecret(playerId: number): Uint8Array {
  // 手写 MuWriteStream 最小实现
  const bytes: number[] = []
  const writeVarint = (value: number) => {
    let v = value >>> 0
    while (v >= 0x80) {
      bytes.push((v & 0x7f) | 0x80)
      v >>>= 7
    }
    bytes.push(v)
  }
  const writeUint8 = (value: number) => bytes.push(value & 0xff)
  writeVarint(1)
  writeUint8(69) // 'E'
  writeUint8(0)
  writeVarint(playerId)
  writeUint8(5)
  writeVarint(playerId)
  writeUint8(1)
  writeVarint(playerId)
  return Uint8Array.from(bytes)
}

function buildStaticEntityScene(
  sourceRoot: string,
  entities: readonly any[],
  assetRoot: string,
  interactionOverrides: ReadonlyMap<number, any> = new Map(),
) {
  const meshes: Record<string, { positionsF32: string; uvsF32: string; indicesU32: string; texturePngBase64?: string; meshAssetHash?: string; renderBoxOffset?: number[] }> = {}
  const instances: Array<{
    id: number
    mesh: string
    position: number[]
    scale: number[]
    rotation: number[]
    collision: boolean
    fixed: boolean
    halfExtents: number[]
    mass: number
    friction: number
    restitution: number
    enableInteract: boolean
    interactHint: string
    interactRadius: number
    meshOffset: number[]
    visible: boolean
    staticShadow: boolean
    tint: number[]
    emissive: number
    metalness: number
    shininess: number
  }> = []
  const skipped: Array<{ mesh: string; reason: string }> = []
  let nativeBindings = 0
  let nativeFailures = 0
  for (const [sourceIndex, entity] of entities.entries()) {
    const mesh = String(entity.source?.mesh ?? entity.mesh ?? "")
    if (!mesh.endsWith(".vb")) continue
    const gltfName = mesh.slice(0, -3) + ".gltf"
    if (!meshes[mesh]) {
      const binding = resolveMeshAssetBinding(sourceRoot, assetRoot, mesh, entity.source?.meshId ?? entity.meshId)
      const meshAssetHash = binding.hash
      if (meshAssetHash) nativeBindings++
      else nativeFailures++
      if (binding.reason && !skipped.some(entry => entry.mesh === mesh)) skipped.push({ mesh, reason: binding.reason })
      const gltfPath = resolve(sourceRoot, "assets", gltfName)
      if (!existsSync(gltfPath)) {
        // A successfully bound native .vb asset is authoritative and does
        // not require a glTF sidecar. The browser fills decoded_geometry from
        // /api/mesh-decoded/{hash}; only unbound meshes need the fallback.
        if (!meshAssetHash) {
          if (!skipped.some(entry => entry.mesh === mesh)) skipped.push({ mesh, reason: "missing glTF fallback" })
          continue
        }
        const metadata = readMeshMetadata(assetRoot, meshAssetHash)
        meshes[mesh] = {
          positionsF32: "",
          uvsF32: "",
          indicesU32: "",
          meshAssetHash,
          ...(metadata?.renderBoxOffset ? { renderBoxOffset: metadata.renderBoxOffset } : {}),
        }
      } else {
        try {
          const metadata = meshAssetHash ? readMeshMetadata(assetRoot, meshAssetHash) : null
          const decoded = readEmbeddedGltfMesh(gltfPath)
          meshes[mesh] = {
            positionsF32: encodeFloat32Base64(decoded.positions),
            uvsF32: encodeFloat32Base64(decoded.uvs),
            indicesU32: encodeUint32Base64(decoded.indices),
            ...(decoded.texturePng ? { texturePngBase64: Buffer.from(decoded.texturePng).toString("base64") } : {}),
            ...(meshAssetHash ? { meshAssetHash } : {}),
            ...(metadata?.renderBoxOffset ? { renderBoxOffset: metadata.renderBoxOffset } : {}),
          }
        } catch (error) {
          if (!skipped.some(entry => entry.mesh === mesh)) skipped.push({ mesh, reason: String(error) })
          continue
        }
      }
    }
    const entityScale = (entity.source?.scale ?? [1 / 64, 1 / 64, 1 / 64]).map(Number)
    const sourceMeshOffset = (entity.source?.meshOffset ?? [0, 0, 0]).map(Number)
    const renderBoxOffset = meshes[mesh]?.renderBoxOffset ?? [0, 0, 0]
    const bounds = (entity.source?.bounds ?? [0, 0, 0]).map(Number)
    // DAO3 anchors a static model at its bounds center, then applies the
    // renderBoxOffset in model-space. The glTF fallback vertices are exported
    // from the bounds corner, so reproduce that center-to-anchor translation
    // before converting the offset to world units.
    const meshOffset = [0, 1, 2].map(axis =>
      ((sourceMeshOffset[axis] ?? 0)
        - (bounds[axis] ?? 0) * 0.5
        + (renderBoxOffset[axis] ?? 0)) * (entityScale[axis] ?? 1),
    )
    instances.push({
      id: sourceIndex + 0x10000,
      mesh,
      position: entity.position.map(Number),
      scale: entityScale,
      rotation: (entity.source?.orientation ?? [0, 0, 0, 1]).map(Number),
      meshOffset,
      collision: Boolean(entity.source?.collision ?? true),
      fixed: Boolean(entity.source?.fixed ?? false),
      halfExtents: (entity.source?.bounds ?? [1, 1, 1]).map((size: unknown, axis: number) =>
        Math.max(0.01, Math.abs(Number(size) * Number((entity.source?.scale ?? [1 / 64, 1 / 64, 1 / 64])[axis])) / 2),
      ),
      mass: Math.max(0.001, Number(entity.source?.mass ?? 1)),
      friction: Math.max(0, Number(entity.source?.friction ?? 0)),
      restitution: Math.max(0, Number(entity.source?.restitution ?? 0)),
      enableInteract: Boolean(interactionOverrides.get(sourceIndex + 0x10000)?.enableInteract ?? entity.source?.enableInteract ?? false),
      interactHint: String(interactionOverrides.get(sourceIndex + 0x10000)?.interactHint ?? entity.source?.interactHint ?? ""),
      interactRadius: Math.max(0, Number(interactionOverrides.get(sourceIndex + 0x10000)?.interactRadius ?? entity.source?.interactRadius ?? 3)),
      visible: entity.source?.meshInvisible !== true,
      // These are preserved entity render fields from the DAO3 seed schema.
      // Do not discard them in the transport adapter: the renderer needs
      // staticShadow/tint/material values to reproduce the original pass.
      staticShadow: Boolean(entity.source?.staticShadow ?? false),
      tint: (entity.source?.tint ?? [255, 255, 255, 255]).map(Number),
      emissive: Math.max(0, Number(entity.source?.emissive ?? 0)),
      metalness: Math.max(0, Number(entity.source?.metalness ?? 0)),
      shininess: Math.max(0, Number(entity.source?.shininess ?? 0)),
    })
  }
  return { meshes, entities: instances, skipped, diagnostics: { nativeBindings, nativeFailures, skipped } }
}

function encodeFloat32Base64(values: readonly number[]): string {
  const bytes = Buffer.allocUnsafe(values.length * 4)
  for (let index = 0; index < values.length; index++) bytes.writeFloatLE(Number(values[index]), index * 4)
  return bytes.toString("base64")
}

function encodeUint32Base64(values: readonly number[]): string {
  const bytes = Buffer.allocUnsafe(values.length * 4)
  for (let index = 0; index < values.length; index++) bytes.writeUInt32LE(Number(values[index]) >>> 0, index * 4)
  return bytes.toString("base64")
}

function addVec3(a: number[], b: number[]) {
  return [0, 1, 2].map((axis) => Number(a[axis] ?? 0) + Number(b[axis] ?? 0))
}

function readMeshMetadata(assetRoot: string, requestKey: string) {
  try {
    const path = resolve(assetRoot, "engine", "m", requestKey)
    const value = JSON.parse(readFileSync(path, "utf8"))
    return Array.isArray(value.renderBoxOffset)
      ? { renderBoxOffset: value.renderBoxOffset.map(Number) }
      : null
  } catch {
    return null
  }
}

function resolveMeshAssetBinding(sourceRoot: string, assetRoot: string, mesh: string, meshId: unknown) {
  const failures: string[] = []
  const usable = (requestKey: string) => {
    const path = resolve(assetRoot, "engine", "m", requestKey)
    if (!existsSync(path)) { failures.push(`${requestKey}: missing metadata`); return false }
    try {
      const bytes = readFileSync(path)
      const metadata = bytes[0] === 0x7b ? JSON.parse(bytes.toString("utf8")) : null
      const dataHash = typeof metadata?.dataHash === "string" ? metadata.dataHash : requestKey
      const binaryPath = resolve(assetRoot, "engine", "m", dataHash)
      if (!existsSync(binaryPath)) { failures.push(`${requestKey}: missing data ${dataHash}`); return false }
      if (!decodeMeshAssetTool) { failures.push(`${requestKey}: decoder unavailable`); return false }
      const decoded = decodeMeshAssetTool(new Uint8Array(readFileSync(binaryPath)))
      if (!decoded || decoded.decodeError) {
        failures.push(`${requestKey}: ${decoded?.decodeError ?? "decoder returned no result"}`)
        return false
      }
      return true
    } catch (error) {
      failures.push(`${requestKey}: ${String(error)}`)
      return false
    }
  }
  const bootstrapPath = resolve(sourceRoot, "assets", "bootstrap", "mesh-bootstrap.json")
  if (existsSync(bootstrapPath)) {
    try {
      const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"))
      const binding = bootstrap.entities?.find((entry: any) => Number(entry.meshId) === Number(meshId) || entry.mesh === mesh)
      for (const requestKey of binding?.candidates ?? []) {
        if (usable(requestKey)) return { hash: requestKey }
      }
    } catch {}
  }
  const key = mesh.replace(/\.vb$/i, "")
  const metadataPath = resolve(assetRoot, "engine", "m", key)
  if (!existsSync(metadataPath)) {
    const catalogPath = resolve(sourceRoot, "assets", "models", "catalog.json")
    if (!existsSync(catalogPath)) return { reason: "no catalog binding" }
    try {
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8"))
      const entries = (Array.isArray(catalog) ? catalog : catalog.models ?? []).filter((item: any) =>
        Number(item.modelId) === Number(meshId) || String(item.local?.vb ?? "").endsWith(mesh),
      )
      for (const entry of entries) {
        const hash = entry?.modelFileHash
        if (typeof hash === "string" && usable(hash)) return { hash }
      }
    } catch {}
    return { reason: failures[0] ?? "no catalog binding" }
  }
  try {
    const value = JSON.parse(readFileSync(metadataPath, "utf8"))
    if (typeof value?.dataHash === "string" && usable(value.dataHash)) return { hash: value.dataHash }
    return { reason: failures[0] ?? "metadata has no dataHash" }
  } catch {
    return { reason: failures[0] ?? "invalid mesh metadata" }
  }
}

function readEmbeddedGltfMesh(path: string) {
  const gltf = JSON.parse(readFileSync(path, "utf8"))
  const uri = String(gltf.buffers?.[0]?.uri ?? "")
  const marker = ";base64,"
  const markerAt = uri.indexOf(marker)
  if (markerAt < 0) throw new Error(`glTF has no embedded buffer: ${path}`)
  const bytes = Buffer.from(uri.slice(markerAt + marker.length), "base64")
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? gltf.nodes?.map((_: unknown, index: number) => index) ?? []
  const visit = (nodeIndex: number, parent: number[]) => {
    const node = gltf.nodes?.[nodeIndex]
    if (!node) return
    const world = multiplyMat4(parent, nodeMatrix(node))
    const mesh = gltf.meshes?.[node.mesh]
    for (const primitive of mesh?.primitives ?? []) {
      if (primitive.attributes?.POSITION === undefined) continue
      const sourcePositions = readGltfAccessor(gltf, bytes, primitive.attributes.POSITION)
      const sourceUvs = primitive.attributes.TEXCOORD_0 === undefined
        ? new Array((sourcePositions.length / 3) * 2).fill(0)
        : readGltfAccessor(gltf, bytes, primitive.attributes.TEXCOORD_0)
      const sourceIndices = primitive.indices === undefined
        ? Array.from({ length: sourcePositions.length / 3 }, (_, index) => index)
        : readGltfAccessor(gltf, bytes, primitive.indices)
      const base = positions.length / 3
      for (let offset = 0; offset < sourcePositions.length; offset += 3) {
        positions.push(...transformPoint(
          world,
          sourcePositions[offset] ?? 0,
          sourcePositions[offset + 1] ?? 0,
          sourcePositions[offset + 2] ?? 0,
        ))
      }
      uvs.push(...sourceUvs)
      indices.push(...sourceIndices.map(index => Number(index) + base))
    }
    for (const child of node.children ?? []) visit(Number(child), world)
  }
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  for (const root of roots) visit(Number(root), identity)
  if (positions.length === 0) throw new Error(`glTF has no mesh primitive: ${path}`)
  let texturePng: number[] | undefined
  const baseTextureIndex = gltf.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture?.index
  const imageIndex = baseTextureIndex === undefined ? undefined : gltf.textures?.[baseTextureIndex]?.source
  const image = imageIndex === undefined ? undefined : gltf.images?.[imageIndex]
  const view = image?.bufferView === undefined ? undefined : gltf.bufferViews?.[image.bufferView]
  if (view && image?.mimeType === "image/png") {
    const start = Number(view.byteOffset ?? 0)
    const end = start + Number(view.byteLength ?? 0)
    texturePng = Array.from(bytes.subarray(start, end))
  }
  return { positions, uvs, indices, ...(texturePng ? { texturePng } : {}) }
}

function nodeMatrix(node: any): number[] {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.map(Number)
  const translation = (node.translation ?? [0, 0, 0]).map(Number)
  const rotation = (node.rotation ?? [0, 0, 0, 1]).map(Number)
  const scale = (node.scale ?? [1, 1, 1]).map(Number)
  const tx = translation[0] ?? 0, ty = translation[1] ?? 0, tz = translation[2] ?? 0
  const qx = rotation[0] ?? 0, qy = rotation[1] ?? 0, qz = rotation[2] ?? 0, qw = rotation[3] ?? 1
  const sx = scale[0] ?? 1, sy = scale[1] ?? 1, sz = scale[2] ?? 1
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2
  const yy = qy * y2, yz = qy * z2, zz = qz * z2
  const wx = qw * x2, wy = qw * y2, wz = qw * z2
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

function multiplyMat4(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) {
        const index = column * 4 + row
        out[index] = (out[index] ?? 0) + (a[k * 4 + row] ?? 0) * (b[column * 4 + k] ?? 0)
      }
    }
  }
  return out
}

function transformPoint(matrix: number[], x: number, y: number, z: number): [number, number, number] {
  return [
    (matrix[0] ?? 0) * x + (matrix[4] ?? 0) * y + (matrix[8] ?? 0) * z + (matrix[12] ?? 0),
    (matrix[1] ?? 0) * x + (matrix[5] ?? 0) * y + (matrix[9] ?? 0) * z + (matrix[13] ?? 0),
    (matrix[2] ?? 0) * x + (matrix[6] ?? 0) * y + (matrix[10] ?? 0) * z + (matrix[14] ?? 0),
  ]
}

function readGltfAccessor(gltf: any, bytes: Buffer, accessorIndex: number): number[] {
  const accessor = gltf.accessors[accessorIndex]
  const view = gltf.bufferViews[accessor.bufferView]
  const components = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[accessor.type]
  const componentBytes = ({ 5121: 1, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[accessor.componentType]
  if (!components || !componentBytes) throw new Error(`Unsupported glTF accessor ${accessor.type}/${accessor.componentType}`)
  const stride = Number(view.byteStride ?? components * componentBytes)
  const start = Number(view.byteOffset ?? 0) + Number(accessor.byteOffset ?? 0)
  const out: number[] = []
  for (let item = 0; item < accessor.count; item += 1) {
    for (let component = 0; component < components; component += 1) {
      const offset = start + item * stride + component * componentBytes
      if (accessor.componentType === 5126) out.push(bytes.readFloatLE(offset))
      else if (accessor.componentType === 5125) out.push(bytes.readUInt32LE(offset))
      else if (accessor.componentType === 5123) out.push(bytes.readUInt16LE(offset))
      else out.push(bytes.readUInt8(offset))
    }
  }
  return out
}

function compareTerrainBoxesRemoved(a: Record<string, number>, b: Record<string, number>): number {
  void a; void b
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourceRoot = process.env.NEA_SOURCE_ROOT
  const assetRoot = process.env.NEA_ASSET_ROOT
  if (!sourceRoot || !assetRoot) {
    console.error("NEA_SOURCE_ROOT and NEA_ASSET_ROOT are required")
    process.exit(1)
  }
  const server = await startRuntimeServer({ sourceRoot, assetRoot, port: Number(process.env.NEA_RUNTIME_PORT ?? 8080) })
  const shutdown = async () => {
    await server.close()
    process.exit(0)
  }
  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}
