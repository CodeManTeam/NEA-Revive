import fs from "node:fs"

const packageRoot = "packages/there-is-backroom"
const inventory = JSON.parse(fs.readFileSync(".build/backroom-model-inventory.json", "utf8"))
const entities = JSON.parse(fs.readFileSync(`${packageRoot}/world/entities.json`, "utf8")).entities
const catalog = JSON.parse(fs.readFileSync(`${packageRoot}/assets/models/catalog.json`, "utf8"))
const byName = new Map((Array.isArray(catalog) ? catalog : catalog.models ?? []).map((entry) => [entry.name, entry]))
const metadata = inventory.metadata.filter((entry) => entry.binaryPresent)
const sameBounds = (a, b) => Array.isArray(a) && Array.isArray(b) && a.join(",") === b.join(",")
const result = {
  format: "nea-mesh-bootstrap",
  version: 1,
  source: "backroom-dump-20260819",
  assets: metadata.map(({ requestKey, dataHash, bounds, version }) => ({ requestKey, dataHash, bounds, version })),
  entities: entities.map((entity) => {
    const meshId = Number(entity.source?.meshId ?? entity.meshId)
    const mesh = String(entity.mesh ?? "")
    const modelName = mesh.replace(/^mesh[\\/]/, "").replace(/\.vb$/i, "")
    const catalogEntry = byName.get(modelName)
    const bounds = entity.source?.bounds ?? null
    const candidates = metadata.filter((entry) => sameBounds(entry.bounds, bounds)).slice(0, 8).map((entry) => entry.requestKey)
    return { meshId, mesh, modelName: catalogEntry?.name ?? modelName, bounds, candidates }
  }),
}
fs.mkdirSync(`${packageRoot}/assets/bootstrap`, { recursive: true })
fs.writeFileSync(`${packageRoot}/assets/bootstrap/mesh-bootstrap.json`, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ assets: result.assets.length, entities: result.entities.length, withCandidates: result.entities.filter((entry) => entry.candidates.length > 0).length }))
