import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const profileRoot = resolve(repositoryRoot, "local-player/.profile/Default");
const cacheRoot = join(profileRoot, "Service Worker/CacheStorage");
const eofMagic = Buffer.from("d8410d97456ffaf4", "hex");
const simpleEntryMagic = "305c72a71b6dfbfc";
const safeKeywords = ["PUBLIC", "syncClientScriptModules", "rx", "ry", "rz", "hsx", "hsy", "hsz", "crouch", "fly"];

const allCacheFiles = await walk(cacheRoot);
const cacheFiles = allCacheFiles.filter(path => /^[0-9a-f]+_[01]$/u.test(basename(path)));
const ignoredTemporaryFiles = allCacheFiles.filter(path => /^todelete_/u.test(basename(path)));
const cacheEntries = [];
for (const path of cacheFiles) {
  const bytes = await readFile(path);
  const parsed = parseSimpleEntry(bytes);
  if (!parsed) continue;
  const streamIndex = Number(basename(path).at(-1));
  const pathname = safeStaticPath(parsed.key);
  const route = safeRoute(parsed.key);
  const printableRatio = ratio(parsed.body, byte => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126));
  cacheEntries.push({
    file: relative(profileRoot, path).replaceAll("\\", "/"),
    streamIndex,
    bytes: bytes.length,
    bodyBytes: parsed.body.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bodySha256: createHash("sha256").update(parsed.body).digest("hex"),
    pathname,
    routeFamily: route.family,
    queryNames: route.queryNames,
    resourceKind: classifyResource(pathname, parsed.body, printableRatio, streamIndex),
    responseKind: classifyResponse(parsed.body, printableRatio),
    printableRatio: Number(printableRatio.toFixed(6)),
    keywordCounts: countKeywords(parsed.body),
    binaryHeader: streamIndex === 1 ? parsed.body.subarray(0, 16).toString("hex") : undefined,
  });
}

const stores = [];
for (const name of ["Session Storage", "Sessions", "Local Storage/leveldb"]) {
  const directory = join(profileRoot, name);
  const files = await walk(directory, true);
  let bytes = 0;
  const keywordCounts = Object.fromEntries(safeKeywords.map(keyword => [keyword, 0]));
  for (const path of files) {
    const body = await readFile(path);
    bytes += body.length;
    addCounts(keywordCounts, countKeywords(body));
  }
  stores.push({ name, files: files.length, bytes, keywordCounts });
}

const staticResponses = cacheEntries.filter(entry => entry.streamIndex === 0 && entry.resourceKind === "static-javascript-response");
const binaryCompanions = cacheEntries.filter(entry => entry.streamIndex === 1 && entry.resourceKind === "static-javascript-binary-companion");
const routeFamilies = aggregateRoutes(cacheEntries);
const report = {
  format: "nea-player-profile-network-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  source: {
    path: "local-player/.profile/Default",
    policy: "Only non-secret store metadata, static resource paths, hashes, byte counts and fixed protocol keyword counts are emitted.",
    excluded: ["Cookies", "Login Data", "Web Data", "History", "dump/private/live-session.json"],
  },
  serviceWorkerCache: {
    parsedEntries: cacheEntries.length,
    ignoredTemporaryFiles: ignoredTemporaryFiles.length,
    staticJavascriptResponses: staticResponses.length,
    staticJavascriptBinaryCompanions: binaryCompanions.length,
    routeFamilies,
    entries: cacheEntries,
  },
  browserStores: stores,
  publicFrameEvidence: {
    status: "not-found",
    serverToClientBinaryFrames: 0,
    finding: "The inspected profile stores contain HTTP cache entries and browser state files, but no persisted server-to-client MuDB PUBLIC frame capture.",
    caution: "Binary companion streams sharing a static JavaScript URL are retained as cache evidence only and must not be treated as WebSocket frames.",
  },
};

await writeFile(resolve(root, "generated/player-profile-network-inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Inventoried Player profile: ${cacheEntries.length} cache streams; no server-to-client PUBLIC frame found.`);

function parseSimpleEntry(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== simpleEntryMagic) return null;
  const keyLength = buffer.readUInt32LE(12);
  const bodyStart = 24 + keyLength;
  const bodyEnd = buffer.indexOf(eofMagic, bodyStart);
  if (keyLength < 1 || bodyStart > buffer.length || bodyEnd <= bodyStart) return null;
  return {
    key: buffer.subarray(24, bodyStart).toString("utf8"),
    body: buffer.subarray(bodyStart, bodyEnd),
  };
}

function safeStaticPath(key) {
  try {
    const pathname = new URL(key).pathname;
    return pathname.startsWith("/_next/static/") ? pathname : "[non-static-cache-entry]";
  } catch {
    return "[invalid-cache-key]";
  }
}

function safeRoute(key) {
  try {
    const url = new URL(key);
    const parts = url.pathname.split("/").filter(Boolean);
    let family = "/";
    if (parts[0] === "play") family = "/play/[id]";
    else if (parts[0] === "_next" && parts[1] === "data") family = "/_next/data/[build]/[route]";
    else if (parts[0] === "_next" && parts[1] === "static") family = "/_next/static/[asset]";
    else if (["api", "config", "locales", "pwa", "fonts", "scripts", "tools", "activities"].includes(parts[0])) {
      family = `/${parts.slice(0, 2).map(safeSegment).join("/")}`;
    } else if (parts.length > 0) family = `/${safeSegment(parts[0])}`;
    return { family, queryNames: [...new Set(url.searchParams.keys())].sort() };
  } catch {
    return { family: "[invalid-cache-key]", queryNames: [] };
  }
}

function classifyResource(pathname, body, printableRatio, streamIndex) {
  if (pathname.endsWith(".js") && streamIndex === 0 && printableRatio > 0.95) return "static-javascript-response";
  if (pathname.endsWith(".js") && streamIndex === 1 && body.length >= 16 && body.readUInt32LE(0) === 3) return "static-javascript-binary-companion";
  if (pathname !== "[non-static-cache-entry]" && printableRatio > 0.9) return "static-text-response";
  return "cache-stream-unclassified";
}

function classifyResponse(body, printableRatio) {
  const head = body.subarray(0, 64).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html";
  if (head.startsWith("{") || head.startsWith("[")) return "json-or-javascript-data";
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "xml-or-svg";
  if (printableRatio > 0.9) return "text";
  return "binary-or-container";
}

function aggregateRoutes(entries) {
  const rows = new Map();
  for (const entry of entries) {
    const key = `${entry.routeFamily}\u0000${entry.streamIndex}\u0000${entry.responseKind}`;
    const current = rows.get(key) ?? {
      routeFamily: entry.routeFamily,
      streamIndex: entry.streamIndex,
      responseKind: entry.responseKind,
      entries: 0,
      bytes: 0,
      queryNames: new Set(),
    };
    current.entries += 1;
    current.bytes += entry.bodyBytes;
    for (const name of entry.queryNames) current.queryNames.add(name);
    rows.set(key, current);
  }
  return [...rows.values()]
    .map(row => ({ ...row, queryNames: [...row.queryNames].sort() }))
    .sort((a, b) => a.routeFamily.localeCompare(b.routeFamily) || a.streamIndex - b.streamIndex || a.responseKind.localeCompare(b.responseKind));
}

function safeSegment(value) {
  return /^[a-z0-9._-]{1,64}$/iu.test(value) ? value : "[segment]";
}

function countKeywords(buffer) {
  const text = buffer.toString("latin1");
  return Object.fromEntries(safeKeywords.map(keyword => [keyword, countLiteral(text, keyword)]));
}

function countLiteral(text, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) >= 0) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function addCounts(target, source) {
  for (const keyword of safeKeywords) target[keyword] += source[keyword];
}

function ratio(buffer, predicate) {
  if (buffer.length === 0) return 0;
  let matches = 0;
  for (const byte of buffer) if (predicate(byte)) matches += 1;
  return matches / buffer.length;
}

async function walk(directory, missingIsEmpty = false) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (missingIsEmpty && error?.code === "ENOENT") return [];
    throw error;
  }
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}
