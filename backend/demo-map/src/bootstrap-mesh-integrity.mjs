import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { cidV0 } from "./block-content-address.mjs";
import { resolveRegularFileWithin } from "./package-paths.mjs";

const CONTENT_ADDRESS = /^[A-Za-z0-9_-]{43}$/;
const CONTENT_ID = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

export async function verifyBootstrapMeshAssets(assetRoot, bootstrapBytes) {
  const bootstrap = parseBootstrap(bootstrapBytes);
  if (!Array.isArray(bootstrap.meshHashes)) throw new Error("Project bootstrap mesh hashes are missing or invalid");
  const hashes = [...new Set(bootstrap.meshHashes.map(entry => entry?.hash))];
  if (hashes.some(hash => typeof hash !== "string" || !CONTENT_ADDRESS.test(hash))) {
    throw new Error("Project bootstrap mesh hash is invalid");
  }
  let modelData = 0;
  for (const hash of hashes) {
    modelData += await verifyMeshAsset(assetRoot, hash);
  }
  return Object.freeze({ meshes: hashes.length, modelData });
}

export async function verifyBootstrapAvatarAssets(assetRoot, bootstrapBytes) {
  const bootstrap = parseBootstrap(bootstrapBytes);
  const hashes = avatarHashes(bootstrap);
  for (const hash of hashes) {
    const bytes = await readAvatarAsset(assetRoot, hash);
    if (contentAddress(bytes) !== hash) {
      throw new Error(`Project bootstrap avatar asset does not match its content address: ${hash}`);
    }
  }
  return Object.freeze({ avatars: hashes.length });
}

export async function verifyBootstrapSoundAssets(assetRoot, bootstrapBytes) {
  const bootstrap = parseBootstrap(bootstrapBytes);
  if (!Array.isArray(bootstrap.soundDictionary)) throw new Error("Project bootstrap sound dictionary is missing or invalid");
  const hashes = [...new Set(bootstrap.soundDictionary.filter(hash => hash !== ""))];
  if (hashes.some(hash => typeof hash !== "string" || !CONTENT_ID.test(hash))) {
    throw new Error("Project bootstrap sound hash is invalid");
  }
  for (const hash of hashes) {
    const bytes = await readFile(await resolveRegularFileWithin(assetRoot, `block/${hash}`, `bootstrap sound ${hash}`));
    if (cidV0(bytes) !== hash) {
      throw new Error(`Project bootstrap sound does not match its content address: ${hash}`);
    }
  }
  return Object.freeze({ sounds: hashes.length });
}

async function verifyMeshAsset(assetRoot, hash) {
  const bytes = await readEngineAsset(assetRoot, hash, "bootstrap mesh");
  if (contentAddress(bytes) !== hash) {
    throw new Error(`Project bootstrap mesh does not match its content address: ${hash}`);
  }
  const dataHash = parseOptionalDataHash(bytes);
  if (dataHash === null) return 0;
  const data = await readEngineAsset(assetRoot, dataHash, "bootstrap mesh data");
  if (contentAddress(data) !== dataHash) {
    throw new Error(`Project bootstrap mesh data does not match its content address: ${dataHash}`);
  }
  return 1;
}

function avatarHashes(bootstrap) {
  if (!Array.isArray(bootstrap.skinHashes) || !Array.isArray(bootstrap.skinPartHashBatches)) {
    throw new Error("Project bootstrap skin hashes are missing or invalid");
  }
  const hashes = [
    ...bootstrap.skinHashes.flatMap(entry => Object.values(entry?.parts ?? {})),
    ...bootstrap.skinPartHashBatches.flatMap(batch => Array.isArray(batch) ? batch.map(entry => entry?.hash) : [undefined]),
  ].filter(hash => hash !== "");
  if (hashes.some(hash => typeof hash !== "string" || !CONTENT_ADDRESS.test(hash))) {
    throw new Error("Project bootstrap skin hash is invalid");
  }
  return [...new Set(hashes)];
}

function parseBootstrap(bytes) {
  try {
    const value = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value;
  } catch (error) {
    throw new Error("Project bootstrap data is not valid JSON", { cause: error });
  }
}

function parseOptionalDataHash(bytes) {
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value) || value.dataHash === undefined) return null;
    if (typeof value.dataHash !== "string" || !CONTENT_ADDRESS.test(value.dataHash)) {
      throw new Error("Project bootstrap mesh metadata dataHash is invalid");
    }
    return value.dataHash;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

async function readEngineAsset(assetRoot, hash, label) {
  return readFile(await resolveRegularFileWithin(assetRoot, `engine/m/${hash}`, `${label} ${hash}`));
}

async function readAvatarAsset(assetRoot, hash) {
  return readFile(await resolveRegularFileWithin(assetRoot, `avatar/m/${hash}`, `bootstrap avatar ${hash}`));
}

function contentAddress(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}
