import { strict as assert } from "node:assert"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameNet, remoteChannel } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const root = "D:/Projects/Gaming/NEA-Revive"
const runId = `${process.pid}-${Date.now()}`
const sourceRoot = `${root}/.build/runtime-server-remote-source-${runId}`
const buildRoot = `${root}/.build/runtime-server-remote-build-${runId}`
const assetRoot = `${root}/backend/local-player/archive`

await mkdir(sourceRoot, { recursive: true })
await cp(`${root}/packages/parkour`, sourceRoot, { recursive: true })
await writeFile(`${sourceRoot}/scripts/server.js`, `
world.onPlayerJoin(({ entity }) => {
  remoteChannel.sendClientEvent(entity, { type: "server:joined", playerId: entity.id })
})
remoteChannel.onServerEvent(({ entity, args }) => {
  remoteChannel.sendClientEvent(entity, { type: "server:pong", echo: args })
})
`, "utf8")

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })
const response = await fetch(`http://${server.host}:${server.port}/api/createSession`, { method: "POST" })
const session = (await response.json()) as any
const socket = new MuWebSocket({
  sessionId: session.config.sessionId,
  url: session.config.socketServerUrl,
  maxSockets: 3,
  logger: { log() {}, error() {}, exception() {} },
})
const client = new MuClient(socket, undefined, true)
let netProtocol: any
let remoteProtocol: any
const received: any[] = []
let clientModules: Record<string, string> | null = null

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers = Object.fromEntries(Object.keys(schema.client).map(name => [name, () => undefined])) as Record<string, (data: any) => void>
  if (schema === remoteChannel) {
    handlers.sendClientEvent = data => received.push({ tick: data.tick, event: JSON.parse(data.args) })
  }
  if (schema === gameNet) {
    handlers.syncClientScriptModules = modules => { clientModules = structuredClone(modules) }
  }
  protocol.configure({ message: handlers } as any)
  if (schema === gameNet) netProtocol = protocol
  if (schema === remoteChannel) remoteProtocol = protocol
}

function waitFor(predicate: () => boolean, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      if (predicate()) return resolve()
      if (Date.now() - started > timeoutMs) return reject(new Error("Timed out waiting for remote event"))
      setTimeout(poll, 25)
    }
    poll()
  })
}

try {
  await new Promise<void>((resolve, reject) => client.start({
    ready: resolve,
    close: error => reject(new Error(String(error ?? "MuDB client closed"))),
  }))
  netProtocol.server.message.join()
  await waitFor(() => server.runtime.snapshot().players.length === 1)
  await waitFor(() => clientModules !== null)
  assert.match(clientModules!["clientIndex.js"], /parkour client runtime panel loaded/)
  await waitFor(() => received.some(item => item.event.type === "server:joined"))
  assert.equal(received[0].event.type, "server:joined")
  assert.equal(received[0].tick, 1)

  remoteProtocol.server.message.sendServerEvent({ tick: 41, args: JSON.stringify({ type: "client:ping", value: 9 }) })
  await waitFor(() => received.some(item => item.event.type === "server:pong"))
  const pong = received.find(item => item.event.type === "server:pong")!
  assert.deepEqual(pong.event, {
    type: "server:pong",
    echo: { type: "client:ping", value: 9 },
  })
  assert.ok(pong.tick > 1)
  console.log("runtime-server remote-channel roundtrip passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
  await rm(sourceRoot, { recursive: true, force: true })
  await rm(buildRoot, { recursive: true, force: true })
}
