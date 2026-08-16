// 连接原版 box3-server（14325，minecraft 项目包）：验证握手 + 脚本执行
import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import { box3Protocols, gameChat, gameClock, gameNet } from "./protocol"

const PORT = 14325
const sessionResponse = await fetch(`http://127.0.0.1:${PORT}/api/createSession`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "play", contentId: "100110008", fingerPrint: "ws-test", serverId: "" }),
})
const sessionJson = (await sessionResponse.json()) as any
const sessionId: string = sessionJson.config.sessionId
const socketServerUrl: string = sessionJson.config.socketServerUrl
console.log("session:", sessionId, socketServerUrl)

const socket = new MuWebSocket({ sessionId, url: socketServerUrl, maxSockets: 3, logger: { log() {}, error() {}, exception() {} } })
const client = new MuClient(socket, undefined, true)

let chatLogs: Array<{ text: string; id: number }> = []
let pongReceived = false
let gameNetProtocol: any
let clockProtocol: any
let chatProtocol: any

for (const schema of box3Protocols) {
  const protocol = client.protocol(schema as any)
  const handlers: Record<string, (data: any) => void> = Object.fromEntries(Object.keys(schema.client).map((name) => [name, () => undefined]))
  if (schema === gameChat) handlers.log = (data) => chatLogs.push({ text: data.text, id: data.id })
  if (schema === gameClock) handlers.pong = () => { pongReceived = true }
  protocol.configure({ message: handlers } as any)
  if (schema === gameChat) chatProtocol = protocol
  if (schema === gameNet) gameNetProtocol = protocol
  if (schema === gameClock) clockProtocol = protocol
}

function waitFor(predicate: () => boolean, timeoutMs = 12000): Promise<void> {
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

try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("mudb ready timeout")), 8000)
    client.start({ ready: () => { clearTimeout(timeout); resolve() }, close: (e) => reject(new Error(`closed: ${e}`)) })
  })
  console.log("[ok] mudb ready")

  gameNetProtocol.server.message.join()
  console.log("[ok] join sent")
  // 官方流程：join → 服务端发 secret → 客户端 synchronize + unpause → reset
  await new Promise(r => setTimeout(r, 1500))
  gameNetProtocol.server.message.synchronize()
  console.log("[ok] synchronize sent")
  await new Promise(r => setTimeout(r, 500))
  gameNetProtocol.server.message.unpause(0)
  console.log("[ok] unpause sent")
  await waitFor(() => pongReceived || chatLogs.length > 0, 10000)
  console.log("[ok] pong:", pongReceived, "chat logs:", chatLogs.length)
  if (chatLogs.length) console.log("  chat:", chatLogs.map((c) => c.text).join(" | "))

  await new Promise(r => setTimeout(r, 3000))
  console.log("[ok] 3s 后 chat logs:", chatLogs.length)
  if (chatLogs.length) console.log("  chat:", chatLogs.map((c) => c.text).join(" | "))
  console.log("done")
} finally {
  if (client.running) client.destroy()
}
