import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { verifyPlayerBlockAudioAssets } from "../src/player-block-audio-integrity.mjs";

test("Player block audio integrity binds package bytes to the archive CID", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-player-block-audio-"));
  const buildRoot = join(root, "project");
  const assetRoot = join(root, "archive");
  try {
    const bytes = Buffer.from("ID3 public-audio-content");
    const contentAddress = cidV0(bytes);
    const source = `assets/content/${contentAddress}.mp3`;
    await writeFixtureFile(buildRoot, source, bytes);
    await writeFixtureFile(assetRoot, `block/${contentAddress}`, bytes);
    const assets = [{ logicalPath: `audio/${contentAddress}.mp3`, source }];

    assert.deepEqual(await verifyPlayerBlockAudioAssets({ buildRoot, assetRoot, assets }), { audio: 1 });

    await writeFixtureFile(assetRoot, `block/${contentAddress}`, Buffer.from("ID3 changed"));
    await assert.rejects(
      () => verifyPlayerBlockAudioAssets({ buildRoot, assetRoot, assets }),
      /do not match the package/,
    );

    const changedBytes = Buffer.from("ID3 changed");
    await writeFixtureFile(buildRoot, source, changedBytes);
    await assert.rejects(
      () => verifyPlayerBlockAudioAssets({ buildRoot, assetRoot, assets }),
      /do not match the content address/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeFixtureFile(root, relativePath, bytes) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

function cidV0(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), createHash("sha256").update(bytes).digest()]);
  let value = BigInt(`0x${multihash.toString("hex")}`);
  let encoded = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    encoded = alphabet[remainder] + encoded;
    value /= 58n;
  }
  return encoded;
}
