import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const localRoot = resolve(import.meta.dirname, "..");
const apiRoot = join(projectRoot, "Evidence/dao3-docs-mirror/markdown/api");
const reportRoot = join(localRoot, "reports");

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

function collect(text, expression, group = 1) {
  return [...text.matchAll(expression)].map((match) => match[group]).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)].sort();
}

const apiFiles = (await walk(apiRoot)).filter((file) => file.endsWith(".md"));
const api = { globals: [], classes: [], methods: [], properties: [], events: [] };
for (const file of apiFiles) {
  const text = await readFile(file, "utf8");
  api.globals.push(...collect(text, /declare const\s+([A-Za-z_$][\w$]*)\s*:/g));
  api.classes.push(...collect(text, /declare class\s+([A-Za-z_$][\w$]*)/g));
  for (const heading of collect(text, /^####\s+(.+)$/gm)) {
    const name = heading.match(/([A-Za-z_$][\w$]*)/)?.[1];
    if (!name) continue;
    if (name.startsWith("on")) api.events.push(name);
    else if (heading.includes("(")) api.methods.push(name);
    else api.properties.push(name);
  }
}
for (const name of Object.keys(api)) api[name] = unique(api[name]);

const protocolPath = process.env.NEA_PROTOCOL_EVIDENCE_PATH
  ? resolve(process.env.NEA_PROTOCOL_EVIDENCE_PATH)
  : join(projectRoot, "Middleware/runtime-compat/evidence/protocol.ts");
const protocolSource = await readFile(protocolPath, "utf8");
const protocols = unique(collect(protocolSource, /export const\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g));
const cache = JSON.parse(await readFile(join(localRoot, "runtime/cache-manifest.json"), "utf8"));
const texts = [];
for (const response of cache.responses) {
  if (!/\.(?:js|json|html|css)$/.test(response.file)) continue;
  texts.push(await readFile(join(localRoot, "runtime", response.file), "utf8"));
}
const combined = texts.join("\n");
const endpoints = unique(collect(combined, /(?:https?|wss?):\\?\/\\?\/[A-Za-z0-9._:-]+[^\s"'`<>)\\]\\}]*/g, 0))
  .filter((value) => /dao3|box3|codemao|createra/.test(value))
  .slice(0, 500);
const bundleGlobals = unique(collect(combined, /(?:window|globalThis)\.([A-Za-z_$][\w$]*)/g));
const messageTypes = unique(collect(combined, /(?:type|event|action)\s*:\s*["']([A-Za-z0-9_.:-]{2,80})["']/g));
const blockers = [
  "The cross-origin view.dao3.fun player bundle is not present as a standalone recovered response.",
  "No complete exported map package or terrain/entity/UI snapshot is present.",
  "No offline room bootstrap replaces code-api-pc.dao3.fun/websocket/server.",
  "The captured WebSocket session is not a deterministic replay fixture.",
];
const report = {
  format: "nea-abi-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  api,
  protocols,
  recoveredRuntime: {
    cachedResponses: cache.responses.length,
    assets: cache.assets.length,
    endpoints,
    bundleGlobals,
    messageTypes,
  },
  blockers,
};

await mkdir(reportRoot, { recursive: true });
await writeFile(join(reportRoot, "abi.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(reportRoot, "abi.md"), `# NEA Compatibility ABI Inventory

## Summary

- API documentation files: ${apiFiles.length}
- Runtime globals: ${api.globals.length}
- Runtime classes: ${api.classes.length}
- Documented methods: ${api.methods.length}
- Documented properties: ${api.properties.length}
- Documented events: ${api.events.length}
- Protocol declarations: ${protocols.length}
- Cached HTTP responses: ${cache.responses.length}
- Recovered binary assets: ${cache.assets.length}

## Runtime Globals

${api.globals.map((value) => `- \`${value}\``).join("\n")}

## Protocol Declarations

${protocols.map((value) => `- \`${value}\``).join("\n")}

## Blocking Gaps

${blockers.map((value) => `- ${value}`).join("\n")}

The machine-readable method, property, endpoint, bundle-global, and message type inventories are stored in \`abi.json\`.
`);
console.log(`Wrote ABI inventory with ${api.methods.length} methods and ${protocols.length} protocols.`);
