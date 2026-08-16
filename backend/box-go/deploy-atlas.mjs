// 生成 asset-overrides：把真实 atlas PNG 从 archive/block 复制到 frontend asset-overrides，
// 写 manifest.json 映射 terrain.color.N / material.N / bump.N。
// 让 voxweb 前端用真实贴图（替代匿名程序化贴图）。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { decodeBlockCatalogMetadata } = await import("../local-player/src/block-info.mjs")

const archiveRoot = "D:/Projects/Gaming/NEA-Revive/backend/local-player/archive"
const assetRoot = "D:/Projects/Gaming/NEA-Revive/frontend/voxweb/asset-overrides"
const filesDir = join(assetRoot, "files")

const blockInfoBytes = readFileSync(join(archiveRoot, "block", "QmW2E9E8ipYUifsCfkMj5SULYMYbFQvP6BQxo52atXw7Zj"))
const meta = decodeBlockCatalogMetadata(blockInfoBytes)

mkdirSync(filesDir, { recursive: true })

const replacements = {}
let copied = 0, missing = 0

function deployAtlas(slotPrefix, hashes, startIndex) {
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i]
    const src = join(archiveRoot, "block", hash)
    if (!existsSync(src)) {
      console.log(`[missing] ${slotPrefix}.${i}: ${hash}`)
      missing++
      continue
    }
    const ext = hash.endsWith(".png") ? ".png" : ""
    const dstName = `${slotPrefix.replace(/\./g, "-")}-level-${i}${ext}`
    copyFileSync(src, join(filesDir, dstName))
    replacements[`${slotPrefix}.${i}`] = `/asset-overrides/files/${dstName}`
    copied++
  }
}

// colorAtlas: 10 张 mip（对应 terrain.color.0..9）
deployAtlas("terrain.color", meta.atlas.color, 0)
deployAtlas("terrain.material", meta.atlas.material, 0)
deployAtlas("terrain.bump", meta.atlas.bump, 0)

const manifest = { version: 1, replacements }
writeFileSync(join(assetRoot, "manifest.json"), JSON.stringify(manifest, null, 2))
console.log(`\n复制 PNG: ${copied}, 缺失: ${missing}`)
console.log(`manifest 条目: ${Object.keys(replacements).length}`)
