import assert from "node:assert/strict";
import test from "node:test";
import { assertNativePlayerTerrainShape, assertTerrainBlockIdsInCatalog, convertRecoveredVoxelChunks } from "../src/recovered-terrain-converter.mjs";

test("converts a confirmed slot-aligned chunk into nea-terrain voxels", () => {
  const result = convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([5 | (2 << 14)], [[1, 2, 3, 2, 1, 1, 0]])],
    orderProof: orderProof(),
    maxVoxels: 2,
  });

  assert.deepEqual(result, {
    formatVersion: "nea-terrain/v1",
    voxels: [
      { position: [1, 2, 3], blockId: 5, rotation: 2 },
      { position: [2, 2, 3], blockId: 5, rotation: 2 },
    ],
  });
});

test("rejects conversion without confirmed order evidence or slot-aligned bodies", () => {
  assert.throws(() => convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([], [])],
    maxVoxels: 0,
  }), error => error.code === "evidence-blocked");
  assert.throws(() => convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [],
    orderProof: orderProof(),
    maxVoxels: 0,
  }), /slot count/);
});

test("enforces the caller-provided terrain size limit", () => {
  assert.throws(() => convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([1], [[0, 0, 0, 2, 1, 1, 0]])],
    orderProof: orderProof(),
    maxVoxels: 1,
  }), /maxVoxels/);
});

test("rejects overlapping recovered chunk boxes before package emission", () => {
  assert.throws(() => convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([1, 2], [
      [0, 0, 0, 2, 1, 1, 0],
      [1, 0, 0, 2, 1, 1, 1],
    ])],
    orderProof: orderProof(),
    maxVoxels: 4,
  }), /overlapping chunk boxes/);
});

test("rejects packed block values that use Player-reserved bits", () => {
  assert.throws(() => convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([1 | (1 << 12)], [[0, 0, 0, 1, 1, 1, 0]])],
    orderProof: orderProof(),
    maxVoxels: 1,
  }), /reserved bits/);
});

test("rejects converted terrain blocks absent from the selected Player catalog", () => {
  const terrain = convertRecoveredVoxelChunks({
    voxels: voxelDescriptor(),
    chunkBodies: [chunkBytes([5], [[0, 0, 0, 1, 1, 1, 0]])],
    orderProof: orderProof(),
    maxVoxels: 1,
  });
  assert.doesNotThrow(() => assertTerrainBlockIdsInCatalog(terrain.voxels, [{ id: 0 }, { id: 5 }]));
  assert.throws(() => assertTerrainBlockIdsInCatalog(terrain.voxels, [{ id: 0 }]), /absent from the selected Player catalog/);
});

test("rejects terrain shapes outside Native Player dimensions", () => {
  assert.doesNotThrow(() => assertNativePlayerTerrainShape({ x: 1024, y: 32, z: 64 }));
  assert.throws(() => assertNativePlayerTerrainShape({ x: 1056, y: 32, z: 64 }), /Native Player-compatible range/);
  assert.throws(() => assertNativePlayerTerrainShape({ x: 48, y: 32, z: 64 }), /Native Player-compatible range/);
});

function voxelDescriptor() {
  return {
    shape: { x: 32, y: 32, z: 32 },
    chunks: ["slot-000"],
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
    chunkShape: { x: 1, y: 1, z: 1 },
    slotCount: 1,
  };
}

function chunkBytes(palette, boxes) {
  const output = [varint(palette.length), varint(boxes.length), ...palette.map(varint)];
  for (const [minX, minY, minZ, sizeX, sizeY, sizeZ, paletteIndex] of boxes) {
    output.push(varint(interleave3(zigzag(minX)) | (interleave3(zigzag(minY)) << 1) | (interleave3(zigzag(minZ)) << 2)));
    output.push(varint(interleave3(sizeX) | (interleave3(sizeY) << 1) | (interleave3(sizeZ) << 2)));
    output.push(varint(paletteIndex));
  }
  return Uint8Array.from(output.flat());
}

function varint(value) {
  const bytes = [];
  do {
    const byte = value & 127;
    value >>>= 7;
    bytes.push(byte | (value ? 128 : 0));
  } while (value);
  return bytes;
}

function zigzag(value) {
  return value < 0 ? (-value * 2) - 1 : value * 2;
}

function interleave3(value) {
  let result = 0;
  for (let bit = 0; bit < 10; bit += 1) result |= ((value >>> bit) & 1) << (bit * 3);
  return result;
}
