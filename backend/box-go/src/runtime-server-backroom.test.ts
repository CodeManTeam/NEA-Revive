import { strict as assert } from "node:assert"
import { rm } from "node:fs/promises"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, dialog, entityInteract, gameNet, gameTerrain, remoteChannel } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/there-is-backroom"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = `D:/Projects/Gaming/NEA-Revive/.build/runtime-server-backroom-${process.pid}`

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })
const response = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "Backroom-M1" }),
})
assert.equal(response.status, 200)
const config = (await response.json()).config
const client = new MuClient(new MuWebSocket({
  sessionId: config.sessionId,
  url: config.socketServerUrl,
  maxSockets: config.maxSockets,
  logger: { log() {}, error() {}, exception() {} },
}), undefined, true)
let secondClient: MuClient | undefined

let reset: any
let chunk: any
const chunks = new Map<number, any>()
let netProtocol: any
let terrainProtocol: any
let interactProtocol: any
let dialogProtocol: any
let openedDialog: any
const clientEvents: any[] = []
for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map((name) => [name, () => undefined]),
  )
  if (schema === gameTerrain) {
    handlers.reset = (data) => { reset = structuredClone(data) }
    handlers.chunkResponse = (data) => {
      const copy = structuredClone(data)
      chunks.set(copy.rpcId, copy)
      if (!chunk) chunk = copy
    }
    terrainProtocol = protocol
  }
  if (schema === gameNet) netProtocol = protocol
  if (schema === entityInteract) interactProtocol = protocol
  if (schema === dialog) {
    dialogProtocol = protocol
    handlers.open = (data) => { openedDialog = structuredClone(data) }
  }
  if (schema === remoteChannel) {
    handlers.sendClientEvent = (data) => { clientEvents.push(JSON.parse(String(data.args))) }
  }
  protocol.configure({ message: handlers as any, raw() {} } as any)
}

const waitFor = async (predicate: () => boolean, timeoutMs = 12000) => {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Backroom M1 probe timed out")
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Backroom mudb ready timed out")), 8000)
  client.start({ ready: () => { clearTimeout(timer); resolve() }, close: reject })
})

try {
  netProtocol.server.message.join()
  await waitFor(() => Boolean(reset))
  assert.deepEqual([reset.nx, reset.ny, reset.nz], [160, 128, 192])
  assert.deepEqual([reset.positionX, reset.positionY, reset.positionZ], [98, 11, 158])
  const joinedState = server.runtime.snapshot()
  assert.equal(joinedState.players.length, 1, "Backroom join should create one runtime player")
  assert.equal(joinedState.players[0].position[0], 98)
  assert.equal(joinedState.players[0].position[2], 158)
  assert.ok(joinedState.players[0].position[1] <= 11)

  const chunkId = Math.floor(reset.positionX / 32)
    + (reset.nx / 32) * (Math.floor(reset.positionY / 32) + (reset.ny / 32) * Math.floor(reset.positionZ / 32))
  terrainProtocol.server.message.fetchChunk({ chunkId, rpcId: 1 })
  await waitFor(() => chunks.has(1))
  chunk = chunks.get(1)
  assert.equal(chunk.rpcId, 1)
  assert.ok(Array.isArray(chunk.boxes), "Backroom spawn chunk response should contain boxes")

  // A legal spawn may sit in an empty air chunk. Probe the surrounding reset
  // grid to prove terrain streaming without assuming map-specific density.
  let nonEmptyChunk: any = null
  let rpcId = 2
  for (let z = 0; z < reset.nz / 32 && !nonEmptyChunk; z++) {
    for (let y = 0; y < reset.ny / 32 && !nonEmptyChunk; y++) {
      for (let x = 0; x < reset.nx / 32 && !nonEmptyChunk; x++) {
        const candidate = x + (reset.nx / 32) * (y + (reset.ny / 32) * z)
        if (candidate === chunkId) continue
        terrainProtocol.server.message.fetchChunk({ chunkId: candidate, rpcId })
        await waitFor(() => chunks.has(rpcId), 3000)
        const response = chunks.get(rpcId)
        if (response?.boxes?.length) nonEmptyChunk = response
        rpcId++
      }
    }
  }
  assert.ok(nonEmptyChunk?.boxes?.length > 0, "Backroom terrain grid should contain a non-empty chunk")

  const runtimeState = server.runtime.snapshot()
  assert.equal(runtimeState.players.length, 1, "Backroom join should create one runtime player")
  assert.ok(runtimeState.players[0].position[1] <= 11, "player should settle under gravity from spawn")
  server.runtime.dispatchInputEvents(1, { inputState: 0, movementX: 0, movementY: 0, angle: 0, pitch: 0 })
  server.runtime.dispatchChat(1, "M1 probe")
  assert.ok(server.runtime.snapshot().tick >= runtimeState.tick, "runtime should accept player events")
  const interactables = runtimeState.entities.filter((entity: any) => entity.enableInteract)
  assert.ok(interactables.length > 0, "Backroom server script should register an interactable entity")
  const passwordLock = runtimeState.entities.find((entity: any) => entity.tags.includes("密码锁"))
  assert.ok(passwordLock?.enableInteract, "Backroom password lock should be enabled by the original script")
  assert.equal(passwordLock.id, "密码锁-1")
  await waitFor(() => clientEvents.some((event) =>
    event.type === "nea-revive:sound"
      && event.command?.loop === true
      && event.command?.sample === "audio/six forty seven.mp3"
  ), 3000)
  await waitFor(() => clientEvents.some((event) =>
    event.type === "nea-revive:entity-state"
      && event.entityId === 0x10000 + 321
      && event.state?.enableInteract === true
      && event.state?.interactHint === "也许这些颜色可以帮助你"
      && event.state?.interactRadius === 3
  ), 3000)
  // Source index 321 is the imported entity's stable generic backend id.
  interactProtocol.server.message.interact({ id: 0x10000 + 321, tick: runtimeState.tick })
  await waitFor(() => Boolean(openedDialog), 3000)
  assert.equal(openedDialog.config.type, "input")
  assert.equal(openedDialog.config.data.common.content, "输入")
  dialogProtocol.server.message.close({
    rpcId: openedDialog.rpcId,
    result: { type: "input", data: "2738" },
  })
  await waitFor(() => server.runtime.snapshot().messages.some((message: any) => message.text?.includes("正确")), 3000)
  await waitFor(() => clientEvents.some((event) =>
    event.type === "nea-revive:entity-state"
      && event.entityId === 0x10000 + 321
      && event.state?.enableInteract === false
  ), 15000)
  // The original script animates the door in 50 asynchronous 100 ms steps;
  // allow scheduler jitter while keeping the assertion bounded.
  await waitFor(() => !server.runtime.snapshot().entities.some((entity: any) => entity.tags.includes("密码门")), 15000)

  const firstPlayerMusicCount = clientEvents.filter((event) =>
    event.type === "nea-revive:sound" && event.command?.sample === "audio/six forty seven.mp3"
  ).length
  const secondResponse = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Backroom-Music-Recipient" }),
  })
  const secondConfig = (await secondResponse.json()).config
  secondClient = new MuClient(new MuWebSocket({
    sessionId: secondConfig.sessionId,
    url: secondConfig.socketServerUrl,
    maxSockets: secondConfig.maxSockets,
    logger: { log() {}, error() {}, exception() {} },
  }), undefined, true)
  let secondNetProtocol: any
  const secondClientEvents: any[] = []
  for (const schema of box3Protocols) {
    const protocol = secondClient.protocol(schema as any)
    const handlers: Record<string, (data: any) => void> = Object.fromEntries(
      Object.keys(schema.client).map((name) => [name, () => undefined]),
    )
    if (schema === gameNet) secondNetProtocol = protocol
    if (schema === remoteChannel) handlers.sendClientEvent = data => secondClientEvents.push(JSON.parse(String(data.args)))
    protocol.configure({ message: handlers as any, raw() {} } as any)
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Second Backroom mudb ready timed out")), 8000)
    secondClient!.start({ ready: () => { clearTimeout(timer); resolve() }, close: reject })
  })
  secondNetProtocol.server.message.join()
  await waitFor(() => secondClientEvents.some((event) =>
    event.type === "nea-revive:sound"
      && event.command?.loop === true
      && event.command?.sample === "audio/six forty seven.mp3"
  ), 3000)
  await new Promise(resolve => setTimeout(resolve, 100))
  assert.equal(clientEvents.filter((event) =>
    event.type === "nea-revive:sound" && event.command?.sample === "audio/six forty seven.mp3"
  ).length, firstPlayerMusicCount, "player music must not be broadcast to other sessions")
  console.log(`[ok] Backroom M1 reset=${reset.nx}x${reset.ny}x${reset.nz} spawnBoxes=${chunk.boxes.length} terrainBoxes=${nonEmptyChunk.boxes.length} interactables=${interactables.length}`)
} finally {
  if (secondClient?.running) secondClient.destroy()
  if (client.running) client.destroy()
  await server.close()
  await rm(buildRoot, { recursive: true, force: true })
}
