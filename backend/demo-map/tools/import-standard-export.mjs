import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  console.error("Usage: node import-standard-export.mjs <standard-export> <package-output>");
  process.exit(2);
}

const source = resolve(sourceArg);
const destination = resolve(destinationArg);
const readJson = async name => JSON.parse(await readFile(join(source, name), "utf8"));

const [info, voxelDescriptor, entityTree, physics, player, environment, uiTree, defaultScreenId, pictureAssets] = await Promise.all([
  readJson("info.json"),
  readJson("voxels.json"),
  readJson("entitiesTree.json"),
  readJson("physics.json"),
  readJson("player.json"),
  readJson("environment.json"),
  readJson("uiTree.json"),
  readJson("defaultScreenId.json"),
  readJson("pictureAssets.json"),
]);

const sparse = JSON.parse(gunzipSync(await readFile(join(source, "voxel-sparse.gz"))).toString("utf8"));
const shape = normalizeShape(sparse.shape ?? voxelDescriptor.shape);
const boxes = sparseToBoxes(sparse, shape);
const entities = convertEntities(entityTree, shape);
const spawn = normalizePosition(player.initialPosition, [shape[0] / 2, 2, shape[2] / 2]);
const worldShape = expandedWorldShape(shape, spawn, entities);
const scriptAssets = await readJson("scriptAssets.json");
const scriptNames = Object.keys(scriptAssets);
const missingScripts = [];
for (const name of scriptNames) {
  try { await access(join(source, "scripts", name)); } catch { missingScripts.push(name); }
}
const recoveredScripts = new Map();
if (missingScripts.length === 1) {
  const candidate = await readFile(join(source, "other", "scriptAssets.bin"));
  const name = missingScripts[0];
  if (candidate.length === Number(scriptAssets[name]?.size)) recoveredScripts.set(name, candidate);
}
const unavailableScripts = missingScripts.filter(name => !recoveredScripts.has(name));
if (unavailableScripts.length) throw new Error(`Standard export is missing script bodies: ${unavailableScripts.join(", ")}`);
const serverModules = scriptNames.filter(name => name.endsWith(".js") && name !== "clientIndex.js");
const clientModules = scriptNames.filter(name => name === "clientIndex.js");
const entry = String(await readJson("scriptIndex.json"));
const assets = [
  ...(await collectAssets("mesh", "mesh")),
  ...(await collectAssets("audio", "audio")),
];
const modelCatalog = await readOptionalJson(join(source, "mesh", "model-list.json"));

await rm(destination, { recursive: true, force: true });
await Promise.all([
  mkdir(join(destination, "world"), { recursive: true }),
  mkdir(join(destination, "scripts"), { recursive: true }),
  mkdir(join(destination, "source"), { recursive: true }),
  mkdir(join(destination, "assets"), { recursive: true }),
  mkdir(join(destination, "assets", "models"), { recursive: true }),
]);

for (const directory of ["mesh", "audio"]) {
  try {
    await cp(join(source, directory), join(destination, "assets", directory), { recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

for (const name of scriptNames) {
  const recovered = recoveredScripts.get(name);
  if (recovered) await writeFile(join(destination, "scripts", name), recovered);
  else await cp(join(source, "scripts", name), join(destination, "scripts", name));
}

await Promise.all([
  writeJson("nea.map.json", {
    formatVersion: "nea-map/v1",
    id: packageId(info.displayName ?? basename(source)),
    display: {
      name: info.displayName ?? basename(source),
      description: info.description || "Imported DAO3 standard project export",
    },
    runtime: {
      apiVersion: "0.1.0",
      tickRate: 20,
      clientContract: "dao3-client-runtime/v1",
      serverContract: "nea-server-runtime/v1",
      compatibilityLevel: "experimental",
    },
    world: {
      shape: worldShape,
      spawn,
      entityLimit: Math.max(4000, entities.length + 512),
      terrain: "world/terrain.json",
      entities: "world/entities.json",
      environment: null,
      physics: "world/physics.json",
    },
    assets,
    ui: "source/ui.json",
    scripts: {
      server: `scripts/${entry}`,
      client: clientModules.length ? "scripts/clientIndex.js" : null,
      serverModules: serverModules.map(name => `scripts/${name}`),
      clientModules: clientModules.map(name => `scripts/${name}`),
      serverCapabilities: [
        "server.world.events", "server.world.chat", "server.world.entities", "server.world.voxels",
        "server.world.config", "server.gui", "server.storage", "server.player", "server.player.write",
        "server.remote-channel", "server.http",
      ],
      clientCapabilities: ["client.core", "client.ui", "client.remote-channel"],
    },
  }),
  writeJson("world/terrain.json", { formatVersion: "nea-terrain/v1", boxes, voxels: [] }),
  writeJson("world/entities.json", { entities }),
  writeJson("world/physics.json", {
    formatVersion: "nea-physics/v1",
    gravity: Number(physics.gravity ?? -0.1),
    airFriction: Number(physics.velocityDamping ?? 0),
    maxFallSpeed: 50,
    stepHeight: 1.25,
    playerBody: {
      profileId: "historical-player-default-v1",
      origin: "body-center",
      originStatus: "confirmed",
      sizeStatus: "confirmed",
      boundsHalfExtents: [0.45, 1.1, 0.45],
      shapeHalfExtents: [0.45, 1.1, 0.45],
      evidence: "DAO3 standard export player body defaults",
    },
    materials: {}, colliders: [], triggers: [],
  }),
  writeJson("source/environment.json", environment),
  writeJson("source/player.json", player),
  writeJson("source/ui.json", {
    format: "nea-recovered-client-ui",
    version: 1,
    sourceMessage: "gameUI.reset",
    running: true,
    defaultScreenId,
    uiTree,
    pictureAssets,
  }),
  writeJson("source/import.json", {
    format: "dao3-standard-export/v1",
    source,
    importedAt: new Date().toISOString(),
    terrainBoxes: boxes.length,
    entities: entities.length,
    serverModules: serverModules.length,
    clientModules: clientModules.length,
    recoveredScripts: [...recoveredScripts.keys()],
    assets: assets.length,
  }),
  ...(modelCatalog ? [writeJson("assets/models/catalog.json", normalizeModelCatalog(modelCatalog))] : []),
]);

console.log(JSON.stringify({ destination, shape: worldShape, voxelShape: shape, spawn, boxes: boxes.length, entities: entities.length, serverModules, clientModules, recoveredScripts: [...recoveredScripts.keys()] }, null, 2));

async function writeJson(relativePath, value) {
  const path = join(destination, relativePath);
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function readOptionalJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeModelCatalog(value) {
  const models = Array.isArray(value) ? value : value?.rows ?? [];
  return {
    format: "nea-model-catalog/v1",
    source: "dao3-models-v2",
    models: models.map(model => ({
      modelId: Number(model.modelId),
      name: String(model.modelName ?? ""),
      animated: Boolean(model.animated),
      modelFileHash: String(model.modelFileHash ?? model.modelFileUUID ?? model.fileHash ?? ""),
      projectFileHash: String(model.projectFileHash ?? model.projectFileUUID ?? ""),
      previewHash: String(model.modelPreviewHash ?? model.modelPreviewUUID ?? ""),
      local: {
        vb: model.modelName ? `../mesh/${model.modelName}.vb` : null,
        gltf: model.modelName ? `../mesh/${model.modelName}.gltf` : null,
        voxa: model.projectFileHash || model.projectFileUUID
          ? `source/${model.projectFileHash ?? model.projectFileUUID}.voxa`
          : null,
      },
    })),
  };
}

async function collectAssets(directory, kind) {
  const root = join(source, directory);
  const files = [];
  async function visit(path) {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const local = relative(root, absolute).replaceAll("\\", "/");
        files.push({ name: `${directory}/${local}`, path: `assets/${directory}/${local}`, kind });
      }
    }
  }
  await visit(root);
  return files;
}

function sparseToBoxes(value, shape) {
  const stride = value.stride ?? [1, shape[0], shape[0] * shape[1]];
  const grid = new Uint16Array(shape[0] * shape[1] * shape[2]);
  for (let i = 0; i < value.indices.length; i += 1) grid[value.indices[i]] = value.data[i];
  const at = (x, y, z) => x * stride[0] + y * stride[1] + z * stride[2];
  const boxes = [];
  for (let z = 0; z < shape[2]; z += 1) for (let y = 0; y < shape[1]; y += 1) for (let x = 0; x < shape[0]; x += 1) {
    const blockId = grid[at(x, y, z)];
    if (!blockId) continue;
    let x2 = x + 1;
    while (x2 < shape[0] && grid[at(x2, y, z)] === blockId) x2 += 1;
    let y2 = y + 1;
    yLoop: while (y2 < shape[1]) {
      for (let xx = x; xx < x2; xx += 1) if (grid[at(xx, y2, z)] !== blockId) break yLoop;
      y2 += 1;
    }
    let z2 = z + 1;
    zLoop: while (z2 < shape[2]) {
      for (let yy = y; yy < y2; yy += 1) for (let xx = x; xx < x2; xx += 1) if (grid[at(xx, yy, z2)] !== blockId) break zLoop;
      z2 += 1;
    }
    for (let zz = z; zz < z2; zz += 1) for (let yy = y; yy < y2; yy += 1) for (let xx = x; xx < x2; xx += 1) grid[at(xx, yy, zz)] = 0;
    boxes.push({ from: [x, y, z], to: [x2, y2, z2], blockId: blockId & 0x0fff });
  }
  return boxes;
}

function convertEntities(tree) {
  const used = new Set();
  const result = [];
  for (const node of Object.values(tree)) {
    if (node?.type !== 1 || !node.value) continue;
    const position = normalizePosition(node.value.position, null);
    if (!position) continue;
    const base = String(node.value.name ?? node.name ?? `entity-${node.id}`);
    let id = base;
    if (used.has(id)) id = `${base}-${node.id}`;
    used.add(id);
    result.push({
      id,
      kind: "prop",
      position,
      tags: [...new Set([...(Array.isArray(node.value.tags) ? node.value.tags : []), `source-node-${node.id}`])],
      mesh: typeof node.value.mesh === "string" && node.value.mesh ? node.value.mesh : null,
      source: node.value,
    });
  }
  return result;
}

function normalizeShape(value) {
  const shape = Array.isArray(value) ? value : [value.x, value.y, value.z];
  if (shape.length !== 3 || shape.some(item => !Number.isInteger(item) || item <= 0)) throw new Error("Invalid voxel shape");
  return shape;
}

function expandedWorldShape(voxelShape, spawn, entities) {
  const high = voxelShape.map(Number);
  for (const position of [spawn, ...entities.map(entity => entity.position)]) {
    for (let axis = 0; axis < 3; axis += 1) high[axis] = Math.max(high[axis], Math.ceil(position[axis] + 2));
  }
  return high.map(axis => Math.max(32, Math.ceil(axis / 32) * 32));
}

function normalizePosition(value, fallback) {
  const position = Array.isArray(value) ? value : value && [value.x, value.y, value.z];
  if (!position || position.length !== 3 || position.some(Number.isNaN)) return fallback;
  const normalized = position.map(Number);
  return normalized.some(item => !Number.isFinite(item)) ? fallback : normalized;
}

function packageId(value) {
  const normalized = String(value).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return normalized || "imported-map";
}
