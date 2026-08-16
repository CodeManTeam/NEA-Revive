const CHUNK_MASK = 31;
const CHUNK_SIZE = 32;
const MAX_PALETTE_ENTRIES = 4096;
const MAX_BOXES = 32768;

export function decodeRecoveredVoxelChunk(input) {
  const bytes = toBytes(input);
  const state = { bytes, offset: 0 };
  const paletteLength = readVarint(state);
  const boxCount = readVarint(state);
  if (paletteLength > MAX_PALETTE_ENTRIES) throw new RangeError(`Chunk palette is too large: ${paletteLength}`);
  if (boxCount > MAX_BOXES) throw new RangeError(`Chunk box count is too large: ${boxCount}`);
  const palette = Array.from({ length: paletteLength }, () => readVarint(state));
  const boxes = [];
  let previousX = 0;
  let previousY = 0;
  let previousZ = 0;
  for (let index = 0; index < boxCount; index += 1) {
    const minimum = readVarint(state);
    const size = readVarint(state);
    const paletteIndex = readVarint(state);
    if (paletteIndex >= palette.length) throw new RangeError(`Invalid chunk palette index: ${paletteIndex}`);
    const minX = (previousX + decodeZigZag(deinterleave3(minimum))) & CHUNK_MASK;
    const minY = (previousY + decodeZigZag(deinterleave3(minimum >>> 1))) & CHUNK_MASK;
    const minZ = (previousZ + decodeZigZag(deinterleave3(minimum >>> 2))) & CHUNK_MASK;
    const maxX = minX + deinterleave3(size);
    const maxY = minY + deinterleave3(size >>> 1);
    const maxZ = minZ + deinterleave3(size >>> 2);
    if (maxX <= minX || maxY <= minY || maxZ <= minZ || maxX > CHUNK_SIZE || maxY > CHUNK_SIZE || maxZ > CHUNK_SIZE) {
      throw new RangeError(`Invalid chunk box bounds at index ${index}: ${minX},${minY},${minZ}..${maxX},${maxY},${maxZ}`);
    }
    boxes.push({ minX, minY, minZ, maxX, maxY, maxZ, block: palette[paletteIndex], faces: 0 });
    previousX = minX;
    previousY = minY;
    previousZ = minZ;
  }
  for (let index = 1; index < boxes.length; index += 1) {
    if (compareTerrainBoxes(boxes[index - 1], boxes[index]) > 0) throw new Error(`Voxel chunk boxes are not sorted at index ${index}`);
  }
  if (state.offset !== bytes.length) throw new Error(`Voxel chunk has ${bytes.length - state.offset} trailing bytes`);
  return { palette, boxes, bytesRead: state.offset };
}

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError("Voxel chunk input must be an ArrayBuffer or byte view");
}

function readVarint(state) {
  let value = 0;
  let shift = 0;
  while (state.offset < state.bytes.length) {
    const byte = state.bytes[state.offset++];
    value += (byte & 127) * 2 ** shift;
    if ((byte & 128) === 0) return value;
    shift += 7;
  }
  throw new Error("Unexpected end of voxel chunk varint");
}

function decodeZigZag(value) {
  return value & 1 ? -(value >>> 1) - 1 : value >>> 1;
}

function deinterleave3(value) {
  let result = 1227133513 & value;
  result = 3272356035 & (result | result >>> 2);
  result |= result >>> 4;
  result &= 251719695;
  result |= result >>> 8;
  result &= 4278190335;
  result |= result >>> 16;
  return result & 1023;
}

function compareTerrainBoxes(left, right) {
  return left.minZ - right.minZ || left.minY - right.minY || left.minX - right.minX || left.maxX - right.maxX || left.maxY - right.maxY || left.maxZ - right.maxZ || left.block - right.block || left.faces - right.faces;
}
