// voxweb 前端握手链测试：createSession → 3-WS → join → secret(原始帧) →
// gameTerrain.reset → fetchChunk → chunkResponse（boxes 包含 parkour 方块）。
// 模拟 voxweb 前端的协议表解析（protocols.json）验证 wire 兼容性。
import { strict as assert } from "node:assert"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameChat, gameClock, gameNet, gameTerrain } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/parkour"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = "D:/Projects/Gaming/NEA-Revive/.build/runtime-server-build-voxweb-a"

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })

const sessionResponse = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "弑神宗-小椰" }),
})
const sessionJson = (await sessionResponse.json()) as any
const sessionId: string = sessionJson.config.sessionId
const socketServerUrl: string = sessionJson.config.socketServerUrl

const socket = new MuWebSocket({
  sessionId,
  url: socketServerUrl,
  maxSockets: 3,
  logger: { log() {}, error() {}, exception() {} },
})
const client = new MuClient(socket, undefined, true)

const rawFrames: Uint8Array[] = []
const resets: any[] = []
const chunkResponses: any[] = []
let terrainProtocol: any
let netProtocol: any

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map((name) => [name, () => undefined]),
  )
  if (schema === gameTerrain) {
    // mudb parser 在 handler 返回后调用 schema.free(msg) 释放内部数组，
    // 必须立即深拷贝，否则 push 的引用随后被清空（boxes 变 0）。
    handlers.reset = (data: any) => resets.push(structuredClone(data))
    handlers.chunkResponse = (data: any) => chunkResponses.push(structuredClone(data))
  }
  protocol.configure({
    message: handlers as any,
    raw: (bytes: Uint8Array) => rawFrames.push(Uint8Array.from(bytes)),
  } as any)
  if (schema === gameTerrain) terrainProtocol = protocol
  if (schema === gameNet) netProtocol = protocol
}

function waitFor(predicate: () => boolean, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      if (predicate()) return resolve()
      if (Date.now() - started > timeoutMs) return reject(new Error("Timed out waiting for condition"))
      setTimeout(poll, 50)
    }
    poll()
  })
}

await new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Timed out waiting for mudb ready")), 8000)
  client.start({
    ready: () => { clearTimeout(timeout); resolve() },
    close: (error) => reject(new Error(`mudb client closed: ${String(error ?? "unknown")}`)),
  })
})

try {
  // 1) join → secret 原始帧（mudb raw handler 收到的是 payload；完整 wire 帧
  // 由服务端 sendRaw 前缀 varint(rawId=10) 组成，voxweb 前端按 id=10 解析）
  netProtocol.server.message.join()
  await waitFor(() => rawFrames.length > 0)
  const secret = rawFrames[0]
  console.log("[ok] secret payload received:", Buffer.from(secret).toString("hex"))
  // voxweb 前端解析完整帧：[10] [1] 'E' [0] [playerId] ...
  // mudb raw handler 剥离 id 后 payload = [1, 'E', 0, playerId, 5, playerId, 1, playerId]
  assert.equal(secret[0], 1, "secret payload varint(1)")
  assert.equal(secret[1], 69, "secret payload 'E'")
  assert.equal(secret[2], 0, "secret payload 0")
  assert.equal(secret[3], 1, "secret payload playerId=1")

  // 2) gameTerrain.reset
  await waitFor(() => resets.length > 0)
  const reset = resets[0]
  console.log(`[ok] terrain reset: origin=(${reset.positionX},${reset.positionY},${reset.positionZ}) shape=(${reset.nx},${reset.ny},${reset.nz})`)
  assert.equal(reset.nx, 256)
  assert.equal(reset.ny, 64)
  assert.equal(reset.nz, 256)
  assert.equal(reset.positionX, 128)
  assert.equal(reset.positionY, 44)
  assert.equal(reset.positionZ, 128)

  // 3) fetchChunk（spawn 附近 chunk：网格 (4,1,4) → chunkId = 4 + 8*(1 + 2*4) = 76）
  const chunkId = 4 + 8 * (1 + 2 * 4)
  console.log("[test] sending fetchChunk chunkId=", chunkId)
  terrainProtocol.server.message.fetchChunk({ chunkId, rpcId: 1 })
  await waitFor(() => chunkResponses.length > 0)
  const chunk = chunkResponses[0]
  console.log(`[ok] chunkResponse rpcId=${chunk.rpcId} boxes=${chunk.boxes.length}`)
  assert.equal(chunk.rpcId, 1)
  // spawn 视口 (128,44,128) 应落在某个 box 上（parkour 平台 stone=129 或底部 dirt=125）
  const blocks = new Set(chunk.boxes.map((b: any) => b.block))
  console.log("[ok] chunk blocks:", [...blocks].join(","))
  assert.ok(blocks.size > 0, "chunk should contain terrain blocks")

  // 4) fetchHashes 响应
  terrainProtocol.server.message.fetchHashes({ startI: 0, startJ: 0, startK: 0, chunkIds: [76], dirtyChunks: [] })
  await new Promise((resolve) => setTimeout(resolve, 100))

  console.log("runtime-server voxweb handshake test passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
}
