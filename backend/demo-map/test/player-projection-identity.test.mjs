import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { verifyPlayerProjectionPackageIdentity } from "../src/player-projection-identity.mjs";

test("Player projection identity binds the descriptor to the project package", async () => {
  const root = await mkdtemp(join(tmpdir(), "nea-player-projection-"));
  const descriptorPath = "compat/player-entity-projection.json";
  try {
    const path = join(root, "compat", "player-entity-projection.json");
    await mkdir(join(root, "compat"), { recursive: true });
    await writeFile(path, JSON.stringify({
      format: "nea-local-player-entity-projection",
      version: 1,
      packageId: "captured-123",
      entities: [],
    }));

    assert.deepEqual(
      await verifyPlayerProjectionPackageIdentity({ buildRoot: root, descriptorPath, projectManifest: { packageId: "captured-123" } }),
      { packageId: "captured-123" },
    );
    await assert.rejects(
      () => verifyPlayerProjectionPackageIdentity({ buildRoot: root, descriptorPath, projectManifest: { packageId: "other" } }),
      /does not match project manifest/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
