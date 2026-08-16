import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildProjectCapabilityManifest } from "./capability-manifest.mjs";

export async function buildRepositoryProjectCapabilityManifest(options) {
  const runtimeCompatibility = options.runtimeCompatibility ?? await loadRepositoryRuntimeCompatibility(options.repositoryRoot);
  const { repositoryRoot: _repositoryRoot, runtimeCompatibility: _runtimeCompatibility, ...manifestOptions } = options;
  return buildProjectCapabilityManifest({ ...manifestOptions, ...runtimeCompatibility });
}

export async function loadRepositoryRuntimeCompatibility(repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")) {
  const [currentRuntime, compatibilityMatrix, runtimeContracts] = await Promise.all([
    readJson(resolve(repositoryRoot, "Middleware", "runtime-compat", "abi", "current-runtime.json")),
    readJson(resolve(repositoryRoot, "Middleware", "runtime-compat", "abi", "compatibility-matrix.json")),
    readJson(resolve(repositoryRoot, "Middleware", "runtime-compat", "abi", "runtime-contracts.json")),
  ]);
  return Object.freeze({ currentRuntime, compatibilityMatrix, runtimeContracts });
}

export function publicRuntimeCapabilities(currentRuntime, side) {
  const prefix = `${side}.`;
  const internal = new Set(["client.script"]);
  return Object.freeze([...new Set(currentRuntime.entries
    .filter(entry => entry.id.startsWith(prefix) && entry.availability === "confirmed" && typeof entry.capability === "string" && !internal.has(entry.capability))
    .map(entry => entry.capability))].sort());
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
