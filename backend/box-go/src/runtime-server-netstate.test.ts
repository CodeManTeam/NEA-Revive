// 验证 join 后 net-state 帧（含 avatarSkin）能到达客户端并被 raw handler 捕获，
// 且 models.appendSkinPartHashes 到达客户端。
import { strict as assert } from "node:assert"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameNet, gameTerrain } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/parkour"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = "D:/Projects/Gaming/NEA-Revive/.build/runtime-server-build-netstate"

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })

const sessionResponse = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "弑神宗-小椰" }),
})
const sessionJson = (await sessionResponse.json()) as any
const socket = new MuWebSocket({
  sessionId: sessionJson.config.sessionId,
  url: sessionJson.config.socketServerUrl,
  maxSockets: 3,
  logger: { log() {}, error() {}, exception() {} },
})
const client = new MuClient(socket, undefined, true)

let netProto: any
let modelsProto: any
const rawFrames: Uint8Array[] = []
const skinPartHashes: any[] = []

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map((name) => [name, () => undefined]),
  )
  if (schema.name === "models") {
    handlers.appendSkinPartHashes = (data: any) => {
      skinPartHashes.push(...structuredClone(data))
    }
  }
  protocol.configure({
    message: handlers as any,
    raw: (bytes: Uint8Array) => rawFrames.push(Uint8Array.from(bytes)),
  } as any)
  if (schema === gameNet) netProto = protocol
  if (schema.name === "models") modelsProto = protocol
}

function waitFor(predicate: () => boolean, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      if (predicate()) return resolve()
      if (Date.now() - started > timeoutMs) return reject(new Error("Timed out"))
      setTimeout(poll, 50)
    }
    poll()
  })
}

await new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("mudb ready timeout")), 8000)
  client.start({
    ready: () => { clearTimeout(timeout); resolve() },
    close: (e) => reject(new Error(`closed: ${String(e)}`)),
  })
})

try {
  netProto.server.message.join()
  // rawFrames[0] = secret payload（1 'E' 0 playerId ...）
  // rawFrames[1] = net-state 帧（tick*2 varint 开头，非 secret）
  await waitFor(() => rawFrames.length >= 2)
  const secret = rawFrames[0]
  const netstate = rawFrames[1]
  console.log("[ok] secret payload:", Buffer.from(secret).toString("hex"))
  assert.equal(secret[0], 1)
  assert.equal(secret[1], 69)
  assert.equal(secret[2], 0)
  // net-state 帧：第一个 varint 是 tick*2 = 8（非 secret 模式 1 'E' 0）
  assert.notEqual(netstate[0], 1, "net-state frame is not the secret")
  console.log("[ok] net-state frame:", Buffer.from(netstate.slice(0, 20)).toString("hex"), `... (${netstate.length} bytes)`)
  assert.ok(netstate.length > 4, "net-state frame has content")

  // models.appendSkinPartHashes 到达
  await waitFor(() => skinPartHashes.length > 0)
  console.log(`[ok] skin part hashes: ${skinPartHashes.length}`)
  assert.ok(skinPartHashes.length >= 100, "skin part hashes loaded from bootstrap")

  console.log("runtime-server netstate test passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
}
