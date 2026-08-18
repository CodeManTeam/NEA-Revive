import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const [packageArg] = process.argv.slice(2);
if (!packageArg) {
  console.error("Usage: node archive-model-sources.mjs <map-package>");
  process.exit(2);
}

const packageRoot = resolve(packageArg);
const listPath = join(packageRoot, "assets", "mesh", "model-list.json");
const outputRoot = join(packageRoot, "assets", "models");
const sourceRoot = join(outputRoot, "source");
const sourceModels = JSON.parse(await readFile(listPath, "utf8"));
const models = (Array.isArray(sourceModels) ? sourceModels : sourceModels.rows ?? []).map(normalizeModel);

await mkdir(sourceRoot, { recursive: true });

let cursor = 0;
const failures = [];
const workers = Array.from({ length: Math.min(6, models.length) }, async () => {
  while (cursor < models.length) {
    const model = models[cursor++];
    if (!model.projectFileHash) continue;
    try {
      const response = await fetch(`https://assets.box3.fun/engine/m/${encodeURIComponent(model.projectFileHash)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await writeFile(join(sourceRoot, `${model.projectFileHash}.voxa`), Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      failures.push({ modelId: model.modelId, name: model.name, projectFileHash: model.projectFileHash, error: String(error) });
    }
  }
});
await Promise.all(workers);

const catalog = {
  format: "nea-model-catalog/v1",
  source: "dao3-models-v2",
  packageId: basename(packageRoot),
  models,
  failures,
};
await writeFile(join(outputRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ models: models.length, archived: models.filter(model => model.projectFileHash).length - failures.length, failures: failures.length }, null, 2));

function normalizeModel(model) {
  const name = String(model.modelName ?? model.name ?? "");
  const modelFileHash = String(model.modelFileHash ?? model.modelFileUUID ?? model.fileHash ?? "");
  const projectFileHash = String(model.projectFileHash ?? model.projectFileUUID ?? "");
  const previewHash = String(model.modelPreviewHash ?? model.modelPreviewUUID ?? "");
  return {
    modelId: Number(model.modelId),
    name,
    animated: Boolean(model.animated),
    modelFileHash,
    projectFileHash,
    previewHash,
    local: {
      vb: name ? `../mesh/${name}.vb` : null,
      gltf: name ? `../mesh/${name}.gltf` : null,
      voxa: projectFileHash ? `source/${projectFileHash}.voxa` : null,
    },
  };
}
