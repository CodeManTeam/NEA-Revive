// NEA-Revive 本地开发栈启动脚本：
// - 后端 runtime-server（18081）：packages/<map> + local-player archive
// - 前端静态服务器（18082）：frontend/voxweb/dist
// 用法：node scripts/serve.mjs [--map parkour|minecraft] [--backend-port 18081] [--frontend-port 18082]
import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { createReadStream } from "node:fs"
import { extname, join, resolve, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = resolve(fileURLToPath(import.meta.url), "..", "..")
const backendPort = Number(process.env.NEA_BACKEND_PORT ?? 18081)
const frontendPort = Number(process.env.NEA_FRONTEND_PORT ?? 18082)
const mapArg = process.argv.includes("--map")
  ? process.argv[process.argv.indexOf("--map") + 1]
  : (process.env.NEA_MAP ?? "parkour")
const maps = {
  parkour: { spawn: [115, 11, 154], build: "parkour" },
  minecraft: { spawn: [64, 3, 48], build: "minecraft" },
}
const map = maps[mapArg] ?? maps.parkour

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
  sourceRoot: '${rootDir.replace(/\\/g, "/")}/packages/${mapArg}',
  assetRoot: '${rootDir.replace(/\\/g, "/")}/backend/local-player/archive',
  buildRoot: '${rootDir.replace(/\\/g, "/")}/.build/${map.build}',
  spawn: [${map.spawn.join(", ")}],
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
// 本地资源覆盖（asset-overrides）：原版 box3 资产直接从 archive 提供，
// 让前端用真实水纹/贴图（如 water.bump）替代程序生成的占位。
const assetOverrideRoot = resolve(rootDir, "frontend", "voxweb", "asset-overrides")
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
    // 资源覆盖 manifest：slot → /asset-overrides/files/<name>
    if (urlPath === "/asset-overrides/manifest.json") {
      const manifest = JSON.parse(await readFile(join(assetOverrideRoot, "manifest.json"), "utf8"))
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" })
      res.end(JSON.stringify(manifest))
      return
    }
    // 覆盖文件本体
    if (urlPath.startsWith("/asset-overrides/files/")) {
      const fileName = decodeURIComponent(urlPath.slice("/asset-overrides/files/".length))
      if (!/^[A-Za-z0-9._-]+\.png$/.test(fileName)) {
        res.writeHead(403)
        res.end("forbidden")
        return
      }
      const filePath = resolve(assetOverrideRoot, "files", fileName)
      const info = await stat(filePath).catch(() => null)
      if (!info || !info.isFile()) {
        res.writeHead(404)
        res.end("asset not found")
        return
      }
      res.writeHead(200, { "content-type": "image/png", "cache-control": "public, max-age=86400" })
      createReadStream(filePath).pipe(res)
      return
    }
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
    // 内容寻址产物（WASM/JS/PNG/gltf）带长缓存（文件名含 hash），刷新秒开；
    // HTML 不缓存（启动参数可能变）。
    const ext = extname(filePath).toLowerCase()
    const cacheable = [".wasm", ".js", ".png", ".jpg", ".jpeg", ".gltf", ".mp3"].includes(ext)
    const headers = { "content-type": mime[ext] ?? "application/octet-stream" }
    if (cacheable) headers["cache-control"] = "public, max-age=86400"
    else headers["cache-control"] = "no-cache"
    res.writeHead(200, headers)
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
