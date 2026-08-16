import assert from "node:assert/strict";
import test from "node:test";
import { decodeRecoveredVoxelChunk } from "../src/recovered-voxel-chunk.mjs";

test("decodes palette and sorted 32-cube boxes", () => {
  const bytes = chunkBytes([7, 9], [
    [0, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 2, 1, 1, 1],
  ]);
  assert.deepEqual(decodeRecoveredVoxelChunk(bytes), {
    palette: [7, 9],
    boxes: [
      { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1, block: 7, faces: 0 },
      { minX: 0, minY: 0, minZ: 0, maxX: 2, maxY: 1, maxZ: 1, block: 9, faces: 0 },
    ],
    bytesRead: bytes.length,
  });
});

test("rejects malformed headers, palette references, bounds, ordering, and trailing bytes", () => {
  assert.throws(() => decodeRecoveredVoxelChunk(concat(varint(4097), varint(0))), /palette is too large/);
  assert.throws(() => decodeRecoveredVoxelChunk(concat(varint(0), varint(32769))), /box count is too large/);
  assert.throws(() => decodeRecoveredVoxelChunk(concat(varint(0), varint(1), varint(0), varint(0), varint(0))), /palette index/);
  assert.throws(() => decodeRecoveredVoxelChunk(chunkBytes([1], [[0, 0, 0, 33, 1, 1, 0]])), /bounds/);
  assert.throws(() => decodeRecoveredVoxelChunk(chunkBytes([1], [[0, 0, 0, 2, 1, 1, 0], [0, 0, 0, 1, 1, 1, 0]])), /not sorted/);
  assert.throws(() => decodeRecoveredVoxelChunk(chunkBytes([1, 2], [[0, 0, 0, 1, 1, 1, 1], [0, 0, 0, 1, 1, 1, 0]])), /not sorted/);
  assert.throws(() => decodeRecoveredVoxelChunk(concat(chunkBytes([1], []), Uint8Array.of(1))), /trailing bytes/);
  assert.throws(() => decodeRecoveredVoxelChunk(Uint8Array.of(128)), /Unexpected end/);
});

function chunkBytes(palette, boxes) {
  const output = [varint(palette.length), varint(boxes.length), ...palette.map(varint)];
  for (const [minX, minY, minZ, sizeX, sizeY, sizeZ, paletteIndex] of boxes) {
    output.push(varint(interleave3(zigzag(minX)) | (interleave3(zigzag(minY)) << 1) | (interleave3(zigzag(minZ)) << 2)));
    output.push(varint(interleave3(sizeX) | (interleave3(sizeY) << 1) | (interleave3(sizeZ) << 2)));
    output.push(varint(paletteIndex));
  }
  return concat(...output);
}

function varint(value) {
  const bytes = [];
  do {
    const byte = value & 127;
    value >>>= 7;
    bytes.push(byte | (value ? 128 : 0));
  } while (value);
  return Uint8Array.from(bytes);
}

function zigzag(value) {
  return value < 0 ? (-value * 2) - 1 : value * 2;
}

function interleave3(value) {
  let result = 0;
  for (let bit = 0; bit < 10; bit += 1) result |= ((value >>> bit) & 1) << (bit * 3);
  return result;
}

function concat(...parts) {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
