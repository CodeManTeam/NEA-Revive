import { analyzeCapture, decodeMessage, loadCapture, type CaptureFile } from "./capture"
import { existsSync } from "node:fs"
import { extname, resolve, sep } from "node:path"

interface ServerOptions {
  capturePath: string
  port?: number
}

interface SocketData {
  connectedAt: number
  received: number
}

export async function startLocalServer(options: ServerOptions): Promise<void> {
  const port = options.port ?? Number(Bun.env.BOX_GO_PORT ?? 8080)
  const capture = await loadCapture(options.capturePath)
  const summary = await analyzeCapture(options.capturePath)
  const inbound = capture.messages.filter(message => message.direction === "receive")

  const server = Bun.serve<SocketData>({
    port,
    fetch(request, server) {
      const url = new URL(request.url)
      if (url.pathname === "/ws") {
        const upgraded = server.upgrade(request, { data: { connectedAt: Date.now(), received: 0 } })
        return upgraded ? undefined : new Response("WebSocket upgrade failed", { status: 400 })
      }
      if (url.pathname === "/api/status") return Response.json({ summary, replayPackets: inbound.length })
      if (url.pathname === "/api/capture") return Response.json(redactedCapture(capture))
      if (url.pathname.startsWith("/assets/")) return serveAsset(url.pathname.slice("/assets/".length))
      return new Response(renderPage(summary, inbound.length), { headers: { "content-type": "text/html; charset=utf-8" } })
    },
    websocket: {
      open(socket) {
        console.log(`[local] client connected; replay packets=${inbound.length}`)
        if (inbound.length) replay(socket, inbound)
      },
      message(socket, message) {
        socket.data.received += 1
        const size = typeof message === "string" ? message.length : message.byteLength
        console.log(`[local] client -> server #${socket.data.received} ${size} bytes`)
      },
      close(socket) {
        console.log(`[local] client disconnected after ${Date.now() - socket.data.connectedAt}ms`)
      },
    },
  })

  console.log(`Box-GO local runtime: http://localhost:${server.port}`)
  console.log(`Capture: ${summary.path}`)
  if (!inbound.length) console.warn("Capture has no server->client packets; server is running in record-only mode.")
}

function serveAsset(requestPath: string): Response {
  const root = resolve("dump", "runtime-assets", "box-go-dump")
  const path = resolve(root, decodeURIComponent(requestPath))
  if (path !== root && !path.startsWith(root + sep)) return new Response("Invalid path", { status: 400 })
  if (!existsSync(path)) return new Response("Not found", { status: 404 })
  return new Response(Bun.file(path), { headers: { "content-type": contentType(path) } })
}

function contentType(path: string): string {
  const types: Record<string, string> = {
    ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg",
    ".woff": "font/woff", ".woff2": "font/woff2",
  }
  return types[extname(path).toLowerCase()] ?? "application/octet-stream"
}

function replay(socket: Bun.ServerWebSocket<SocketData>, messages: CaptureFile["messages"]): void {
  const start = messages[0]?.at ?? 0
  for (const message of messages) {
    const payload = decodeMessage(message)
    if (payload === null) continue
    const delay = Math.min(Math.max(message.at - start, 0), 30_000)
    setTimeout(() => socket.send(payload), delay)
  }
}

function redactedCapture(capture: CaptureFile): object {
  return {
    ...capture,
    pageUrl: capture.pageUrl.replace(/([?&]token=)[^&]+/, "$1[redacted]"),
    sockets: capture.sockets.map(socket => ({ ...socket, sid: socket.sid ? "[redacted]" : socket.sid })),
    messages: undefined,
  }
}

function renderPage(summary: Awaited<ReturnType<typeof analyzeCapture>>, replayPackets: number): string {
  const rows = Object.entries(summary).map(([key, value]) => `<tr><th>${key}</th><td>${String(value)}</td></tr>`).join("")
  return `<!doctype html><meta charset="utf-8"><title>Box-GO Local Runtime</title><style>body{font:14px system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#111;color:#eee}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid #333}th{width:180px;color:#9fe8b0}code{color:#9fe8b0}</style><h1>Box-GO Local Runtime</h1><p>WebSocket endpoint: <code>ws://localhost:8080/ws</code></p><p>Replay packets: <strong>${replayPackets}</strong></p><table>${rows}</table>`
}
