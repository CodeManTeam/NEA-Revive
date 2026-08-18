import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  console.error("Usage: node import-project-export.mjs <project-export> <package-output>");
  process.exit(2);
}

const source = resolve(sourceArg);
const destination = resolve(destinationArg);
const map = JSON.parse(await readFile(join(source, "project", "map.json"), "utf8"));
const project = JSON.parse(await readFile(join(source, "project", "project.json"), "utf8"));
const sparse = JSON.parse(gunzipSync(await readFile(join(source, "build", "voxel-sparse.gz"))));
const shape = sparse.shape.map(Number);
const boxes = sparseToBoxes(sparse, shape);
const codeFiles = (await readdir(join(source, "code"))).filter(name => name.endsWith(".js"));
const codeSources = new Map(await Promise.all(codeFiles.map(async name => [name, await readFile(join(source, "code", name), "utf8")])));
const missingModules = findMissingModules(codeSources);
const clientDependencyNames = findStaticImports(codeSources.get("clientIndex.js") || "");
const entry = String(project.scriptIndex || "index.js");
const packageName = packageId(map.name || basename(source));

await rm(destination, { recursive: true, force: true });
await Promise.all([
  mkdir(join(destination, "world"), { recursive: true }),
  mkdir(join(destination, "scripts"), { recursive: true }),
  mkdir(join(destination, "assets", "mesh"), { recursive: true }),
  mkdir(join(destination, "assets", "audio"), { recursive: true }),
  mkdir(join(destination, "source"), { recursive: true }),
]);

for (const [name, body] of codeSources) await writeFile(join(destination, "scripts", name), body, "utf8");
for (const name of missingModules) {
  const path = join(destination, "scripts", name);
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `// Missing from source export; compatibility placeholder.\n` +
    `globalThis.FindBlockName ??= () => ({ Function() {} });\n` +
    `globalThis.FindItemName ??= () => ({ Function() {} });\n` +
    `module.exports = {};\n`, "utf8");
}
await copyContents(join(source, "models"), join(destination, "assets", "mesh"));
await copyContents(join(source, "audio"), join(destination, "assets", "audio"));

const assets = [
  ...(await collectAssets(join(destination, "assets", "mesh"), "mesh")),
  ...(await collectAssets(join(destination, "assets", "audio"), "audio")),
];
const spawn = [Math.min(64, shape[0] / 2), Math.min(40, shape[1] - 2), Math.min(64, shape[2] / 2)];

await Promise.all([
  writeJson("nea.map.json", {
    formatVersion: "nea-map/v1",
    id: packageName,
    display: { name: map.name || packageName, description: "Imported DAO3 project export" },
    runtime: { apiVersion: "0.1.0", tickRate: 20, clientContract: "dao3-client-runtime/v1", serverContract: "nea-server-runtime/v1", compatibilityLevel: "experimental" },
    world: { shape, spawn, entityLimit: 4000, terrain: "world/terrain.json", entities: "world/entities.json", environment: null, physics: "world/physics.json" },
    assets,
    scripts: {
      server: `scripts/${entry}`,
      client: codeSources.has("clientIndex.js") ? "scripts/clientIndex.js" : null,
      serverModules: [...codeSources.keys(), ...missingModules].filter(name => name !== "clientIndex.js").map(name => `scripts/${name}`),
      clientModules: codeSources.has("clientIndex.js")
        ? ["clientIndex.js", ...clientDependencyNames].map(name => `scripts/${name}`)
        : [],
      serverCapabilities: ["server.world.events", "server.world.chat", "server.world.entities", "server.world.voxels", "server.world.config", "server.gui", "server.storage", "server.player", "server.player.write", "server.remote-channel", "server.http"],
      clientCapabilities: ["client.core", "client.ui", "client.remote-channel"],
    },
  }),
  writeJson("world/terrain.json", { formatVersion: "nea-terrain/v1", boxes, voxels: [] }),
  writeJson("world/entities.json", { entities: [] }),
  writeJson("world/physics.json", {
    formatVersion: "nea-physics/v1", gravity: -0.1, airFriction: 0, maxFallSpeed: 50, stepHeight: 1.25,
    playerBody: { profileId: "historical-player-default-v1", origin: "body-center", originStatus: "derived", sizeStatus: "confirmed", boundsHalfExtents: [0.45, 1.1, 0.45], shapeHalfExtents: [0.45, 1.1, 0.45], evidence: "DAO3 project export defaults" },
    materials: {}, colliders: [], triggers: [],
  }),
  writeJson("source/import.json", { format: "dao3-project-export/v1", source, importedAt: new Date().toISOString(), projectHash: map.projectHash, shape, spawn, terrainBoxes: boxes.length, terrainCells: sparse.indices.length, scripts: codeFiles, missingModules, assets: assets.length }),
]);

console.log(JSON.stringify({ destination, id: packageName, shape, spawn, boxes: boxes.length, cells: sparse.indices.length, scripts: codeFiles, missingModules, assets: assets.length }, null, 2));

async function writeJson(path, value) {
  const target = join(destination, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, JSON.stringify(value, null, 2), "utf8");
}

async function copyContents(from, to) {
  try { await cp(from, to, { recursive: true }); } catch (error) { if (error?.code !== "ENOENT") throw error; }
}

async function collectAssets(root, kind) {
  const result = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        const local = relative(root, absolute).replaceAll("\\", "/");
        result.push({ name: `${kind}/${local}`, path: `assets/${kind}/${local}`, kind });
      }
    }
  }
  await visit(root);
  return result;
}

function findMissingModules(sources) {
  const found = new Set();
  for (const body of sources.values()) {
    for (const match of body.matchAll(/require\s*\(\s*["'](.+?)["']\s*\)/g)) {
      if (!match[1].startsWith(".")) continue;
      let name = match[1].replace(/^\.\//, "");
      if (!name.endsWith(".js")) name += ".js";
      if (!sources.has(name)) found.add(name);
    }
    for (const name of findStaticImports(body)) if (!sources.has(name)) found.add(name);
  }
  return [...found].sort();
}

function findStaticImports(body) {
  const found = new Set();
  for (const match of body.matchAll(/import\s+["'](.+?)["']\s*;?/g)) {
    if (!match[1].startsWith(".")) continue;
    let name = match[1].replace(/^\.\//, "");
    if (!name.endsWith(".js")) name += ".js";
    found.add(name);
  }
  return [...found];
}

function sparseToBoxes(value, shape) {
  const stride = value.stride ?? [1, shape[0], shape[0] * shape[1]];
  const grid = new Uint16Array(shape[0] * shape[1] * shape[2]);
  for (let index = 0; index < value.indices.length; index += 1) grid[value.indices[index]] = value.data[index] & 0x0fff;
  const at = (x, y, z) => x * stride[0] + y * stride[1] + z * stride[2];
  const boxes = [];
  for (let z = 0; z < shape[2]; z++) for (let y = 0; y < shape[1]; y++) for (let x = 0; x < shape[0]; x++) {
    const blockId = grid[at(x, y, z)];
    if (!blockId) continue;
    let x2 = x + 1;
    while (x2 < shape[0] && grid[at(x2, y, z)] === blockId) x2++;
    let y2 = y + 1;
    yLoop: while (y2 < shape[1]) { for (let xx = x; xx < x2; xx++) if (grid[at(xx, y2, z)] !== blockId) break yLoop; y2++; }
    let z2 = z + 1;
    zLoop: while (z2 < shape[2]) { for (let yy = y; yy < y2; yy++) for (let xx = x; xx < x2; xx++) if (grid[at(xx, yy, z2)] !== blockId) break zLoop; z2++; }
    for (let zz = z; zz < z2; zz++) for (let yy = y; yy < y2; yy++) for (let xx = x; xx < x2; xx++) grid[at(xx, yy, zz)] = 0;
    boxes.push({ from: [x, y, z], to: [x2, y2, z2], blockId });
  }
  return boxes;
}

function packageId(value) {
  return String(value).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "imported-map";
}
