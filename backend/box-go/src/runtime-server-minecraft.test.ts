// Runtime Server 整合测试（minecraft 地图）：
// 验证 256×128×256 世界的地形 reset shape + fetchChunk 返回正确方块。
import { strict as assert } from "node:assert"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameTerrain, gameClock, gameNet } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/minecraft"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = "D:/Projects/Gaming/NEA-Revive/.build/minecraft-runtime-test"

const server = await startRuntimeServer({
  port: 0,
  sourceRoot,
  assetRoot,
  buildRoot,
  spawn: [64, 3, 48],
  quiet: true,
})

const sessionResponse = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Steve" }),
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

let terrainProtocol: any
let gameNetProtocol: any
let clockProtocol: any
let pongReceived = false
const resets: any[] = []
const chunks: Array<{ rpcId: number; boxes: any[] }> = []

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map((name) => [name, () => undefined]),
  )
  if (schema === gameClock) handlers.pong = () => { pongReceived = true }
  if (schema === gameTerrain) {
    handlers.reset = (data) => resets.push(data)
    handlers.chunkResponse = (data) => {
      // mudb 会复用解码缓冲，立刻拷贝 boxes
      chunks.push({ rpcId: data.rpcId, boxes: Array.isArray(data.boxes) ? [...data.boxes] : [] })
    }
  }
  protocol.configure({ message: handlers } as any)
  if (schema === gameTerrain) terrainProtocol = protocol
  if (schema === gameNet) gameNetProtocol = protocol
  if (schema === gameClock) clockProtocol = protocol
}

function waitFor(predicate: () => boolean, timeoutMs = 15000): Promise<void> {
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

try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for mudb ready")), 8000)
    client.start({
      ready: () => { clearTimeout(timeout); resolve() },
      close: (error) => reject(new Error(`mudb client closed: ${String(error ?? "unknown")}`)),
    })
  })

  gameNetProtocol.server.message.join()
  await waitFor(() => resets.length > 0)

  const reset = resets[0]
  console.log(`[reset] nx=${reset.nx} ny=${reset.ny} nz=${reset.nz} spawn=(${reset.positionX},${reset.positionY},${reset.positionZ})`)
  assert.equal(reset.nx, 256)
  assert.equal(reset.ny, 128)
  assert.equal(reset.nz, 256)
  assert.equal(reset.positionX, 64)
  assert.equal(reset.positionY, 3)
  assert.equal(reset.positionZ, 48)

  // spawn chunk: spawn [64,3,48] -> cx=2, cy=0, cz=1 -> chunkId = 2 + 8*(0 + 4*1) = 34
  const chunkId = 2 + 8 * (0 + 4 * 1)
  terrainProtocol.server.message.fetchChunk({ chunkId, rpcId: 1 })
  await waitFor(() => chunks.length > 0)

  const chunk = chunks[0]
  console.log(`[chunk ${chunkId}] boxes=${chunk.boxes.length}`)
  assert.ok(chunk.boxes.length > 0, "spawn chunk should contain terrain")

  // 统计方块 ID（box.block & 0x3fff），确认是 minecraft 的方块目录
  const blocks = new Set<number>()
  for (const box of chunk.boxes) blocks.add(box.block & 0x3fff)
  console.log(`[chunk ${chunkId}] blockIds=${[...blocks].sort((a, b) => a - b).join(",")}`)
  // spawn 地面 y=2 是 dirt(125)，y=0 底层 barrier(650)
  assert.ok([...blocks].some((id) => id === 125 || id === 650 || id === 129 || id === 389 || id === 107),
    "chunk should contain known minecraft blocks")

  console.log("minecraft runtime-server terrain test passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
}
