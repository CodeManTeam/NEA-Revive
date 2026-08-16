import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";

import { verifyBootstrapAvatarAssets, verifyBootstrapMeshAssets, verifyBootstrapSoundAssets } from "../src/bootstrap-mesh-integrity.mjs";
import { cidV0 } from "../src/block-content-address.mjs";

test("bootstrap mesh integrity verifies referenced engine records and model data", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-bootstrap-mesh-"));
  try {
    const data = Buffer.from("public-model-data");
    const dataHash = contentAddress(data);
    const metadata = Buffer.from(JSON.stringify({ dataHash }));
    const metadataHash = contentAddress(metadata);
    await writeEngineAsset(root, metadataHash, metadata);
    await writeEngineAsset(root, dataHash, data);
    const bootstrap = Buffer.from(JSON.stringify({ meshHashes: [{ hash: metadataHash }, { hash: metadataHash }] }));

    assert.deepEqual(await verifyBootstrapMeshAssets(root, bootstrap), { meshes: 1, modelData: 1 });

    await writeEngineAsset(root, dataHash, Buffer.from("changed"));
    await assert.rejects(
      () => verifyBootstrapMeshAssets(root, bootstrap),
      /mesh data does not match its content address/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bootstrap avatar integrity verifies skin and skin-part archive records", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-bootstrap-avatar-"));
  try {
    const avatar = Buffer.from("public-avatar-content");
    const avatarHash = contentAddress(avatar);
    const catalogHash = contentAddress(Buffer.from("skin-catalog-key"));
    await writeAvatarAsset(root, avatarHash, avatar);
    const bootstrap = Buffer.from(JSON.stringify({
      skinHashes: [{ hash: catalogHash, parts: { body: avatarHash, head: "" } }],
      skinPartHashBatches: [[{ hash: avatarHash }], []],
    }));

    // The recovered Player requests part hashes from /avatar/m; the skin hash identifies the catalog entry.
    assert.deepEqual(await verifyBootstrapAvatarAssets(root, bootstrap), { avatars: 1 });

    await writeAvatarAsset(root, avatarHash, Buffer.from("changed"));
    await assert.rejects(
      () => verifyBootstrapAvatarAssets(root, bootstrap),
      /avatar asset does not match its content address/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bootstrap sound integrity verifies every declared block CID", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-bootstrap-sound-"));
  try {
    const sound = Buffer.from("ID3 public-bootstrap-sound");
    const hash = cidV0(sound);
    await writeBlockAsset(root, hash, sound);
    const bootstrap = Buffer.from(JSON.stringify({ soundDictionary: ["", hash, hash] }));

    assert.deepEqual(await verifyBootstrapSoundAssets(root, bootstrap), { sounds: 1 });

    await writeBlockAsset(root, hash, Buffer.from("ID3 changed"));
    await assert.rejects(
      () => verifyBootstrapSoundAssets(root, bootstrap),
      /sound does not match its content address/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeEngineAsset(root, hash, bytes) {
  const path = join(root, "engine", "m", hash);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

async function writeAvatarAsset(root, hash, bytes) {
  const path = join(root, "avatar", "m", hash);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

async function writeBlockAsset(root, hash, bytes) {
  const path = join(root, "block", hash);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

function contentAddress(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}
