// Runtime Server 整合测试：
// createSession → mudb 3-WS → gameNet.join → parkour script onPlayerJoin
// → world.say → gameChat log 回传；gameChat.noticeMessage → onChat → echo。
import { strict as assert } from "node:assert"
import { rm } from "node:fs/promises"
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameChat, gameClock, gameNet, remoteChannel } from "../protocol"
import { startRuntimeServer } from "./runtime-server"

const sourceRoot = "D:/Projects/Gaming/NEA-Revive/packages/parkour"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const buildRoot = `D:/Projects/Gaming/NEA-Revive/.build/runtime-server-build-${process.pid}`

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })
const chatLogs: Array<{ text: string; id: number }> = []
const remoteEvents: any[] = []

// createSession（voxweb 契约）
const sessionResponse = await fetch(`http://${server.host}:${server.port}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "弑神宗-小椰" }), // parkour admin 名单成员，才能触发加速/飞行等命令
})
const sessionJson = (await sessionResponse.json()) as any
const sessionId: string = sessionJson.config.sessionId
const socketServerUrl: string = sessionJson.config.socketServerUrl
assert.equal(sessionJson.config.maxSockets, 3)
assert.ok(socketServerUrl.endsWith("/ws"))

const socket = new MuWebSocket({
  sessionId,
  url: socketServerUrl,
  maxSockets: 3,
  logger: { log() {}, error() {}, exception() {} },
})
const client = new MuClient(socket, undefined, true) // skipProtocolValidation（与恢复运行时一致）

let chatProtocol: any
let gameNetProtocol: any
let clockProtocol: any

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(
    Object.keys(schema.client).map((name) => [name, () => undefined]),
  )
  if (schema === gameChat) {
    handlers.log = (data) => chatLogs.push({ text: data.text, id: data.id })
  }
  if (schema === gameClock) {
    handlers.pong = () => { pongReceived = true }
  }
  if (schema === remoteChannel) {
    handlers.sendClientEvent = data => remoteEvents.push(JSON.parse(data.args))
  }
  protocol.configure({ message: handlers } as any)
  if (schema === gameChat) chatProtocol = protocol
  if (schema === gameNet) gameNetProtocol = protocol
  if (schema === gameClock) clockProtocol = protocol
}

let pongReceived = false

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

try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for mudb ready")), 8000)
    client.start({
      ready: () => {
        clearTimeout(timeout)
        resolve()
      },
      close: (error) => reject(new Error(`mudb client closed: ${String(error ?? "unknown")}`)),
    })
  })

  // 1) join → parkour onPlayerJoin → world.say("...进入了地图") → gameChat log
  gameNetProtocol.server.message.join()
  await waitFor(() => chatLogs.some((entry) => entry.text.includes("进入了地图")))
  const joinMessage = chatLogs.find((entry) => entry.text.includes("进入了地图"))!
  console.log("[ok] join -> parkour onPlayerJoin -> world.say:", joinMessage.text)
  await waitFor(() => remoteEvents.some(event => event.type === "parkour:checkpoint" && event.index === 1))
  console.log("[ok] spawn -> checkpoint entity contact -> remote event")

  // 2) 聊天命令 → onChat → world.say echo
  chatProtocol.server.message.noticeMessage({ detail: "加速", title: "" })
  await waitFor(() => chatLogs.some((entry) => entry.text.includes("加速了")))
  const chatMessage = chatLogs.find((entry) => entry.text.includes("加速了"))!
  console.log("[ok] noticeMessage -> onChat -> world.say:", chatMessage.text)

  // 3) game-clock ping/pong 仍正常
  clockProtocol.server.message.ping(99)
  await waitFor(() => pongReceived)

  console.log("runtime-server integration test passed")
} finally {
  if (client.running) client.destroy()
  await server.close()
  await rm(buildRoot, { recursive: true, force: true })
}
