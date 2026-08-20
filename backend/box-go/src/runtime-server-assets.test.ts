import { strict as assert } from "node:assert"
import { readFile, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { startRuntimeServer } from "./runtime-server"

const root = "D:/Projects/Gaming/NEA-Revive"
const sourceRoot = `${root}/packages/there-is-backroom`
const assetRoot = `${root}/backend/local-player/archive`
const buildRoot = `${root}/.build/runtime-server-assets-${process.pid}`
const logicalSample = "audio/FBIOPENTHEDOOR.mp3"
const importedName = "audio/audio_FBIOPENTHEDOOR.mp3"

const server = await startRuntimeServer({ port: 0, sourceRoot, assetRoot, buildRoot, quiet: true })
try {
  const index = JSON.parse(await readFile(`${buildRoot}/assets/index.json`, "utf8"))
  const entry = index.assets.find((asset: any) => asset.name === importedName)
  assert.ok(entry, "imported project asset index should declare the historical sound sample")
  const expected = await readFile(resolve(buildRoot, entry.path))

  const response = await fetch(`http://${server.host}:${server.port}/assets/${logicalSample}`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "audio/mpeg")
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected)

  const exactResponse = await fetch(`http://${server.host}:${server.port}/assets/${importedName}`)
  assert.equal(exactResponse.status, 200)
  assert.deepEqual(Buffer.from(await exactResponse.arrayBuffer()), expected)

  const missing = await fetch(`http://${server.host}:${server.port}/assets/audio/not-declared.mp3`)
  assert.equal(missing.status, 404)

  const traversal = await fetch(`http://${server.host}:${server.port}/assets/audio/%2e%2e%2fassets%2findex.json`)
  assert.equal(traversal.status, 403)

  const malformed = await fetch(`http://${server.host}:${server.port}/assets/audio/%ZZ.mp3`)
  assert.equal(malformed.status, 400)
} finally {
  await server.close()
  await rm(buildRoot, { recursive: true, force: true })
}
