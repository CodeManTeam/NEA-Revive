import { strict as assert } from "node:assert"
import { rm } from "node:fs/promises"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameChat, gameNet, gameTerrain, remoteChannel } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = `D:/Projects/Gaming/NEA-Revive/.build/runtime-server-bedwars-${process.pid}`
const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })

const group = server.runtime.storage.getGroupStorage("storage")
await group.set("BlackList", [])

const response = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "BedWars-S2-Probe" }),
})
const config = (await response.json() as any).config
const client = new MuClient(new MuWebSocket({
  sessionId: config.sessionId,
  url: config.socketServerUrl,
  maxSockets: config.maxSockets,
  logger: { log() {}, error() {}, exception() {} },
}), undefined, true)

let reset: any
const chunks = new Map<number, any>()
const events: any[] = []
const chats: any[] = []
let terrain: any
let net: any
for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(Object.keys(schema.client).map(name => [name, () => undefined]))
  if (schema === gameTerrain) {
    handlers.reset = data => { reset = structuredClone(data) }
    handlers.chunkResponse = data => { const value = structuredClone(data); chunks.set(value.rpcId, value) }
    terrain = protocol
  }
  if (schema === gameNet) net = protocol
  if (schema === remoteChannel) handlers.sendClientEvent = data => events.push(JSON.parse(String(data.args)))
  if (schema === gameChat) handlers.log = data => chats.push(structuredClone(data))
  protocol.configure({ message: handlers as any, raw() {} } as any)
}

const waitFor = async (predicate: () => boolean, timeoutMs = 12000) => {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("BedWars S2 probe timed out")
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

try {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("BedWars S2 mudb ready timed out")), 8000)
    client.start({ ready: () => { clearTimeout(timer); resolve() }, close: reject })
  })
  net.server.message.join()
  await waitFor(() => Boolean(reset))
  assert.deepEqual([reset.nx, reset.ny, reset.nz], [128, 128, 128])
  assert.deepEqual([reset.positionX, reset.positionY, reset.positionZ], [63.5, 59, 63.5])
  assert.equal(server.runtime.snapshot().players.length, 1)
  await waitFor(() => events.some(event => event.type === "draw"))
  await waitFor(() => group.get(config.sessionId) !== undefined)

  let nonEmptyChunk: any = null
  for (let chunkId = 0, rpcId = 1; chunkId < 64 && !nonEmptyChunk; chunkId += 1, rpcId += 1) {
    terrain.server.message.fetchChunk({ chunkId, rpcId })
    const currentRpcId = rpcId
    await waitFor(() => chunks.has(currentRpcId))
    if (chunks.get(currentRpcId).boxes.length > 0) nonEmptyChunk = chunks.get(currentRpcId)
  }
  assert.ok(nonEmptyChunk?.boxes.length > 0)
  const player = server.runtime.snapshot().players[0]
  assert.equal(player.cameraMode, "fps")
  assert.equal(player.enableDoubleJump, false)
  assert.ok(player.walkSpeed > 0)
  console.log(`[ok] bedwars-s2 reset=${reset.nx}x${reset.ny}x${reset.nz} boxes=${nonEmptyChunk.boxes.length} events=${events.length}`)
} finally {
  if (client.running) client.destroy()
  await server.close()
  await rm(buildRoot, { recursive: true, force: true })
}
