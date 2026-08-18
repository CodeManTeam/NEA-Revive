import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error("Usage: node build-historical-player-source.mjs <source-package> <output-directory>");
  process.exit(2);
}

const source = resolve(sourceArg);
const output = resolve(outputArg);
const readJson = async relative => JSON.parse(await readFile(join(source, relative), "utf8"));
const manifest = await readJson("nea.map.json");
const terrain = await readJson(manifest.world.terrain);
const entityDocument = await readJson(manifest.world.entities);
const entities = Array.isArray(entityDocument) ? entityDocument : entityDocument.entities;
const points = [manifest.world.spawn, ...entities.map(entity => entity.position)];
for (const box of terrain.boxes ?? []) points.push(box.from, box.to);
for (const voxel of terrain.voxels ?? []) points.push(voxel.position);
const minimum = [0, 1, 2].map(axis => Math.min(...points.map(point => Number(point?.[axis] ?? 0))));
const offset = minimum.map(value => value < 0 ? Math.ceil(-value) + 1 : 0);
const move = point => point.map((value, axis) => Number(value) + offset[axis]);

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

for (const entry of await readdir(join(output, "scripts"), { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const path = join(output, "scripts", entry.name);
  const script = await readFile(path, "utf8");
  await writeFile(path, script.replace(/\.tags\(\)/g, ".tags"), "utf8");
}

manifest.world.spawn = move(manifest.world.spawn);
manifest.world.shape = manifest.world.shape.map((value, axis) => Math.ceil((Number(value) + offset[axis]) / 32) * 32);
manifest.display.name = sanitizeText(manifest.display.name);
manifest.display.description = sanitizeText(manifest.display.description);
delete manifest.ui;
for (const box of terrain.boxes ?? []) {
  box.from = move(box.from);
  box.to = move(box.to);
}
for (const voxel of terrain.voxels ?? []) voxel.position = move(voxel.position);
for (const entity of entities) {
  entity.position = move(entity.position);
  if (Array.isArray(entity.source?.position)) entity.source.position = move(entity.source.position);
}

await writeJson(join(output, "nea.map.json"), manifest);
await writeJson(join(output, manifest.world.terrain), terrain);
await writeJson(join(output, manifest.world.entities), Array.isArray(entityDocument) ? entities : { ...entityDocument, entities });
await writeJson(join(output, "source", "historical-player-adaptation.json"), {
  format: "nea-historical-player-adaptation/v1",
  source,
  offset,
  reason: "Historical Player terrain coordinates and entity validation require a non-negative world domain.",
});
console.log(JSON.stringify({ output, offset, spawn: manifest.world.spawn, shape: manifest.world.shape, entities: entities.length }, null, 2));

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanitizeText(value) {
  return String(value ?? "").replace(/[\x00-\x1f\x7f]+/g, " ").trim() || "Historical Player comparison";
}
