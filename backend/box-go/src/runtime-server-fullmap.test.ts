// 测 minecraft 全图 256 chunks serving 性能 + 空 chunk 统计
import { strict as assert } from "node:assert"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameTerrain, gameNet } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const server = await startRuntimeServer({
  port: 0,
  sourceRoot: "D:/Projects/Gaming/NEA-Revive/packages/minecraft",
  assetRoot: "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive",
  buildRoot: "D:/Projects/Gaming/NEA-Revive/.build/minecraft-fullmap-test",
  spawn: [64, 3, 48],
  quiet: true,
})

const session = await (await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST", headers: { "content-type": "application/json" }, body: "{}",
})).json()
const socket = new MuWebSocket({ sessionId: session.config.sessionId, url: session.config.socketServerUrl, maxSockets: 3, logger: { log() {}, error() {}, exception() {} } })
const client = new MuClient(socket, undefined, true)

let terrainProtocol: any
let gameNetProtocol: any
let reset: any = null
const chunks = new Map<number, number>() // chunkId -> boxes 数
let gotChunks = 0

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (d: any) => void> = Object.fromEntries(Object.keys(schema.client).map((n) => [n, () => undefined]))
  if (schema === gameTerrain) {
    handlers.reset = (d) => { reset = d }
    handlers.chunkResponse = (d) => { chunks.set(d.rpcId, (d.boxes ?? []).length); gotChunks++ }
  }
  protocol.configure({ message: handlers } as any)
  if (schema === gameTerrain) terrainProtocol = protocol
  if (schema === gameNet) gameNetProtocol = protocol
}

const waitFor = (p: () => boolean, ms = 60000) => new Promise<void>((res, rej) => {
  const s = Date.now()
  const poll = () => p() ? res() : Date.now() - s > ms ? rej(new Error("timeout")) : setTimeout(poll, 50)
  poll()
})

try {
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error("mudb timeout")), 8000)
    client.start({ ready: () => { clearTimeout(t); res() }, close: (e) => rej(new Error(String(e))) })
  })
  gameNetProtocol.server.message.join()
  await waitFor(() => reset !== null)
  console.log(`reset: ${reset.nx}x${reset.ny}x${reset.nz}`)
  const gridI = reset.nx / 32, gridJ = reset.ny / 32, gridK = reset.nz / 32
  const total = gridI * gridJ * gridK
  console.log(`全图 chunks: ${total} (${gridI}x${gridJ}x${gridK})`)

  const t0 = Date.now()
  for (let i = 0; i < total; i++) {
    terrainProtocol.server.message.fetchChunk({ chunkId: i, rpcId: i + 1 })
  }
  await waitFor(() => gotChunks >= total)
  const elapsed = Date.now() - t0
  const nonEmpty = [...chunks.values()].filter((n) => n > 0).length
  const emptyIds = [...chunks.entries()].filter(([, n]) => n === 0).map(([id]) => id)
  const totalBoxes = [...chunks.values()].reduce((a, b) => a + b, 0)
  console.log(`全图拉取耗时: ${elapsed}ms（${total} chunks, ${gotChunks} 响应）`)
  console.log(`非空 chunk: ${nonEmpty}/${total}  空 chunk: ${total - nonEmpty}`)
  console.log(`总 boxes: ${totalBoxes}`)
  if (emptyIds.length <= 12) console.log(`空 chunk ids: ${emptyIds.join(",")}`)
  else console.log(`空 chunk 前 12 个: ${emptyIds.slice(0, 12).join(",")} ... 共 ${emptyIds.length}`)
  console.log("full-map test done")
} finally {
  if (client.running) client.destroy()
  await server.close()
}
