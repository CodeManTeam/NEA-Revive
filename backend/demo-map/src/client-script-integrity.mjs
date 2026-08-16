import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";

import { resolveRegularFileWithin } from "./package-paths.mjs";

const SHA256 = /^[a-f0-9]{64}$/;

export async function verifyClientScriptAssets(manifestPath, manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || !Array.isArray(manifest.files)) {
    throw new Error("Client script manifest is invalid");
  }
  const root = dirname(manifestPath);
  const names = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.name !== "string" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !SHA256.test(entry.sha256)) {
      throw new Error("Client script manifest entry is invalid");
    }
    if (names.has(entry.name)) throw new Error(`Client script manifest entry is duplicated: ${entry.name}`);
    names.add(entry.name);
  }
  const modules = [];
  for (const entry of manifest.files) {
    const bytes = await readFile(await resolveRegularFileWithin(root, entry.name, `client module ${entry.name}`));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== entry.bytes || sha256 !== entry.sha256) {
      throw new Error(`Client script module does not match its manifest: ${entry.name}`);
    }
    modules.push(Object.freeze({ side: "client", name: entry.name, bytes }));
  }
  return Object.freeze(modules);
}
