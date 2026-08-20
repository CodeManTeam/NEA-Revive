import { startRuntimeServer } from "../backend/box-go/src/runtime-server.ts"

const root = process.env.NEA_ROOT ?? process.cwd()
const port = Number(process.env.NEA_PORT ?? 14323)

await startRuntimeServer({
  host: process.env.NEA_HOST ?? "127.0.0.1",
  port,
  sourceRoot: process.env.NEA_SOURCE_ROOT ?? `${root}/packages/there-is-backroom`,
  assetRoot: process.env.NEA_ASSET_ROOT ?? `${root}/backend/local-player/archive`,
  buildRoot: process.env.NEA_BUILD_ROOT ?? `${root}/.build/there-is-backroom`,
})

console.log(`NEA runtime ready on 127.0.0.1:${port}`)
