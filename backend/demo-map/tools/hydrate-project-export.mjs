import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) {
  console.error("Usage: node hydrate-project-export.mjs <project-export> <hydrated-output>");
  process.exit(2);
}

const source = resolve(sourceArg);
const destination = resolve(destinationArg);
const project = JSON.parse(await readFile(join(source, "project", "project.json"), "utf8"));
const map = JSON.parse(await readFile(join(source, "project", "map.json"), "utf8"));
const blockBase = "https://static.box3.codemao.cn/block/";
const assetBase = "https://assets.box3.fun/engine/";

await rm(destination, { recursive: true, force: true });
await Promise.all([
  mkdir(join(destination, "scripts"), { recursive: true }),
  mkdir(join(destination, "mesh"), { recursive: true }),
  mkdir(join(destination, "audio"), { recursive: true }),
  mkdir(join(destination, "images"), { recursive: true }),
]);

const fields = ["entitiesTree", "environment", "physics", "pictureAssets", "player", "scriptAssets", "uiTree", "voxels", "info"];
const resolved = {};
for (const field of fields) {
  const value = project[field];
  if (value === undefined) continue;
  resolved[field] = typeof value === "string" ? await fetchJson(blockBase + value) : value;
  await writeFile(join(destination, `${field}.json`), JSON.stringify(resolved[field], null, 2), "utf8");
}

await Promise.all([
  writeFile(join(destination, "defaultScreenId.json"), JSON.stringify(project.defaultScreenId ?? null, null, 2), "utf8"),
  writeFile(join(destination, "scriptIndex.json"), JSON.stringify(project.scriptIndex ?? "index.js", null, 2), "utf8"),
  writeFile(join(destination, "zones.json"), JSON.stringify(await resolveOptional(project.zones, {}), null, 2), "utf8"),
  writeFile(join(destination, "gamepad.json"), JSON.stringify(await resolveOptional(project.gamepad, {}), null, 2), "utf8"),
  writeFile(join(destination, "map.json"), JSON.stringify(map, null, 2), "utf8"),
  cp(join(source, "build", "voxel-sparse.gz"), join(destination, "voxel-sparse.gz")),
  copyOptional(join(source, "models"), join(destination, "mesh")),
  copyOptional(join(source, "audio"), join(destination, "audio")),
  copyOptional(join(source, "images"), join(destination, "images")),
]);

const scriptAssets = resolved.scriptAssets ?? {};
const failures = [];
for (const [name, descriptor] of Object.entries(scriptAssets)) {
  const hash = String(descriptor?.hash ?? "");
  if (!hash) { failures.push({ name, reason: "missing hash" }); continue; }
  const isQm = /^Qm[1-9A-HJ-NP-Za-km-z]{20,}$/.test(hash);
  const url = isQm ? blockBase + hash : assetBase + "s/" + encodeURIComponent(hash);
  try {
    const bytes = await fetchBytes(url);
    const target = join(destination, "scripts", name);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, bytes);
  } catch (error) {
    failures.push({ name, hash, reason: String(error) });
  }
}

await writeFile(join(destination, "hydration.json"), JSON.stringify({
  format: "dao3-hydrated-project-export/v1",
  source,
  map,
  projectHash: map.projectHash,
  fields: Object.keys(resolved),
  scripts: Object.keys(scriptAssets),
  failures,
}, null, 2), "utf8");

console.log(JSON.stringify({ destination, fields: Object.keys(resolved), scripts: Object.keys(scriptAssets).length, failures }, null, 2));
if (failures.length) process.exitCode = 1;

async function resolveOptional(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return typeof value === "string" ? fetchJson(blockBase + value) : value;
}

async function fetchJson(url) {
  return JSON.parse((await fetchBytes(url)).toString("utf8"));
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function copyOptional(from, to) {
  try {
    const entries = await readdir(from);
    if (entries.length) await cp(from, to, { recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
