// ============================================================
// 裸 WebSocket 监听 — 接收并解码二进制数据
// ============================================================

import { MuReadStream, MuWriteStream } from "mudb/stream"
import * as P from "./protocol"

const SID = "fuekdqnj6km"
const ws = new WebSocket(`wss://6525aa75.chat.box3.ink:33815/?sid=${SID}`)
ws.binaryType = "arraybuffer"

// 构建所有协议的消息 ID → (协议名, 消息名, schema) 映射
const msgMap: { id: number; proto: string; msg: string; schema: any }[] = []

let idBase = 0
for (const [name, proto] of Object.entries(P)) {
  const schema = proto as any
  if (!schema.client && !schema.server) continue

  // client 消息
  if (schema.client) {
    for (const [msgName, msgSchema] of Object.entries(schema.client)) {
      msgMap.push({ id: idBase++, proto: name, msg: msgName, schema: msgSchema })
    }
  }
  // server 消息 (server→client，所以客户端收到的 server 消息需要解析)
  if (schema.server) {
    for (const [msgName, msgSchema] of Object.entries(schema.server)) {
      msgMap.push({ id: idBase++, proto: name, msg: msgName, schema: msgSchema })
    }
  }
}

console.log(`监听 session=${SID}, ${msgMap.length} 个消息类型`)

let msgCount = 0
let bytesTotal = 0

ws.onmessage = (event) => {
  const data = event.data
  if (typeof data === "string") {
    console.log(`← TEXT: ${data}`)
    // 如果是 reliable 分配
    if (data.includes("reliable")) return
    // 尝试解析
    try { console.log("  →", JSON.parse(data)) } catch {}
    return
  }

  const bytes = new Uint8Array(data)
  bytesTotal += bytes.length
  msgCount++

  // 尝试解析消息 ID (varint 解码)
  const stream = new MuReadStream(bytes)
  let offset = 0
  try {
    const msgId = stream.readVarint()
    const payload = stream.bytes()
    const entry = msgMap[msgId]

    if (entry) {
      const result = entry.schema.patch(entry.schema.identity, new MuReadStream(payload))
      console.log(`← [${msgCount}] #${msgId} ${entry.proto}.${entry.msg}:`, JSON.stringify(result).slice(0, 100))
    } else {
      console.log(`← [${msgCount}] #${msgId} (unknown, ${payload.length}B):`,
        [...payload].map(b => b.toString(16).padStart(2,"0")).join(" ").slice(0, 120))
    }
  } catch (e: any) {
    console.log(`← [${msgCount}] parse error:`, e.message.slice(0, 60))
  }
}

ws.onopen = () => console.log("✅ 已连接")
ws.onclose = (e) => {
  console.log(`🔌 关闭 code=${e.code} 共${msgCount}条 ${bytesTotal}字节`)
  process.exit(0)
}

setTimeout(() => { console.log("⏱ 超时"); ws.close() }, 15000)
