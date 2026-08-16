// ============================================================
// mudb WebSocket 代理 — 转发 + 实时打印协议消息
// ============================================================

import { MuReadStream } from "mudb/stream"
import * as P from "./protocol"

const REAL_SERVER = "wss://743e6b8d.chat.box3.ink:35981"

// 消息 ID = 按协议注册顺序 + 消息名按字母序 + 每个协议末尾有1个raw slot
// schema.client = 客户端收到的消息 (server→client方向)
const PROTO_ORDER = [
  'netLog','models','gameNet','gameClock','input','sound','gameTerrain',
  'gameChat','playerProtocol','entityInteract','dialog','navigator','ref',
  'rtc','gui','market','teleport','remoteChannel','gameUI','admin'
]
interface MsgEntry { proto: string; msg: string; schema: any; isRaw?: boolean }
const msgMap: MsgEntry[] = []
for (const name of PROTO_ORDER) {
  const schema = (P as any)[name]
  const side = schema?.client
  if (!side) continue
  const keys = Object.keys(side).sort()
  for (const msgName of keys) {
    msgMap.push({ proto: name, msg: msgName, schema: side[msgName] })
  }
  msgMap.push({ proto: name, msg: '(raw)', schema: null as any, isRaw: true })
}

console.log(`已加载 ${msgMap.length} 个消息类型 (${PROTO_ORDER.length} protocols, each +1 raw)`)

let ignoredCount = 0

function tryDecode(bytes: Uint8Array, dir: string): string | null {
  try {
    // 小于等于 3 字节的小包（心跳/ACK）
    if (bytes.length <= 3) return `⏺ ${dir} ${bytes.length}B 心跳/ACK`

    const stream = new MuReadStream(bytes)
    const msgId = stream.readVarint()
    const payload = stream.bytes()
    const entry = msgMap[msgId]
    if (!entry) return `⏺ ${dir} #${msgId} 未知(${payload.length}B)`
    if (entry.isRaw) return null

    if (entry.proto === 'gameClock' && entry.msg === 'ping') return null
    if (entry.proto === 'gameNet' && entry.msg === 'pause') return null
    if (entry.proto === 'gameChat' && entry.msg === 'noticeMessage') return null
    if (entry.proto === 'gameNet' && entry.msg === 'exceedUserLimit') return null


    const result = entry.schema.patch(entry.schema.identity, new MuReadStream(payload))
    if (result === undefined) return `#${msgId} ${entry.proto}.${entry.msg} = undefined`
    const json = JSON.stringify(result)
    return `#${msgId} ${entry.proto}.${entry.msg} = ${json || 'undefined'}`
  } catch (e: any) {
    const id = typeof msgId !== 'undefined' ? '#' + msgId : '?'
    return `${id} error: ${e.message.slice(0, 80)}`
  }
}

const server = Bun.serve({
  port: 8080,
  websocket: {
    open(ws) {
      const sid = ws.data?.sid || "proxy"
      console.log(`\n🟢 客户端已连接 (sid=${sid})`)

      // 连接到真实服务器，带上 session ID
      const real = new WebSocket(`${REAL_SERVER}/?sid=${sid}`)
      ws.data = { real, buffer: [] as string[] }

      real.binaryType = "arraybuffer"

      real.onopen = () => {
        console.log("🟢 已连接真实服务器")
        // 把客户端堆积的消息发过去
        for (const msg of (ws.data as any).buffer) {
          real.send(msg)
        }
        ;(ws.data as any).buffer = []
      }

      real.onmessage = (event) => {
        const raw = typeof event.data === "string" ? event.data : new Uint8Array(event.data)
        if (typeof raw === "string") {
          console.log(`← 服务器 TEXT: ${raw.slice(0, 200)}`)
        } else {
          const decoded = tryDecode(raw, '←')
          if (decoded) console.log(`← 服务器 BIN (${raw.length}B): ${decoded}`)
        }
        ws.send(raw) // 转发给客户端
      }

      real.onerror = (e) => console.error("❌ 服务器错误:", e)
      real.onclose = (e) => {
        console.log(`🔌 服务器断开 code=${e.code}`)
        ws.close()
      }
    },

    message(ws, raw) {
      const data = (ws.data as any)
      if (data.real?.readyState === WebSocket.OPEN) {
        if (typeof raw === "string") {
          console.log(`→ 客户端 TEXT: ${raw.slice(0, 200)}`)
          data.real.send(raw)
        } else {
          const bytes = new Uint8Array(raw as ArrayBuffer)
          const decoded = tryDecode(bytes, '→')
          if (decoded) console.log(`→ 客户端 BIN (${bytes.length}B): ${decoded}`)
          data.real.send(bytes)
        }
      } else {
        // 还没连上真实服务器，缓存
        data.buffer.push(raw)
      }
    },

    close(ws) {
      console.log("🔌 客户端断开")
      const data = ws.data as any
      try { data.real?.close() } catch {}
    },
  },

  fetch(req) {
    if (req.headers.get("upgrade") === "websocket") {
      const url = new URL(req.url)
      const sid = url.searchParams.get("sid")
      // 没有 sid 的 WebSocket 连接（聊天等）直接拒绝
      if (!sid) {
        console.log(`  ⛔ 拒绝无 sid 的 WebSocket: ${url.pathname}`)
        return new Response("rejected", { status: 403 })
      }
      console.log(`  ✅ 接受 mudb 连接 sid=${sid}`)
      return server.upgrade(req, { data: { sid } }) ? undefined : new Response("upgrade failed", { status: 500 })
    }
    return new Response("mudb proxy running on :8080\n\n用法: 修改游戏 WebSocket URL 为 ws://localhost:8080/?sid=你的session", { status: 200 })
  },
})

console.log(`\n🎯 mudb proxy 已启动`)
console.log(`   客户端连: ws://localhost:${server.port}`)
console.log(`   后端转发: ${REAL_SERVER}\n`)
