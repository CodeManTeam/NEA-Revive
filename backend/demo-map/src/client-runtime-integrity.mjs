import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolveRegularFileWithin } from "./package-paths.mjs";

const SHA256 = /^[a-f0-9]{64}$/;

export async function verifyClientRuntimeAssets(runtimeRoot, manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Client runtime manifest is invalid");
  if (manifest.format !== "nea-recovered-client-runtime" || manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error("Client runtime manifest format is unsupported");
  const seenFiles = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Client runtime asset entry is invalid");
    if (typeof entry.file !== "string" || entry.file.length === 0 || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !SHA256.test(entry.sha256)) throw new Error("Client runtime asset metadata is invalid");
    if (seenFiles.has(entry.file)) throw new Error(`Client runtime asset is duplicated: ${entry.file}`);
    seenFiles.add(entry.file);
    const bytes = await readFile(await resolveRegularFileWithin(runtimeRoot, entry.file, `client runtime asset ${entry.file}`));
    if (bytes.byteLength !== entry.bytes) throw new Error(`Client runtime asset byte length mismatch: ${entry.file}`);
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`Client runtime asset hash mismatch: ${entry.file}`);
  }
  return Object.freeze({ assets: manifest.files.length });
}
