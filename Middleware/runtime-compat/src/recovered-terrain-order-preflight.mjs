const CHUNK_SIZE = 32;
const LINEAR_INDEX = "x + nx * (y + ny * z)";
const PROOF_FORMAT = "nea-voxel-chunk-order-proof";

export function preflightRecoveredTerrainOrder(voxels, orderProof) {
  const descriptor = inspectDescriptor(voxels);
  if (descriptor.diagnostics.length > 0) return result("evidence-blocked", descriptor, descriptor.diagnostics);

  const proofDiagnostics = inspectOrderProof(orderProof, descriptor);
  if (proofDiagnostics.length > 0) return result("evidence-blocked", descriptor, proofDiagnostics);

  return result("partial", descriptor, [], true);
}

function inspectDescriptor(voxels) {
  const diagnostics = [];
  if (!isRecord(voxels)) {
    diagnostics.push(diagnostic("invalid-voxel-descriptor", "Voxel descriptor must be an object"));
    return { diagnostics };
  }
  const shape = voxels.shape;
  if (!isRecord(shape) || !["x", "y", "z"].every(axis => isChunkAligned(shape[axis]))) {
    diagnostics.push(diagnostic("invalid-voxel-shape", "Voxel shape must contain positive, 32-aligned integer axes"));
    return { diagnostics };
  }
  if (!Array.isArray(voxels.chunks)) {
    diagnostics.push(diagnostic("invalid-chunk-slots", "Voxel descriptor chunks must be an array"));
    return { diagnostics };
  }
  const chunkShape = Object.freeze({
    x: shape.x / CHUNK_SIZE,
    y: shape.y / CHUNK_SIZE,
    z: shape.z / CHUNK_SIZE,
  });
  const slotCount = chunkShape.x * chunkShape.y * chunkShape.z;
  if (voxels.chunks.length !== slotCount) {
    diagnostics.push(diagnostic("chunk-slot-count-mismatch", "Voxel chunk slot count does not match the 32-cube grid"));
  }
  return { chunkShape, slotCount, diagnostics };
}

function inspectOrderProof(orderProof, descriptor) {
  if (!isRecord(orderProof)) return [diagnostic("missing-order-proof", "A reviewed descriptor-to-reset order proof is required")];
  const diagnostics = [];
  if (orderProof.format !== PROOF_FORMAT || orderProof.version !== 1) {
    diagnostics.push(diagnostic("invalid-order-proof-format", "Order proof format and version are not supported"));
  }
  if (orderProof.status !== "confirmed-observed") {
    diagnostics.push(diagnostic("order-proof-not-confirmed", "Order proof must be confirmed-observed"));
  }
  if (orderProof.descriptorToResetHashes !== "confirmed-observed") {
    diagnostics.push(diagnostic("descriptor-reset-binding-unconfirmed", "Order proof must confirm descriptor slot to reset hash binding"));
  }
  if (orderProof.chunkSize !== CHUNK_SIZE || orderProof.linearIndex !== LINEAR_INDEX) {
    diagnostics.push(diagnostic("unsupported-chunk-order", "Order proof does not match the recovered Player chunk order"));
  }
  if (!sameGrid(orderProof.chunkShape, descriptor.chunkShape) || orderProof.slotCount !== descriptor.slotCount) {
    diagnostics.push(diagnostic("order-proof-grid-mismatch", "Order proof does not apply to this descriptor chunk grid"));
  }
  return diagnostics;
}

function result(status, descriptor, diagnostics, canProceedWithOrder = false) {
  return Object.freeze({
    format: "nea-recovered-terrain-order-preflight",
    version: 1,
    status,
    conversion: "not-attempted",
    canProceedWithOrder,
    chunkSize: CHUNK_SIZE,
    linearIndex: LINEAR_INDEX,
    chunkShape: descriptor.chunkShape ?? null,
    slotCount: descriptor.slotCount ?? null,
    diagnostics: Object.freeze(diagnostics),
  });
}

function isChunkAligned(value) {
  return Number.isSafeInteger(value) && value >= CHUNK_SIZE && value % CHUNK_SIZE === 0;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameGrid(value, expected) {
  return isRecord(value) && expected && ["x", "y", "z"].every(axis => value[axis] === expected[axis]);
}

function diagnostic(code, message) {
  return Object.freeze({ code, message });
}
