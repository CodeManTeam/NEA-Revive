import { decodeRecoveredVoxelChunk } from "./recovered-voxel-chunk.mjs";
import { preflightRecoveredTerrainOrder } from "./recovered-terrain-order-preflight.mjs";

const BLOCK_ID_MASK = 4095;
const CHUNK_SIZE = 32;
const MAX_PACKED_BLOCK = 65535;
const MAX_NATIVE_PLAYER_DIMENSION = 1024;
const ROTATION_SHIFT = 14;
const PLAYER_PACKED_BLOCK_MASK = BLOCK_ID_MASK | (3 << ROTATION_SHIFT);

export function convertRecoveredVoxelChunks({ voxels, chunkBodies, orderProof, maxVoxels }) {
  const preflight = preflightRecoveredTerrainOrder(voxels, orderProof);
  if (!preflight.canProceedWithOrder) throw blockedConversionError(preflight);
  assertNativePlayerTerrainShape(voxels.shape);
  if (!Array.isArray(chunkBodies) || chunkBodies.length !== preflight.slotCount) {
    throw new RangeError("Recovered terrain chunk bodies must match the descriptor slot count");
  }
  if (!Number.isSafeInteger(maxVoxels) || maxVoxels < 0) {
    throw new RangeError("Recovered terrain conversion requires a non-negative safe maxVoxels limit");
  }

  const terrain = [];
  for (let index = 0; index < chunkBodies.length; index += 1) {
    const decoded = decodeChunkBody(chunkBodies[index], index);
    const chunk = chunkCoordinates(index, preflight.chunkShape);
    appendChunkVoxels(terrain, decoded.boxes, chunk, maxVoxels);
  }
  return {
    formatVersion: "nea-terrain/v1",
    voxels: terrain,
  };
}

export function assertNativePlayerTerrainShape(shape) {
  if (!shape || typeof shape !== "object" || Array.isArray(shape)) {
    throw new TypeError("Recovered terrain shape must be an object");
  }
  for (const axis of ["x", "y", "z"]) {
    const value = shape[axis];
    if (!Number.isSafeInteger(value) || value < CHUNK_SIZE || value > MAX_NATIVE_PLAYER_DIMENSION || value % CHUNK_SIZE !== 0) {
      throw new RangeError(`Recovered terrain ${axis} dimension is outside the Native Player-compatible range`);
    }
  }
}

export function assertTerrainBlockIdsInCatalog(voxels, catalog) {
  if (!Array.isArray(voxels)) throw new TypeError("Recovered terrain voxels must be an array");
  if (!Array.isArray(catalog)) throw new TypeError("Player block catalog must be an array");
  const blockIds = new Set(catalog.map(entry => entry?.id));
  for (const [index, voxel] of voxels.entries()) {
    if (!blockIds.has(voxel?.blockId)) {
      throw new Error(`Recovered terrain block ID is absent from the selected Player catalog at voxel ${index}`);
    }
  }
}

function blockedConversionError(preflight) {
  const error = new Error("Recovered terrain conversion is blocked by missing or incompatible order evidence");
  error.code = "evidence-blocked";
  error.diagnostics = preflight.diagnostics;
  return error;
}

function decodeChunkBody(body, index) {
  try {
    return decodeRecoveredVoxelChunk(body);
  } catch (cause) {
    throw new Error(`Unable to decode recovered terrain chunk at slot ${index}`, { cause });
  }
}

function chunkCoordinates(index, chunkShape) {
  const x = index % chunkShape.x;
  const y = Math.floor(index / chunkShape.x) % chunkShape.y;
  const z = Math.floor(index / (chunkShape.x * chunkShape.y));
  return { x, y, z };
}

function appendChunkVoxels(terrain, boxes, chunk, maxVoxels) {
  const positions = new Set();
  for (const box of boxes) {
    const volume = (box.maxX - box.minX) * (box.maxY - box.minY) * (box.maxZ - box.minZ);
    if (terrain.length + volume > maxVoxels) throw new RangeError("Recovered terrain exceeds the configured maxVoxels limit");
    const { blockId, rotation } = unpackBlock(box.block);
    for (let z = box.minZ; z < box.maxZ; z += 1) {
      for (let y = box.minY; y < box.maxY; y += 1) {
        for (let x = box.minX; x < box.maxX; x += 1) {
          const position = [chunk.x * CHUNK_SIZE + x, chunk.y * CHUNK_SIZE + y, chunk.z * CHUNK_SIZE + z];
          const key = position.join(",");
          if (positions.has(key)) throw new Error(`Recovered terrain contains overlapping chunk boxes at ${key}`);
          positions.add(key);
          terrain.push({
            position,
            blockId,
            rotation,
          });
        }
      }
    }
  }
}

function unpackBlock(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_PACKED_BLOCK) {
    throw new RangeError("Recovered terrain block value is outside the Player-compatible range");
  }
  if ((value & ~PLAYER_PACKED_BLOCK_MASK) !== 0) {
    throw new RangeError("Recovered terrain block value uses reserved bits that Player cannot represent");
  }
  return {
    blockId: value & BLOCK_ID_MASK,
    rotation: value >>> ROTATION_SHIFT,
  };
}
