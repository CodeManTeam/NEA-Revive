import fs from "node:fs";

// Decoder for the compact DAO3 voxel mesh payload embedded in engine/m assets.
// The payload is little-endian and starts with int32 magic -11, followed by
// vertex count, palette count and slice count. Output vertices are packed as
// three uint32 words per corner (position/face, material and flags).
export function decodeVoxelMesh(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const readI32 = () => { const v = view.getInt32(offset, true); offset += 4; return v; };
  const readU8 = () => bytes[offset++];
  const readVarint = () => {
    let shift = 0, out = 0;
    for (;;) { const b = readU8(); out |= (b & 127) << shift; if (!(b & 128)) return out >>> 0; shift += 7; }
  };
  if (readI32() !== -11) return null;
  const vertexCount = readVarint();
  const paletteCount = readVarint();
  const sliceCount = readVarint();
  const palette = {};
  for (let i = 0; i < paletteCount; i++) {
    const id = readU8();
    palette[id] = { rgb: [readU8(), readU8(), readU8()], pbr: [readU8(), readU8(), readU8()] };
  }
  const slices = [];
  for (let i = 0; i < sliceCount;) {
    const axis = readU8(), count = readVarint(); i += 2;
    const runs = [];
    for (let j = 0; j < count; j++) { const start = readU8(), len = readVarint(); runs.push([start, len]); i += 2; }
    slices.push({ axis, runs });
  }
  const packed = new Uint32Array(vertexCount * 12);
  const alpha = [0, 153, 204, 255];
  const set = (i, axis, coord, material, flags) => {
    const c = axis >> 1, u = (c + 2) % 3, v = (c + 1) % 3;
    const pos = [0, 0, 0]; pos[c] = coord;
    const uv = [0, 0]; uv[0] = readU8(); uv[1] = readU8();
    const w = readU8(), h = readU8(), mat = readU8(), edge = readU8();
    const base = i * 12; packed[base] = pos[0]; packed[base + 1] = pos[1]; packed[base + 2] = pos[2];
    packed[base + 3] = material; packed[base + 4] = uv[0]; packed[base + 5] = uv[1];
    packed[base + 6] = w; packed[base + 7] = h; packed[base + 8] = mat; packed[base + 9] = edge; packed[base + 10] = flags; packed[base + 11] = alpha[edge & 3];
    return { axis, coord, uv, material: mat, edge };
  };
  // Preserve the canonical packed stream while also exposing a readable face list.
  const faces = []; let index = 0;
  for (const slice of slices) for (const [start, count] of slice.runs) for (let j = 0; j < count; j++) {
    const axis = slice.axis, c = axis >> 1, u = (c + 2) % 3, v = (c + 1) % 3, sign = !(axis & 1);
    const p = readU8() << (u * 8), q = readU8() << (v * 8), r = readU8() << (u * 8), s = readU8() << (v * 8);
    const material = readU8(), edge = readU8();
    faces.push({ axis, sign, origin: [p, q, start], size: [r, s], material, edge });
    index += 4;
  }
  return { vertexCount, palette, slices, faces, packed, bytesRead: offset };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const file = process.argv[2]; if (!file) throw new Error("usage: node decode-engine-model.mjs <file>");
  const result = decodeVoxelMesh(fs.readFileSync(file));
  console.log(JSON.stringify(result ? { ...result, packed: undefined } : null, null, 2));
}
