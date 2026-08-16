import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const localRoot = resolve(import.meta.dirname, "..");
const cacheRoot = join(projectRoot, "Evidence/dump/private/live-session-profile/Default/Service Worker/CacheStorage");
const runtimeRoot = join(localRoot, "runtime");
const eofMagic = Buffer.from("d8410d97456ffaf4", "hex");

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

function safeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.searchParams.delete("__WB_REVISION__");
  return url.href;
}

function extensionFor(url, body) {
  const extension = extname(new URL(url).pathname);
  if (extension) return extension;
  const head = body.subarray(0, 32).toString("utf8").trimStart();
  if (head.startsWith("<!DOCTYPE") || head.startsWith("<html")) return ".html";
  if (head.startsWith("{") || head.startsWith("[")) return ".json";
  return ".bin";
}

function parseEntry(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "305c72a71b6dfbfc") return null;
  const keyLength = buffer.readUInt32LE(12);
  const bodyStart = 24 + keyLength;
  const bodyEnd = buffer.indexOf(eofMagic, bodyStart);
  if (bodyEnd <= bodyStart) return null;
  return {
    url: buffer.subarray(24, bodyStart).toString("utf8"),
    body: buffer.subarray(bodyStart, bodyEnd),
  };
}

async function extractResponses() {
  const records = [];
  for (const sourcePath of await walk(cacheRoot)) {
    if (!sourcePath.endsWith("_0")) continue;
    const parsed = parseEntry(await readFile(sourcePath));
    if (!parsed) continue;
    const url = new URL(parsed.url);
    const file = join(
      "responses",
      safeSegment(url.hostname),
      `${safeSegment(url.pathname)}-${records.length}${extensionFor(parsed.url, parsed.body)}`,
    );
    const outputPath = join(runtimeRoot, file);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, parsed.body);
    records.push({
      url: parsed.url,
      normalizedUrl: normalizeUrl(parsed.url),
      file: file.replaceAll("\\", "/"),
      bytes: parsed.body.length,
    });
  }
  return records;
}

async function exposeAssets() {
  const groups = [
    ["Evidence/dump/recovered-engine-assets", "assets/engine"],
    ["Evidence/dump/recovered-avatar-assets", "assets/avatar"],
  ];
  const assets = [];
  for (const [sourceName, outputName] of groups) {
    const sourceRoot = join(projectRoot, sourceName);
    const manifest = JSON.parse(await readFile(join(sourceRoot, "manifest.json"), "utf8"));
    for (const entry of manifest.entries) {
      const entryPath = entry.file.replace(/^[^/]+\//, "");
      const outputPath = join(runtimeRoot, outputName, entryPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await copyFile(join(sourceRoot, entry.file), outputPath);
      assets.push({
        kind: entry.kind,
        key: entry.key,
        file: relative(runtimeRoot, outputPath).replaceAll("\\", "/"),
        bytes: entry.bytes,
        sha256: entry.sha256,
      });
    }
  }
  return assets;
}

await mkdir(runtimeRoot, { recursive: true });
const responses = await extractResponses();
const assets = await exposeAssets();
await writeFile(join(runtimeRoot, "cache-manifest.json"), `${JSON.stringify({
  format: "nea-local-player-cache",
  version: 1,
  generatedAt: new Date().toISOString(),
  responses,
  assets,
}, null, 2)}\n`);
console.log(`Extracted ${responses.length} cached responses and ${assets.length} assets.`);
