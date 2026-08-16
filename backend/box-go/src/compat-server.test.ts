import { strict as assert } from "node:assert"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameClock, gameNet } from "../protocol"
import { startCompatServer } from "./compat-server"

const server = await startCompatServer({ port: 0, quiet: true })
const sessionId = "compat-smoke-test"
const socket = new MuWebSocket({
  sessionId,
  url: `ws://${server.host}:${server.port}${server.path}`,
  maxSockets: 3,
  logger: { log() {}, error() {}, exception() {} },
})
const client = new MuClient(socket)
let clockProtocol: any
let gameNetProtocol: any
let handlePong: (data: { clientClock: number; serverClock: number; frameSkip: number }) => void = () => undefined

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map(name => [name, () => undefined]),
  )
  if (schema === gameClock) handlers.pong = data => handlePong(data)
  protocol.configure({ message: handlers } as any)
  if (schema === gameClock) clockProtocol = protocol
  if (schema === gameNet) gameNetProtocol = protocol
}

try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for mudb ping/pong")), 5000)
    handlePong = data => {
      try {
        assert.equal(data.clientClock, 1234)
        assert.equal(data.frameSkip, 0)
        assert.ok(Number.isFinite(data.serverClock))
        clearTimeout(timeout)
        resolve()
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    }

    client.start({
      ready: () => {
        gameNetProtocol.server.message.join()
        gameNetProtocol.server.message.synchronize()
        clockProtocol.server.message.ping(1234)
      },
      close: error => reject(new Error(`mudb client closed before pong: ${String(error ?? "unknown")}`)),
    })
  })

  const status = await fetch(`http://${server.host}:${server.port}/api/status`).then(response => response.json()) as any
  assert.equal(status.connections, 1)
  assert.equal(status.byMessage["game-net.join"], 1)
  assert.equal(status.byMessage["game-net.synchronize"], 1)
  assert.equal(status.byMessage["game-clock.ping"], 1)
  assert.equal(status.protocols.length, 20)
  console.log("compat-server smoke test passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
}
