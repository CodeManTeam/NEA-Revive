import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { resolveRegularFileWithin } from "./package-paths.mjs";

const CONTENT_ADDRESS = /^[A-Za-z0-9_-]{43}$/;

export async function verifyClientUiPictureAssets(assetRoot, uiState) {
  const pictureAssets = uiState?.pictureAssets;
  if (!pictureAssets || typeof pictureAssets !== "object" || Array.isArray(pictureAssets)) {
    throw new Error("Client UI picture assets are missing or invalid");
  }
  const names = Object.keys(pictureAssets).sort();
  for (const name of names) {
    await verifyPictureAsset(assetRoot, name, pictureAssets[name]);
  }
  return Object.freeze({ pictures: names.length });
}

async function verifyPictureAsset(assetRoot, name, asset) {
  const metadataHash = asset?.metadataHash;
  const imageHash = asset?.hash;
  if (!CONTENT_ADDRESS.test(metadataHash) || !CONTENT_ADDRESS.test(imageHash)) {
    throw new Error(`Client UI picture asset content address is invalid: ${name}`);
  }
  const metadataBytes = await readArchiveContent(assetRoot, metadataHash, `picture metadata ${name}`);
  if (contentAddress(metadataBytes) !== metadataHash) {
    throw new Error(`Client UI picture metadata does not match its content address: ${name}`);
  }
  const metadata = parseMetadata(metadataBytes, name);
  if (metadata.hash !== imageHash || metadata.width !== asset.width || metadata.height !== asset.height) {
    throw new Error(`Client UI picture metadata does not match its manifest: ${name}`);
  }
  const imageBytes = await readArchiveContent(assetRoot, imageHash, `picture image ${name}`);
  if (contentAddress(imageBytes) !== imageHash) {
    throw new Error(`Client UI picture image does not match its content address: ${name}`);
  }
}

async function readArchiveContent(assetRoot, hash, label) {
  return readFile(await resolveRegularFileWithin(assetRoot, `engine/m/${hash}`, label));
}

function parseMetadata(bytes, name) {
  let metadata;
  try {
    metadata = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Client UI picture metadata is not valid JSON: ${name}`, { cause: error });
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) ||
      typeof metadata.hash !== "string" || !Number.isInteger(metadata.width) || metadata.width <= 0 ||
      !Number.isInteger(metadata.height) || metadata.height <= 0) {
    throw new Error(`Client UI picture metadata is invalid: ${name}`);
  }
  return metadata;
}

function contentAddress(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}
