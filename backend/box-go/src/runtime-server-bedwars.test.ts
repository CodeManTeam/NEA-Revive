import { strict as assert } from "node:assert"
import { rm } from "node:fs/promises"
import { readFile } from "node:fs/promises"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameChat, gameNet, gameTerrain, remoteChannel } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2"
const mainSourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/bedwars-s2-main"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = `D:/Projects/Gaming/NEA-Revive/.build/runtime-server-bedwars-${process.pid}`
const server = await startRuntimeServer({
  port: 0,
  sourceRoot,
  assetRoot,
  buildRoot,
  quiet: true,
  storageDefaults: { BlackList: [] },
  localLinks: { "https://dao3.fun/play/24576b13504b5ee91fb1": "http://127.0.0.1:18083/api/createSession" },
})

const group = server.runtime.storage.getGroupStorage("storage")
assert.deepEqual((await group.get("BlackList"))?.value, [])

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

  const ui = JSON.parse(await readFile(`${sourceRoot}/source/ui.json`, "utf8"))
  const inventoryHash = ui.pictureAssets["picture/inventoryImage.png"].hash
  const inventoryImage = await fetch(`http://${server.host}:${server.port}/engine/m/${inventoryHash}`)
  assert.equal(inventoryImage.status, 200)
  assert.equal(inventoryImage.headers.get("content-type"), "image/png")
  assert.equal((await inventoryImage.arrayBuffer()).byteLength, 98428)

  const uiMissingImageHash = ui.pictureAssets["picture/ChristmasChest.png"].hash
  const missingImage = await fetch(`http://${server.host}:${server.port}/engine/m/${uiMissingImageHash}`)
  assert.equal(missingImage.status, 200)
  assert.equal(missingImage.headers.get("content-type"), "image/png")
  assert.ok((await missingImage.arrayBuffer()).byteLength > 0)

  const mainBuildRoot = `D:/Projects/Gaming/NEA-Revive/.build/runtime-server-bedwars-main-${process.pid}`
  const mainServer = await startRuntimeServer({ port: 0, sourceRoot: mainSourceRoot, assetRoot, buildRoot: mainBuildRoot, quiet: true })
  try {
    // Both maps run in one launcher process. Their compressed scene payloads
    // must remain instance-local or the lobby receives the main-map entities.
    const mainScene = await fetch(`http://${mainServer.host}:${mainServer.port}/api/map/entities`, { headers: { "accept-encoding": "gzip" } }).then(response => response.json() as Promise<any>)
    const lobbyScene = await fetch(`http://${server.host}:${server.port}/api/map/entities`, { headers: { "accept-encoding": "gzip" } }).then(response => response.json() as Promise<any>)
    assert.ok(mainScene.entities.some((entity: any) => entity.nameplate?.text === "商店"))
    const joinGame = lobbyScene.entities.find((entity: any) => entity.scriptInteractHint === "加入游戏")
    assert.deepEqual({ scriptInteractable: joinGame?.scriptInteractable, nameplate: joinGame?.nameplate }, {
      scriptInteractable: true,
      nameplate: { text: "加入游戏", radius: 4.5, color: [1, 1, 0] },
    })
  } finally {
    await mainServer.close()
    await rm(mainBuildRoot, { recursive: true, force: true })
  }

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
  net.server.message.sendKeyBoardEvent({ id: 1, tick: 10, keyDownState: [50], prevKeyDownState: [] })
  await waitFor(() => events.some(event => event.type === "setChooseCase" && event.args?.pos === 1))
  net.server.message.sendKeyBoardEvent({ id: 1, tick: 11, keyDownState: [9], prevKeyDownState: [] })
  await waitFor(() => server.runtime.snapshot().players[0]?.cameraMode === "follow")
  net.server.message.input({
    pauseCounter: 0,
    tick: 12,
    events: [{
      rayTime: 1,
      tick: 12,
      rayHitEntity: 65540,
      rayHitVoxelX: 0,
      rayHitVoxelY: 0,
      rayHitVoxelZ: 0,
      buttonState: 2,
      prevButtonState: 0,
      position: [68.5, 59.2, 57.5],
      rayDirection: [0, 0, 1],
      rayHitNormal: 0,
      rayOrigin: [68.5, 59.2, 57.5],
    }],
    input: { inputState: 0, inputAngle: 0, inputCameraAngle: 0, inputPitch: 0, bodies: [] },
  })
  await waitFor(() => events.some(event => event.type === "nea-revive:link"))
  assert.deepEqual(events.find(event => event.type === "nea-revive:link"), {
    type: "nea-revive:link",
    href: "https://dao3.fun/play/24576b13504b5ee91fb1",
    options: { isNewTab: false, isConfirm: false },
    createSessionUrl: "http://127.0.0.1:18083/api/createSession",
  })
  console.log(`[ok] bedwars-s2 reset=${reset.nx}x${reset.ny}x${reset.nz} boxes=${nonEmptyChunk.boxes.length} events=${events.length}`)
} finally {
  if (client.running) client.destroy()
  await server.close()
  await rm(buildRoot, { recursive: true, force: true })
}
