import { readFile } from "node:fs/promises";

import { resolveRegularFileWithin } from "./package-paths.mjs";

export async function verifyServerScriptModules(buildRoot, manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || typeof manifest.entry !== "string" || !Array.isArray(manifest.modules)) {
    throw new Error("Project script manifest is invalid");
  }
  const names = new Set();
  for (const name of manifest.modules) {
    if (typeof name !== "string" || name.length === 0) throw new Error("Project script manifest module is invalid");
    if (names.has(name)) throw new Error(`Project script manifest module is duplicated: ${name}`);
    names.add(name);
  }
  if (!names.has(manifest.entry)) throw new Error("Project script manifest modules must include the entry");
  return Object.freeze(await Promise.all(manifest.modules.map(async name => Object.freeze({
    side: "server",
    name,
    bytes: await readFile(await resolveRegularFileWithin(buildRoot, name, `server module ${name}`)),
  }))));
}
