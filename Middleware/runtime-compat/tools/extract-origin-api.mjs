import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const apiRoot = resolve(repositoryRoot, "Evidence", "origin", "origin", "origin", "api");
const shellPath = resolve(repositoryRoot, "Evidence", "origin", "origin", "origin", "shell", "ScriptShell.js");
const outputPath = resolve(root, "generated", "origin-server-api.json");
const files = (await readdir(apiRoot)).filter(name => name.endsWith(".js")).sort();
const entries = [];

for (const filename of files) {
  const path = resolve(apiRoot, filename);
  const source = await readFile(path, "utf8");
  const className = source.match(/\bclass\s+([A-Za-z_$][\w$]*)/)?.[1] ?? basename(filename, ".js");
  const evidencePath = relative(repositoryRoot, path).split(sep).join("/");
  const constructor = source.match(/\bconstructor\s*\(([^)]*)\)/);
  const constructorParameters = new Set(splitParameters(constructor?.[1] ?? ""));
  const seen = new Set();

  for (const match of source.matchAll(/^\s{4}(static\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm)) {
    const name = match[2];
    if (name === "constructor") continue;
    addEntry({
      id: `server.${className}.${name}`,
      side: "server",
      kind: eventKind(name),
      owner: className,
      name,
      signature: { parameters: unknownParameters(match[3]), returns: "unknown", static: Boolean(match[1]) },
      availability: "confirmed",
      compatibility: "missing",
      capability: null,
      since: null,
      notes: ["Recovered from the local origin implementation; behavior still requires conformance fixtures."],
      evidence: [{ type: "origin-source", path: evidencePath, symbol: `${className}.${name}`, confidence: "direct" }],
    });
  }

  for (const match of source.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g)) {
    const name = match[1];
    const initializer = match[2].trim();
    const isInjectedFunction = constructorParameters.has(initializer);
    const isFunction = isInjectedFunction || /^\(?[^=]*\)?\s*=>/.test(initializer);
    addEntry({
      id: `server.${className}.${name}`,
      side: "server",
      kind: isFunction ? eventKind(name) : "property",
      owner: className,
      name,
      signature: isFunction
        ? { parameters: [], returns: "unknown", representation: "function-valued property" }
        : { type: inferInitializerType(initializer), readonly: false },
      availability: "confirmed",
      compatibility: "missing",
      capability: null,
      since: null,
      notes: ["Recovered from an origin class instance assignment."],
      evidence: [{ type: "origin-source", path: evidencePath, symbol: `${className}.${name}`, confidence: "direct" }],
    });
  }

  function addEntry(entry) {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    entries.push(entry);
  }
}

const shellSource = await readFile(shellPath, "utf8");
const apiObject = shellSource.match(/this\.api\s*=\s*createScriptAPI\s*\(\s*\{([\s\S]*?)\}\s*\);/)?.[1] ?? "";
for (const match of apiObject.matchAll(/^\s{12}([A-Za-z_$][\w$]*)\s*:/gm)) {
  const name = match[1];
  entries.push({
    id: `server.global.${name}`,
    side: "server",
    kind: "global",
    owner: "global",
    name,
    signature: { type: "unknown" },
    availability: "confirmed",
    compatibility: "missing",
    capability: null,
    since: null,
    notes: ["Passed into createScriptAPI by the historical ScriptShell."],
    evidence: [{ type: "origin-source", path: relative(repositoryRoot, shellPath).split(sep).join("/"), symbol: `createScriptAPI.${name}`, confidence: "direct" }],
  });
}

entries.sort((left, right) => left.id.localeCompare(right.id));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  format: "nea-runtime-abi",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "origin/origin/origin",
  classCount: files.length,
  entries,
}, null, 2)}\n`);
console.log(`Extracted ${entries.length} confirmed server ABI symbols from ${files.length} origin API classes.`);

function splitParameters(source) {
  return source.split(",").map(value => value.trim()).filter(Boolean);
}

function unknownParameters(source) {
  return splitParameters(source).map((value, index) => ({ name: value.match(/^[A-Za-z_$][\w$]*/)?.[0] ?? `arg${index}`, type: "unknown" }));
}

function eventKind(name) {
  return /^(on|next)[A-Z_]/.test(name) ? "event" : "method";
}

function inferInitializerType(initializer) {
  if (/^(true|false)$/.test(initializer)) return "boolean";
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:\s*\/\s*\d+)?$/.test(initializer)) return "number";
  if (/^['"`]/.test(initializer)) return "string";
  if (/^\[/.test(initializer)) return "array";
  if (/^new\s+([A-Za-z_$][\w$]*)/.test(initializer)) return initializer.match(/^new\s+([A-Za-z_$][\w$]*)/)[1];
  if (/^null$/.test(initializer)) return "null";
  return "unknown";
}
