// 完整 parkour 地形提取器（非净室：直接解析 DAO3 dump）：
// 1. 解析 gameTerrain.reset 帧 → shape(256×64×256) + 128 chunk hash
// 2. 每个 chunk hash 从 response-bodies 找 block 文件 → decodeVoxelChunk → boxes
// 3. 合并 boxes → nea-terrain/v1 格式 → 写 packages/parkour/world/terrain.json
import { readFileSync, writeFileSync } from "node:fs"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"
import { MuReadStream } from "mudb/stream"
import { gameTerrain } from "./protocol.ts"

const captureRoot = "D:/Projects/Gaming/NEA-Project/Evidence/dump/private/live-captures/20260729-181217"

// ---- decodeVoxelChunk（从 box3-server 移植）----
const chunkMask = 31
const maxPaletteEntries = 4096
const maxBoxes = 32768

function decodeZigZag(value) {
  return value & 1 ? -(value >>> 1) - 1 : value >>> 1
}
function deinterleave3(value) {
  let result = 1227133513 & value
  result = 3272356035 & (result | result >>> 2)
  result |= result >>> 4
  result &= 251719695
  result |= result >>> 8
  result &= 4278190335
  result |= result >>> 16
  result &= 1023
  return result
}
function compareTerrainBoxes(a, b) {
  return a.minZ - b.minZ || a.minY - b.minY || a.minX - b.minX || a.maxX - b.maxX || a.maxY - b.maxY || a.maxZ - b.maxZ || a.block - b.block || a.faces - b.faces
}

function decodeVoxelChunk(bytes) {
  const input = new MuReadStream(bytes)
  const paletteLength = input.readVarint()
  const boxCount = input.readVarint()
  if (paletteLength > maxPaletteEntries || boxCount > maxBoxes) throw new Error("chunk too large")
  const palette = new Array(paletteLength)
  for (let i = 0; i < paletteLength; i++) palette[i] = input.readVarint()
  const boxes = []
  let prevX = 0, prevY = 0, prevZ = 0
  for (let i = 0; i < boxCount; i++) {
    const minimum = input.readVarint()
    const size = input.readVarint()
    const paletteIndex = input.readVarint()
    if (paletteIndex >= palette.length) throw new Error("bad palette index")
    const minX = (prevX + decodeZigZag(deinterleave3(minimum))) & chunkMask
    const minY = (prevY + decodeZigZag(deinterleave3(minimum >>> 1))) & chunkMask
    const minZ = (prevZ + decodeZigZag(deinterleave3(minimum >>> 2))) & chunkMask
    const maxX = minX + deinterleave3(size)
    const maxY = minY + deinterleave3(size >>> 1)
    const maxZ = minZ + deinterleave3(size >>> 2)
    // palette 存 fullId（blockId 14 位 | rotation 2 位 << 14）
    const fullId = palette[paletteIndex]
    const blockId = fullId & 0x3fff
    const rotation = (fullId >>> 14) & 3
    boxes.push({ minX, minY, minZ, maxX, maxY, maxZ, block: blockId, rotation, faces: 0 })
    prevX = minX; prevY = minY; prevZ = minZ
  }
  return boxes
}

// ---- 1. 找 reset 帧（首个）----
async function findResetFrame() {
  const rl = createInterface({ input: createReadStream(join(captureRoot, "network", "websocket-frames.jsonl")) })
  for await (const line of rl) {
    let j
    try { j = JSON.parse(line) } catch { continue }
    if (j.direction !== "received" || j.opcode !== 2) continue
    const bytes = new Uint8Array(readFileSync(join(captureRoot, j.file)))
    const stream = new MuReadStream(bytes)
    const id = stream.readVarint()
    if (id === 28) {
      const reset = gameTerrain.client.reset.patch(gameTerrain.client.reset.identity, stream)
      return { reset, frameFile: j.file }
    }
  }
  throw new Error("reset frame not found")
}

// ---- 2. 建立 hash → block 文件映射 ----
async function buildHashToFile() {
  const map = new Map()
  const rl = createInterface({ input: createReadStream(join(captureRoot, "network", "response-bodies.jsonl")) })
  for await (const line of rl) {
    let j
    try { j = JSON.parse(line) } catch { continue }
    const url = j.url || ""
    const m = url.match(/\/block\/(Qm[A-Za-z0-9]{44})/)
    if (m && j.file) map.set(m[1], j.file)
  }
  return map
}

async function main() {
  console.log("[1] 找 reset 帧...")
  const { reset, frameFile } = await findResetFrame()
  console.log("  reset: shape=(" + reset.nx + "," + reset.ny + "," + reset.nz + ") spawn=(" + reset.positionX + "," + reset.positionY + "," + reset.positionZ + ") hashes=" + reset.hashes.length)
  console.log("  blocks CID:", reset.blocks)

  console.log("[2] 建立 block 文件映射...")
  const hashToFile = await buildHashToFile()
  console.log("  block 文件数:", hashToFile.size)

  console.log("[3] 解码 chunk...")
  const allBoxes = []
  let decoded = 0, missing = 0
  const missingHashes = []
  for (let ci = 0; ci < reset.hashes.length; ci++) {
    const hash = reset.hashes[ci]
    if (!hash) continue
    const file = hashToFile.get(hash)
    if (!file) {
      missing++
      if (missingHashes.length < 10) missingHashes.push(hash)
      continue
    }
    const bytes = new Uint8Array(readFileSync(join(captureRoot, file)))
    const boxes = decodeVoxelChunk(bytes)
    // chunk 坐标：ci = cx + 8*(cy + 2*cz)（8×2×8 网格）
    const gridI = 8, gridJ = 2
    const k = Math.floor(ci / (gridI * gridJ))
    const rest = ci % (gridI * gridJ)
    const j = Math.floor(rest / gridI)
    const i = rest % gridI
    const ox = i * 32, oy = j * 32, oz = k * 32
    for (const box of boxes) {
      allBoxes.push({
        from: [ox + box.minX, oy + box.minY, oz + box.minZ],
        to: [ox + box.maxX, oy + box.maxY, oz + box.maxZ],
        blockId: box.block,
      })
    }
    decoded++
  }
  console.log("  解码 chunk:", decoded, "缺失:", missing)
  if (missingHashes.length) console.log("  缺失 hash 示例:", missingHashes)

  console.log("[4] 写 terrain.json...")
  const out = {
    formatVersion: "nea-terrain/v1",
    boxes: allBoxes,
    voxels: [],
  }
  const outPath = "D:/Projects/Gaming/NEA-Revive/.build/terrain-extract-parkour/terrain.json"
  writeFileSync(outPath, JSON.stringify(out, null, 1))
  const size = JSON.stringify(out).length
  console.log("  总 boxes:", allBoxes.length)
  console.log("  输出:", outPath, "(" + Math.round(size / 1024) + " KB)")

  // 也写 nea.map.json 的 world 信息（shape/spawn）
  const worldInfo = {
    shape: [reset.nx, reset.ny, reset.nz],
    spawn: [reset.positionX, reset.positionY, reset.positionZ],
    innerAO: reset.innerAO,
    blocks: reset.blocks,
  }
  writeFileSync("D:/Projects/Gaming/NEA-Revive/.build/terrain-extract-parkour/world-info.json", JSON.stringify(worldInfo, null, 1))
  console.log("  world-info:", JSON.stringify(worldInfo))
}

main().catch(e => { console.error("FAILED:", e); process.exit(1) })
