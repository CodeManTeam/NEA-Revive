import assert from "node:assert/strict";
import test from "node:test";
import { preflightRecoveredTerrainOrder } from "../src/recovered-terrain-order-preflight.mjs";

test("blocks terrain conversion when descriptor-to-reset order proof is absent", () => {
  const result = preflightRecoveredTerrainOrder(voxels(), undefined);

  assert.equal(result.status, "evidence-blocked");
  assert.equal(result.canProceedWithOrder, false);
  assert.deepEqual(result.diagnostics.map(diagnostic => diagnostic.code), ["missing-order-proof"]);
});

test("accepts a confirmed proof matching the recovered Player grid and formula", () => {
  const result = preflightRecoveredTerrainOrder(voxels(), orderProof());

  assert.equal(result.status, "partial");
  assert.equal(result.canProceedWithOrder, true);
  assert.deepEqual(result.chunkShape, { x: 8, y: 4, z: 8 });
  assert.equal(result.slotCount, 256);
  assert.equal(result.linearIndex, "x + nx * (y + ny * z)");
  assert.deepEqual(result.diagnostics, []);
});

test("blocks unconfirmed proofs, incompatible formulas, and mismatched descriptor slots", () => {
  const unconfirmed = preflightRecoveredTerrainOrder(voxels(), { ...orderProof(), status: "declared-only" });
  const incompatible = preflightRecoveredTerrainOrder(voxels(), { ...orderProof(), linearIndex: "z + nz * (y + ny * x)" });
  const mismatchedSlots = preflightRecoveredTerrainOrder(voxels(255), orderProof());

  assert.deepEqual(unconfirmed.diagnostics.map(diagnostic => diagnostic.code), ["order-proof-not-confirmed"]);
  assert.deepEqual(incompatible.diagnostics.map(diagnostic => diagnostic.code), ["unsupported-chunk-order"]);
  assert.deepEqual(mismatchedSlots.diagnostics.map(diagnostic => diagnostic.code), ["chunk-slot-count-mismatch"]);
});

function voxels(slotCount = 256) {
  return {
    shape: { x: 256, y: 128, z: 256 },
    chunks: Array.from({ length: slotCount }, () => ""),
  };
}

function orderProof() {
  return {
    format: "nea-voxel-chunk-order-proof",
    version: 1,
    status: "confirmed-observed",
    descriptorToResetHashes: "confirmed-observed",
    chunkSize: 32,
    linearIndex: "x + nx * (y + ny * z)",
    chunkShape: { x: 8, y: 4, z: 8 },
    slotCount: 256,
  };
}
