import { readFile } from "node:fs/promises";

import { cidV0 } from "./block-content-address.mjs";
import { resolveRegularFileWithin } from "./package-paths.mjs";

const AUDIO_PATH = /^audio\/(Qm[1-9A-HJ-NP-Za-km-z]{44})\.mp3$/;

export async function verifyPlayerBlockAudioAssets({ buildRoot, assetRoot, assets }) {
  if (!Array.isArray(assets)) throw new Error("Project asset index is missing or invalid");
  const audioAssets = assets.filter(asset => typeof asset?.logicalPath === "string" && AUDIO_PATH.test(asset.logicalPath));
  for (const asset of audioAssets) {
    await verifyAudioAsset({ buildRoot, assetRoot, asset });
  }
  return Object.freeze({ audio: audioAssets.length });
}

async function verifyAudioAsset({ buildRoot, assetRoot, asset }) {
  const contentAddress = AUDIO_PATH.exec(asset.logicalPath)?.[1];
  if (!contentAddress || typeof asset.source !== "string" || asset.source.length === 0) {
    throw new Error(`Player block audio asset is invalid: ${String(asset?.logicalPath)}`);
  }
  const [packageBytes, archiveBytes] = await Promise.all([
    readFile(await resolveRegularFileWithin(buildRoot, asset.source, `audio package asset ${asset.logicalPath}`)),
    readFile(await resolveRegularFileWithin(assetRoot, `block/${contentAddress}`, `audio archive asset ${asset.logicalPath}`)),
  ]);
  if (!packageBytes.equals(archiveBytes)) {
    throw new Error(`Player block audio archive bytes do not match the package: ${asset.logicalPath}`);
  }
  if (cidV0(archiveBytes) !== contentAddress) {
    throw new Error(`Player block audio archive bytes do not match the content address: ${asset.logicalPath}`);
  }
}
