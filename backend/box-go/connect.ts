import { MuClient } from "mudb"
import { MuWebSocket } from "mudb/socket/web/client"
import * as P from "./protocol"

const WS_URL = "wss://6525aa75.chat.box3.ink:33815"
const SESSION = "fuekdqnj6km"
console.log(`[client] 连接到 ${WS_URL} sid=${SESSION}`)

const socket = new MuWebSocket({ sessionId: SESSION, url: WS_URL, maxSockets: 3 })
const client = new MuClient(socket, undefined, true)

let msgCount = 0

// Helper: auto-fill all message handlers with noop
function wrapProto(schema: any) {
  const handlers: any = {}
  if (schema.client) for (const k of Object.keys(schema.client)) handlers[k] = (d: any) => null
  if (schema.server) for (const k of Object.keys(schema.server)) handlers[k] = (d: any) => null
  return handlers
}

// Register all 20 protocols
const protos = [
  P.netLog, P.models, P.gameNet, P.gameClock, P.input,
  P.sound, P.gameTerrain, P.gameChat, P.playerProtocol, P.entityInteract,
  P.dialog, P.navigator, P.ref, P.rtc, P.gui,
  P.market, P.teleport, P.remoteChannel, P.gameUI, P.admin,
]

for (const schema of protos) {
  const h = wrapProto(schema)
  // Override specific handlers with logging
  if (schema === P.gameNet) {
    h.scriptEvents = (d: any) => { msgCount++; console.log(`[${msgCount}] scriptEvents`) }
    h.syncClientScriptModules = (d: any) => { msgCount++; console.log(`[${msgCount}] syncModules: ${Object.keys(d||{}).length}`) }
  }
  if (schema === P.gameClock) {
    h.pong = (d: any) => { msgCount++; console.log(`[${msgCount}] pong offset=${Math.round(d.serverClock-d.clientClock)}ms`) }
  }
  if (schema === P.gameChat) {
    h.log = (d: any) => { msgCount++; console.log(`[${msgCount}] chat: ${d.text}`) }
    h.globalNotice = (d: any) => { msgCount++; console.log(`[${msgCount}] notice: ${d.title}`) }
  }
  if (schema === P.playerProtocol) {
    h.playerJoin = (d: any) => { msgCount++; console.log(`[${msgCount}] playerJoin: ${d.id}`) }
    h.playerLeave = (d: any) => { msgCount++; console.log(`[${msgCount}] playerLeave: ${d.id}`) }
  }
  if (schema === P.gameTerrain) {
    h.reset = (d: any) => { msgCount++; console.log(`[${msgCount}] terrain reset (${d.positionX},${d.positionY})`) }
  }
  if (schema === P.dialog) {
    h.open = (d: any) => { msgCount++; console.log(`[${msgCount}] dialog`) }
  }
  if (schema === P.gameUI) {
    h.reset = (d: any) => { msgCount++; console.log(`[${msgCount}] gameUI`) }
  }

  const proto = client.protocol(schema as any)
  proto.configure({ message: h })
}

client.start({
  ready: () => {
    console.log("✅ 已连接! 等待服务器消息...")
    // 先不发 join，看看服务器会主动发什么
  },
  close: (err: any) => {
    console.log("🔌 断开:", err?.code ?? err)
    process.exit(0)
  },
})

setTimeout(() => { console.log("⏱ 超时"); client.destroy(); process.exit(0) }, 30000)
