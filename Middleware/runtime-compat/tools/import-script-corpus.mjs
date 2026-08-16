import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const worksRoot = resolve(repositoryRoot, "Evidence", "works", "private");
const directories = (await readdir(worksRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
const samples = [];

for (const directory of directories) {
  const sampleRoot = resolve(worksRoot, directory.name, "manual-cdp");
  let usage;
  try {
    usage = JSON.parse(await readFile(resolve(sampleRoot, "analysis", "script-abi-usage.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  const serverAssignments = await scanMemberAssignments(resolve(sampleRoot, "source", "server"));
  samples.push({
    sample: `sample-${String(samples.length + 1).padStart(3, "0")}`,
    counts: structuredClone(usage.counts),
    sides: Object.fromEntries(["client", "server"].map(side => [side, {
      api: usage.sides[side].api.map(item => ({ name: item.name, count: item.count })),
      memberAssignments: side === "server" ? serverAssignments : [],
      remote: summarizeRemote(usage.sides[side].remote),
    }])),
  });
}

if (samples.length === 0) throw new Error("No analyzed private script corpus samples were found");
const evidence = {
  format: "nea-redacted-script-corpus-usage",
  version: 2,
  generatedAt: new Date().toISOString(),
  privacy: { sourceCodeIncluded: false, sourcePathsIncluded: false, memberAssignmentPathsIncluded: false, eventTypeNamesIncluded: false },
  samples,
};
const output = resolve(root, "evidence", "script-corpus-usage.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Imported ${samples.length} anonymous script corpus samples.`);

async function scanMemberAssignments(sourceRoot) {
  let files;
  try { files = await listJavaScriptFiles(sourceRoot); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const counts = new Map();
  const pattern = /\b(world|gui|storage|voxels|remoteChannel)\.([A-Za-z_$][\w$]*)\s*(\+\+|--|[+\-*/%]?=(?!=))/g;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      const name = `${match[1]}.${match[2]}`;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

async function listJavaScriptFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listJavaScriptFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".js")) result.push(path);
  }
  return result;
}

function summarizeRemote(remote) {
  return Object.fromEntries(Object.entries(remote).map(([name, value]) => [name, {
    entries: Array.isArray(value) ? value.length : 0,
    occurrences: Array.isArray(value) ? value.reduce((sum, item) => sum + Number(item.count ?? 0), 0) : 0,
  }]));
}
