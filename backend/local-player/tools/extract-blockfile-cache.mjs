import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const localRoot = resolve(import.meta.dirname, "..");
const cacheRoot = join(projectRoot, "Evidence/dump/private/live-session-profile/Default/Cache/Cache_Data");
const outputRoot = join(localRoot, "runtime/http-cache");
const indexHeaderSize = 368;
const blockHeaderSize = 8192;
const blockSizes = new Map([[1, 36], [2, 256], [3, 1024], [4, 4096], [5, 8], [6, 104], [7, 48]]);
const fileCache = new Map();

async function cachedRead(path) {
  if (!fileCache.has(path)) fileCache.set(path, await readFile(path));
  return fileCache.get(path);
}

function decodeAddress(value) {
  if ((value & 0x80000000) === 0) return null;
  const type = (value >>> 28) & 7;
  if (type === 0) return { type, external: value & 0x0fffffff };
  return {
    type,
    blocks: ((value >>> 24) & 3) + 1,
    file: (value >>> 16) & 0xff,
    start: value & 0xffff,
  };
}

async function readAddress(value, requestedSize) {
  const address = decodeAddress(value);
  if (!address) return Buffer.alloc(0);
  if (address.type === 0) {
    const file = join(cacheRoot, `f_${address.external.toString(16).padStart(6, "0")}`);
    const body = await cachedRead(file);
    return requestedSize == null ? body : body.subarray(0, requestedSize);
  }
  const blockSize = blockSizes.get(address.type);
  if (!blockSize) throw new Error(`Unsupported cache address type ${address.type}`);
  const file = join(cacheRoot, `data_${address.file}`);
  const body = await cachedRead(file);
  const start = blockHeaderSize + address.start * blockSize;
  const available = address.blocks * blockSize;
  const size = requestedSize == null ? available : Math.min(requestedSize, available);
  return body.subarray(start, start + size);
}

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/[. ]+$/g, "_").slice(0, 180);
}

function extensionFor(body) {
  const hex = body.subarray(0, 16).toString("hex");
  const text = body.subarray(0, 100).toString("utf8").trimStart();
  if (hex.startsWith("1f8b08")) return ".gz";
  if (hex.startsWith("89504e47")) return ".png";
  if (hex.startsWith("ffd8ff")) return ".jpg";
  if (hex.startsWith("52494646") && body.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
  if (hex.startsWith("0061736d")) return ".wasm";
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) return ".html";
  if (text.startsWith("{") || text.startsWith("[")) return ".json";
  if (/^(?:\(?function|(?:self|window|globalThis)\.|["']use strict|var |const |let )/.test(text)) return ".js";
  return ".bin";
}

async function parseEntry(addressValue) {
  const raw = await readAddress(addressValue);
  if (raw.length < 256) throw new Error(`Short EntryStore at ${addressValue.toString(16)}`);
  const keyLength = raw.readInt32LE(32);
  const state = raw.readInt32LE(20);
  const next = raw.readUInt32LE(4);
  const longKey = raw.readUInt32LE(36);
  let key;
  if (keyLength <= raw.length - 92) key = raw.subarray(92, 92 + keyLength).toString("utf8");
  else key = (await readAddress(longKey, keyLength)).toString("utf8");
  const streams = [];
  for (let index = 0; index < 4; index += 1) {
    const size = raw.readInt32LE(40 + index * 4);
    const streamAddress = raw.readUInt32LE(56 + index * 4);
    if (size > 0 && streamAddress) streams.push({ index, size, address: streamAddress });
  }
  return { address: addressValue, next, state, key, keyLength, streams };
}

function requestUrlForKey(key) {
  const matches = key.match(/https?:\/\/[^\s]+/g);
  return matches?.at(-1) ?? null;
}

const index = await readFile(join(cacheRoot, "index"));
if (index.readUInt32LE(0) !== 0xc103cac3) throw new Error("Unexpected Chromium cache index magic");
const version = index.readUInt32LE(4);
const expectedEntries = index.readInt32LE(8);
const tableLength = index.readInt32LE(28) || 0x10000;
const visited = new Set();
const entries = [];

for (let bucket = 0; bucket < tableLength; bucket += 1) {
  let address = index.readUInt32LE(indexHeaderSize + bucket * 4);
  let depth = 0;
  while (address && !visited.has(address) && depth < 1000) {
    visited.add(address);
    const entry = await parseEntry(address);
    const url = requestUrlForKey(entry.key);
    if (entry.state === 0 && url) entries.push({ ...entry, url });
    address = entry.next;
    depth += 1;
  }
}

const records = [];
for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
  const entry = entries[entryIndex];
  let host = "unknown";
  let pathname = entry.url;
  try {
    const url = new URL(entry.url);
    host = url.hostname;
    pathname = url.pathname;
  } catch {}
  const streamRecords = [];
  for (const stream of entry.streams) {
    const body = await readAddress(stream.address, stream.size);
    const file = join(safeName(host), `${entryIndex}-${safeName(pathname)}-stream${stream.index}${extensionFor(body)}`);
    const outputPath = join(outputRoot, file);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, body);
    streamRecords.push({ ...stream, file: file.replaceAll("\\", "/"), bytes: body.length });
  }
  records.push({ url: entry.url, cacheKey: entry.key, address: entry.address, keyLength: entry.keyLength, streams: streamRecords });
}

await mkdir(outputRoot, { recursive: true });
await writeFile(join(localRoot, "runtime/http-cache-manifest.json"), `${JSON.stringify({
  format: "chromium-blockfile-cache",
  version,
  expectedEntries,
  parsedEntries: records.length,
  records,
}, null, 2)}\n`);

const interesting = records.filter((record) => /view\.|box3|\.wasm|\.worker|engine|websocket/i.test(record.url));
console.log(JSON.stringify({ version, expectedEntries, parsedEntries: records.length, interesting: interesting.slice(0, 120) }, null, 2));
