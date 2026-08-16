import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCapturedVoxelChunkBodies } from "../../../Evidence/preservation-dump/resolve-voxel-chunk-bodies.mjs";
import { decodeRecoveredVoxelChunk } from "../src/recovered-voxel-chunk.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(root, "..", "..");
const worksRoot = resolve(repositoryRoot, "Evidence", "works", "private");
const capturesRoot = resolve(repositoryRoot, "Evidence", "dump", "private", "live-captures");
const output = resolve(root, "evidence", "voxel-chunk-inventory.json");
const projectPath = ["manual-cdp", "project", "project.json"];

const directories = (await readdir(worksRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .sort((left, right) => left.name.localeCompare(right.name));
const samples = [];

for (const directory of directories) {
  const project = await readProject(resolve(worksRoot, directory.name));
  const chunkInventory = inspectVoxelChunks(project?.voxels);
  if (chunkInventory === null) continue;
  const resolver = await findResolver(chunkInventory.entries);
  samples.push({
    sample: `sample-${String(samples.length + 1).padStart(3, "0")}`,
    shape: chunkInventory.shape,
    chunks: chunkInventory.chunks,
    resolver,
  });
}

if (samples.length === 0) throw new Error("No private project voxel chunks were available for inventory");
const evidence = {
  format: "nea-redacted-voxel-chunk-inventory",
  version: 1,
  generatedAt: new Date().toISOString(),
  privacy: {
    sourceValuesIncluded: false,
    sourcePathsIncluded: false,
    sourceNamesIncluded: false,
    sourceChunkBodiesIncluded: false,
  },
  provenance: {
    sourceClass: "approved-local-private-inspection",
    redactionStatus: "structural-statistics-only",
    publicStatus: "public-sanitized",
    reproducibilityLimit: "Original voxel shape values, chunk strings, work names, source paths, and chunk byte contents are intentionally unavailable.",
  },
  conversionReadiness: {
    targetFormat: "nea-terrain/v1",
    status: "evidence-blocked",
    playerArchiveDecoder: {
      input: "archive asset body",
      format: "varint palette and 32-cube box list",
      status: samples.every(sample => sample.resolver.decoder.status === "confirmed-observed") ? "confirmed-observed" : "evidence-blocked",
      reason: "The descriptor entry-to-body resolver and recovered archive body decoder are observed; block-id semantics and terrain coordinate mapping remain unverified.",
    },
    evidenceDeferred: [
      "decoded chunk byte layout",
      "voxel block id packing",
      "voxel rotation packing",
      "chunk coordinate ordering",
      "empty chunk semantics",
    ],
  },
  samples,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`Imported ${samples.length} anonymous voxel chunk inventory sample(s).`);

async function readProject(workRoot) {
  try {
    return JSON.parse(await readFile(resolve(workRoot, ...projectPath), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function inspectVoxelChunks(voxels) {
  if (!isRecord(voxels) || !isRecord(voxels.shape) || !Array.isArray(voxels.chunks)) return null;
  if (!voxels.chunks.every(chunk => typeof chunk === "string")) return null;
  const chunks = voxels.chunks;
  const encodedLengths = chunks.map(chunk => chunk.length);
  const base64Url = chunks.every(chunk => /^[A-Za-z0-9_-]+$/.test(chunk));
  const decodedLengths = base64Url ? chunks.map(chunk => Buffer.from(chunk, "base64url").length) : [];
  return {
    entries: [...new Set(chunks)],
    shape: { type: "object", axes: ["x", "y", "z"], axisValueType: "number" },
    chunks: {
      type: "array",
      count: chunks.length,
      itemType: "string",
      encoding: base64Url ? "base64url" : "unknown",
      encodedLength: summarizeLengths(encodedLengths),
      decodedLength: base64Url ? summarizeLengths(decodedLengths) : null,
      jsonEncoded: chunks.every(chunk => parsesJson(chunk)),
    },
  };
}

async function findResolver(entries) {
  let directories;
  try {
    directories = (await readdir(capturesRoot, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error?.code === "ENOENT") return { status: "evidence-blocked", resolvedEntries: 0 };
    throw error;
  }
  for (const directory of directories) {
    try {
      const bodies = await readCapturedVoxelChunkBodies(resolve(capturesRoot, directory.name), entries);
      const sizes = [...bodies.values()].map(bytes => bytes.byteLength);
      const decoder = summarizeDecodedBodies(bodies);
      return {
        status: "confirmed-observed",
        resolvedEntries: bodies.size,
        bodyBytes: { min: Math.min(...sizes), max: Math.max(...sizes), distinct: new Set(sizes).size },
        response: { status: 200, mimeType: "application/octet-stream", entryLocation: "terminal-url-path" },
        decoder,
      };
    } catch {
      continue;
    }
  }
  return { status: "evidence-blocked", resolvedEntries: 0 };
}

function summarizeDecodedBodies(bodies) {
  const decoded = [];
  let failedEntries = 0;
  const failureCategories = new Map();
  for (const bytes of bodies.values()) {
    try {
      decoded.push(decodeRecoveredVoxelChunk(bytes));
    } catch (error) {
      failedEntries += 1;
      const category = classifyDecodeFailure(error);
      failureCategories.set(category, (failureCategories.get(category) ?? 0) + 1);
    }
  }
  const errorCategories = Object.fromEntries([...failureCategories.entries()].sort(([left], [right]) => left.localeCompare(right)));
  if (decoded.length === 0) return { status: "evidence-blocked", decodedEntries: 0, failedEntries, errorCategories };
  const palettes = decoded.map(chunk => chunk.palette.length);
  const boxCounts = decoded.map(chunk => chunk.boxes.length);
  const blockIds = decoded.flatMap(chunk => chunk.palette);
  return {
    status: failedEntries === 0 ? "confirmed-observed" : "evidence-blocked",
    decodedEntries: decoded.length,
    failedEntries,
    errorCategories,
    paletteEntries: summarizeLengths(palettes),
    boxes: { ...summarizeLengths(boxCounts), total: boxCounts.reduce((sum, count) => sum + count, 0) },
    blockIds: summarizeLengths(blockIds),
    limits: { paletteEntries: 4096, boxes: 32768, chunkSize: 32 },
  };
}

function classifyDecodeFailure(error) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Unexpected end of voxel chunk varint")) return "unexpected-varint-end";
  if (message.startsWith("Chunk palette is too large")) return "palette-limit-exceeded";
  if (message.startsWith("Chunk box count is too large")) return "box-limit-exceeded";
  if (message.startsWith("Invalid chunk palette index")) return "palette-index-out-of-range";
  if (message.startsWith("Invalid chunk box bounds")) return "box-bounds-invalid";
  if (message.startsWith("Voxel chunk boxes are not sorted")) return "boxes-not-sorted";
  if (message.startsWith("Voxel chunk has")) return "trailing-bytes";
  return "unclassified-structural-failure";
}

function summarizeLengths(values) {
  return { min: Math.min(...values), max: Math.max(...values), distinct: new Set(values).size };
}

function parsesJson(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
