import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyClientUiPictureAssets } from "../src/client-ui-picture-integrity.mjs";

test("client UI picture integrity binds manifest metadata and archived image content", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-client-ui-picture-"));
  try {
    const imageBytes = Buffer.from("public-picture-content");
    const imageHash = contentAddress(imageBytes);
    const metadataBytes = Buffer.from(JSON.stringify({ hash: imageHash, width: 12, height: 8 }));
    const metadataHash = contentAddress(metadataBytes);
    await writeArchiveContent(root, metadataHash, metadataBytes);
    await writeArchiveContent(root, imageHash, imageBytes);

    const result = await verifyClientUiPictureAssets(root, {
      pictureAssets: { icon: { metadataHash, hash: imageHash, width: 12, height: 8 } },
    });
    assert.deepEqual(result, { pictures: 1 });

    await assert.rejects(
      () => verifyClientUiPictureAssets(root, {
        pictureAssets: { icon: { metadataHash, hash: imageHash, width: 13, height: 8 } },
      }),
      /does not match its manifest/,
    );

    await writeArchiveContent(root, imageHash, Buffer.from("changed"));
    await assert.rejects(
      () => verifyClientUiPictureAssets(root, {
        pictureAssets: { icon: { metadataHash, hash: imageHash, width: 12, height: 8 } },
      }),
      /image does not match its content address/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeArchiveContent(root, hash, bytes) {
  const directory = join(root, "engine", "m");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, hash), bytes);
}

function contentAddress(bytes) {
  return createHash("sha256").update(bytes).digest("base64url");
}
