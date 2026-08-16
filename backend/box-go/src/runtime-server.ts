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
import { box3Protocols, gameClock, gameNet, gameChat, gameTerrain, compareTerrainBoxes } from "../protocol"
import { ScriptRuntime } from "../../demo-map/src/runtime/script-runtime.mjs"
import { importMapProject } from "../../demo-map/src/import-project.mjs"
import { loadPreservedBlockCatalog } from "../../local-player/src/block-info.mjs"
import { encodeNetPublicPacket, LOCAL_AVATAR_SKIN_PART_IDS } from "./netstate"
import { encodeEmptyAvatarPart, EMPTY_PARTS } from "./empty-avatar"
import { readFileSync, existsSync, createReadStream } from "node:fs"
import { join, resolve } from "node:path"

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

export async function startRuntimeServer(options: RuntimeServerOptions): Promise<RuntimeServerHandle> {
  const host = options.host ?? "127.0.0.1"
  const requestedPort = options.port ?? 8080
  const path = options.path ?? "/ws"
  const log = options.quiet ? () => undefined : console.log
  const logger = options.quiet ? { log() {}, error() {}, exception() {} } : undefined
  const spawn = options.spawn ?? [115, 11, 154] // parkour 真实 spawn（256×64×256 世界）

  // ---- 1. 加载地图包 → ScriptRuntime（执行地图 server script）----
  const blockCatalog = await loadPreservedBlockCatalog(options.assetRoot, options.worldManifest ?? "world-bedwars.json")
  const buildRoot = options.buildRoot ?? `${options.sourceRoot}-runtime-build`
  await importMapProject(options.sourceRoot, buildRoot)

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
        } else {
          for (const sessionId of Object.keys(gameChatClients())) sendChatLog(sessionId, text)
        }
      }
    },
  })
  await runtime.start()
  // 20Hz 逻辑 tick：冲刷聊天 FIFO 并驱动脚本 onTick
  const tickTimer = setInterval(() => runtime.tick(), 50)
  tickTimer.unref?.()
  const sessions = new Map<string, string>() // sessionId -> playerId
  const sessionNames = new Map<string, string>() // sessionId -> playerName（来自 createSession）
  const playerSessions = new Map<string, string>() // playerId -> sessionId
  const chatLogIds = new Map<string, number>() // sessionId -> chat log id
  // 协议引用必须在 mudbServer.start() 之前注册并捕获；启动后 protocol() 会抛错
  let gameChatProtocolRef: any = null
  let gameTerrainProtocolRef: any = null
  let gameNetProtocolRef: any = null
  let gameClockProtocolRef: any = null
  let modelsProtocolRef: any = null

  function gameChatClients(): Record<string, any> {
    return gameChatProtocolRef?.clients ?? {}
  }

  function gameTerrainClients(): Record<string, any> {
    return gameTerrainProtocolRef?.clients ?? {}
  }

  function gameNetClients(): Record<string, any> {
    return gameNetProtocolRef?.clients ?? {}
  }

  function gameClockClients(): Record<string, any> {
    return gameClockProtocolRef?.clients ?? {}
  }

  function modelsClients(): Record<string, any> {
    return modelsProtocolRef?.clients ?? {}
  }

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
        const wsUrl = `ws://${request.headers.host ?? `${host}:${requestedPort}`}${path}`
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
      response.end(JSON.stringify({ sessions: sessions.size, protocols: box3Protocols.map((p) => p.name), runtime: "nea-runtime-server" }))
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

  // chunkId (voxweb 网格) → 源世界坐标内的方块 box 列表（MuSortedArray 需要排序）
  function collisionBoxesForChunk(chunkId: number): Array<Record<string, number>> {
    if (!Number.isInteger(chunkId) || chunkId < 0) return []
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
    const handlers: Record<string, (client: any, data: unknown, unreliable: boolean) => void> = {}

    for (const messageName of Object.keys(schema.server)) {
      handlers[messageName] = (_client, _data, _unreliable) => undefined
    }

    if (schema === gameClock) {
      handlers.ping = (client, clientClock) => {
        client.message.pong({ clientClock, serverClock: Date.now(), frameSkip: 0 })
      }
    }

    if (schema === gameNet) {
      handlers.join = (client) => {
        const playerId = `p-${randomUUID().slice(0, 8)}`
        sessions.set(client.sessionId, playerId)
        playerSessions.set(playerId, client.sessionId)
        runtime.addPlayer({ id: playerId, name: sessionNames.get(client.sessionId) ?? "Player", position: spawn })
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
        // net-state 帧：replica.players（avatarSkin）+ state.players（位置）
        setTimeout(() => {
          const netClient = gameNetClients()[client.sessionId]
          if (netClient) {
            const packet = encodeNetPublicPacket({
              tick: 4,
              pauseCounter: 0,
              displays: [{ id: 1, name: sessionNames.get(client.sessionId) ?? "Player", avatarSkin: LOCAL_AVATAR_SKIN_PART_IDS }],
              players: [{ id: 1, position: VIEW_SPAWN }],
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

  return {
    host,
    port: address.port,
    path,
    httpServer,
    mudbServer,
    runtime,
    async close() {
      clearInterval(tickTimer)
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
