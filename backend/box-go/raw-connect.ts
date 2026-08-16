// ============================================================
// 裸 WebSocket 连接 — 只输出原始收发的消息
// ============================================================

const WS_URL = "wss://6525aa75.chat.box3.ink:33815/?sid=uqbry44b2h"
console.log(`正在连接: ${WS_URL}`)

const ws = new WebSocket(WS_URL)

ws.onopen = () => {
  console.log("\n✅ 已连接!\n")

  // mudb 通道协商：第一个连接标为 reliable
  console.log("➡️ SEND:", '{"reliable":true}')
  ws.send('{"reliable":true}')
}

let msgIndex = 0
ws.onmessage = (event) => {
  const data = event.data
  msgIndex++
  if (typeof data === "string") {
    console.log(`📩 [${msgIndex}] TEXT:`, data)
  } else if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data)
    console.log(`📩 [${msgIndex}] BINARY (${bytes.length}B):`, [...bytes].map(b => b.toString(16).padStart(2,"0")).join(" "))
    try {
      console.log("   utf8:", new TextDecoder().decode(data))
    } catch {}
  }
}

ws.onerror = (err) => {
  console.error("❌ 错误:", err)
}

ws.onclose = (event) => {
  console.log(`\n🔌 关闭: code=${event.code} reason=${event.reason}`)
  process.exit(0)
}

// 5秒后自动退出
setTimeout(() => {
  console.log("\n⏱️ 超时退出")
  ws.close()
  process.exit(0)
}, 5000)
