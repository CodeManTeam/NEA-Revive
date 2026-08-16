import { readFile } from "node:fs/promises";

import { resolveRegularFileWithin } from "./package-paths.mjs";

const PROJECTION_FORMAT = "nea-local-player-entity-projection";
const PROJECTION_VERSION = 1;

export async function verifyPlayerProjectionPackageIdentity({ buildRoot, descriptorPath, projectManifest }) {
  const packageId = projectManifest?.packageId;
  if (typeof packageId !== "string" || packageId.length === 0) {
    throw new Error("Project manifest packageId is missing or invalid");
  }
  const path = await resolveRegularFileWithin(buildRoot, descriptorPath, "Player projection descriptor");
  let descriptor;
  try {
    descriptor = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error("Player projection descriptor is not valid JSON", { cause: error });
  }
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor) ||
      descriptor.format !== PROJECTION_FORMAT || descriptor.version !== PROJECTION_VERSION) {
    throw new Error("Player projection descriptor format is unsupported");
  }
  if (descriptor.packageId !== packageId) {
    throw new Error("Player projection descriptor packageId does not match project manifest");
  }
  return Object.freeze({ packageId });
}
