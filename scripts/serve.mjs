// NEA-Revive 本地开发栈启动脚本：
// - 后端 runtime-server（18081）：packages/parkour + local-player archive
// - 前端静态服务器（18082）：frontend/voxweb/dist
// 用法：node scripts/serve.mjs [--backend-port 18081] [--frontend-port 18082]
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { extname, join, resolve, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = resolve(fileURLToPath(import.meta.url), "..", "..")
const backendPort = Number(process.env.NEA_BACKEND_PORT ?? 18081)
const frontendPort = Number(process.env.NEA_FRONTEND_PORT ?? 18082)

// ---- 后端（runtime-server）----
// 用 child 方式启动，避免本进程直接 import tsx 的生命周期耦合
import { spawn } from "node:child_process"
const backendChild = spawn(
  process.execPath,
  [
    "--import", "tsx",
    "-e", `
import { startRuntimeServer } from './src/runtime-server.ts'
const server = await startRuntimeServer({
  port: ${backendPort},
  sourceRoot: '${rootDir.replace(/\\/g, "/")}/packages/parkour',
  assetRoot: '${rootDir.replace(/\\/g, "/")}/backend/local-player/archive',
  buildRoot: '${rootDir.replace(/\\/g, "/")}/.build/parkour',
  quiet: false,
})
console.log('[backend] READY on', server.port)
const shutdown = async () => { await server.close(); process.exit(0) }
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
`,
  ],
  {
    cwd: join(rootDir, "backend", "box-go"),
    stdio: "inherit",
    shell: false,
  },
)
backendChild.on("exit", (code) => {
  console.log(`[backend] exited ${code}`)
  process.exit(code ?? 0)
})

// ---- 前端静态服务器 ----
const distRoot = resolve(rootDir, "frontend", "voxweb", "dist")
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".cmd": "text/plain",
  ".toml": "text/plain",
  ".md": "text/plain",
}

const frontend = createServer(async (req, res) => {
  try {
    const urlPath = (req.url ?? "/").split("?")[0]
    let filePath = normalize(join(distRoot, urlPath === "/" ? "start.html" : urlPath))
    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403)
      res.end("forbidden")
      return
    }
    const info = await stat(filePath).catch(() => null)
    if (!info || !info.isFile()) {
      res.writeHead(404)
      res.end("not found: " + urlPath)
      return
    }
    res.writeHead(200, { "content-type": mime[extname(filePath).toLowerCase()] ?? "application/octet-stream" })
    createReadStream(filePath).pipe(res)
  } catch (error) {
    res.writeHead(500)
    res.end(String(error))
  }
})
frontend.listen(frontendPort, "127.0.0.1", () => {
  console.log(`[frontend] READY on ${frontendPort} (dist: ${distRoot})`)
  console.log(`[play] http://127.0.0.1:${frontendPort}/start.html?nea=http://127.0.0.1:${backendPort}/api/createSession`)
})
