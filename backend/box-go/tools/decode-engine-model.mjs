import fs from "node:fs";
import { MuReadStream } from "../../../Shared/mudb/stream/index.js";
import { MuASCII, MuArray, MuDictionary, MuFloat32, MuInt32, MuOption, MuStruct, MuUint8, MuUint16, MuUint32, MuUTF8, MuVarint, MuVector, MuUnion } from "../../../Shared/mudb/schema/index.js";

const UNLIMITED = Infinity;
const vec3 = () => new MuVector(new MuFloat32(), 3);
const vec4 = () => new MuVector(new MuFloat32(), 4);
const mat3 = () => new MuVector(new MuFloat32(), 9);
const meshTextureSchema = new MuStruct({
  palette: new MuArray(new MuUint32(), UNLIMITED),
  data: new MuArray(new MuVarint(), UNLIMITED),
  width: new MuVarint(),
});
const meshFaceSchema = new MuStruct({
  vertices: new MuArray(new MuVarint(), UNLIMITED),
  sizes: new MuArray(new MuVarint(), UNLIMITED),
  uvs: new MuArray(new MuVarint(), UNLIMITED),
  uvFlags: new MuArray(new MuUint8(), UNLIMITED),
});
const modelNodeSchema = new MuStruct({ id: new MuASCII(), type: new MuVarint(), name: new MuUTF8(), voxelId: new MuASCII(), parentId: new MuASCII(), childrenIds: new MuArray(new MuASCII(), UNLIMITED), skinId: new MuASCII(), boneId: new MuASCII(), alpha: new MuFloat32(1), pivot: vec3(), position: vec3(), quaternion: vec4(), euler: vec3(), flip: new MuVector(new MuUint8(), 3), scale: vec3(), parentScaleMat3: mat3() });
const voxelViewSchema = new MuStruct({ id: new MuASCII(), encodedView: new MuArray(new MuVarint(), UNLIMITED) });
const paletteItemSchema = new MuStruct({ id: new MuVarint(), rgb: new MuVector(new MuUint8(), 3), hsv: new MuVector(new MuUint16(), 3), material: new MuStruct({ emissive: new MuFloat32() }) });
const paletteGroupSchema = new MuStruct({ id: new MuASCII(), name: new MuUTF8(), itemIds: new MuArray(new MuUint16(), UNLIMITED) });
const paletteSchema = new MuStruct({ items: new MuArray(paletteItemSchema, UNLIMITED), groups: new MuDictionary(paletteGroupSchema, UNLIMITED), groupList: new MuArray(new MuASCII(), UNLIMITED) });
const animationOffsetSchema = new MuStruct({
  translation: new MuOption(vec3()),
  rotation: new MuOption(vec4()),
  scale: new MuOption(vec3()),
  alpha: new MuOption(new MuFloat32(1)),
});
const animationKeyframeSchema = new MuStruct({
  time: new MuASCII(),
  interpolation: new MuASCII("LINEAR"),
  offset: animationOffsetSchema,
});
const animationNodeSchema = new MuStruct({
  nodeId: new MuASCII(),
  keyframeList: new MuArray(animationKeyframeSchema, UNLIMITED),
});
const animationSchema = new MuStruct({
  id: new MuASCII(),
  name: new MuUTF8(),
  nodes: new MuDictionary(animationNodeSchema, UNLIMITED),
});
const modelV7Schema = new MuStruct({
  version: new MuVarint(7),
  nodes: new MuDictionary(modelNodeSchema, UNLIMITED),
  voxels: new MuDictionary(voxelViewSchema, UNLIMITED),
  palette: paletteSchema,
  animations: new MuArray(animationSchema, UNLIMITED),
});

// DAO3 engine mesh assets (v1-v3). These are distinct from model/v7 voxel
// containers: nodes reference compact mesh records and v3 carries its own
// palette texture plus six directional face streams per mesh.
const meshNodeSchema = new MuStruct({
  mesh: new MuInt32(-1),
  rotation: vec4(),
  translation: vec3(),
  children: new MuArray(new MuVarint(), UNLIMITED),
  alpha: new MuFloat32(1),
});
const meshNodesSchema = new MuArray(meshNodeSchema, UNLIMITED);
const meshBytesSchema = new MuArray(new MuUint8(), UNLIMITED);
const meshAssetV1Schema = new MuStruct({
  bounds: vec3(),
  meshes: new MuDictionary(meshBytesSchema, UNLIMITED),
});
const meshAssetV2Schema = new MuStruct({
  version: new MuVarint(2),
  bounds: vec3(),
  nodes: meshNodesSchema,
  meshes: new MuArray(meshBytesSchema, UNLIMITED),
});
const meshAssetV3Schema = new MuStruct({
  version: new MuVarint(3),
  bounds: vec3(),
  nodes: meshNodesSchema,
  texture: meshTextureSchema,
  meshes: new MuArray(new MuArray(meshFaceSchema, 6), UNLIMITED),
});
const meshAnimationUnion = new MuUnion({
  rotation: new MuArray(vec4(), UNLIMITED),
  translation: new MuArray(vec3(), UNLIMITED),
  alpha: new MuArray(new MuFloat32(), UNLIMITED),
  scale: new MuArray(vec3(), UNLIMITED),
});
const meshAnimationSamplerSchema = new MuStruct({
  input: new MuArray(new MuFloat32(), UNLIMITED),
  output: meshAnimationUnion,
  interpolation: new MuASCII("LINEAR"),
});
const meshAnimationChannelSchema = new MuStruct({
  sampler: new MuVarint(),
  target: new MuStruct({ node: new MuVarint(), path: new MuASCII() }),
});
const meshAnimationSchema = new MuStruct({
  id: new MuASCII(),
  name: new MuUTF8(),
  channels: new MuArray(meshAnimationChannelSchema, UNLIMITED),
  samplers: new MuArray(meshAnimationSamplerSchema, UNLIMITED),
});
const meshNodeV7Schema = new MuStruct({
  mesh: new MuInt32(-1),
  rotation: vec4(),
  translation: vec3(),
  scale: vec3(),
  parentScaleMat3: mat3(),
  children: new MuArray(new MuVarint(), UNLIMITED),
  alpha: new MuFloat32(1),
});
const meshAssetV7Schema = new MuStruct({
  version: new MuVarint(7),
  nodes: new MuArray(meshNodeV7Schema, UNLIMITED),
  texture: meshTextureSchema,
  meshes: new MuArray(new MuArray(meshFaceSchema, 6), UNLIMITED),
  animations: new MuArray(meshAnimationSchema, UNLIMITED),
});

export function decodeMeshAsset(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const stream = new MuReadStream(bytes);
  const marker = stream.readVarint();
  if (marker === 7) {
    const value = meshAssetV7Schema.patch(meshAssetV7Schema.identity, stream);
    return {
      format: "dao3-mesh/v7",
      version: 7,
      value,
      bytesRead: stream.offset,
      trailingBytes: stream.length - stream.offset,
    };
  }
  if (marker === 2 || marker === 3) {
    const schema = marker === 2 ? meshAssetV2Schema : meshAssetV3Schema;
    const value = schema.patch(schema.identity, stream);
    return { format: `dao3-mesh/v${marker}`, version: marker, value, bytesRead: stream.offset, trailingBytes: stream.length - stream.offset };
  }
  // v1 predates the explicit version field and starts directly with bounds.
  stream.offset = 0;
  const value = meshAssetV1Schema.patch(meshAssetV1Schema.identity, stream);
  return { format: "dao3-mesh/v1", version: 1, value, bytesRead: stream.offset, trailingBytes: stream.length - stream.offset };
}

// Expand the v3 indexed texture into an RGBA image suitable for direct GPU
// upload. DAO3 stores palette entries as packed 0xRRGGBBAA words and texture
// data as palette indices in row-major order.
export function decodeMeshTexture(texture) {
  const width = Number(texture?.width ?? 0);
  const palette = texture?.palette ?? [];
  const data = texture?.data ?? [];
  if (!width || !data.length) return { width: 0, height: 0, rgba: new Uint8Array() };
  const height = Math.ceil(data.length / width);
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const packed = Number(palette[Number(data[i] ?? 0)] ?? 0);
    rgba[i * 4] = (packed >>> 24) & 255;
    rgba[i * 4 + 1] = (packed >>> 16) & 255;
    rgba[i * 4 + 2] = (packed >>> 8) & 255;
    rgba[i * 4 + 3] = packed & 255;
  }
  return { width, height, rgba };
}

export function decodeModelV7(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const stream = new MuReadStream(bytes);
  const marker = stream.readVarint();
  if (marker !== 7) throw new Error(`unexpected dao3 model version ${String(marker)}`);
  const value = modelV7Schema.patch(modelV7Schema.identity, stream);
  if (Number(value.version) !== 7) {
    throw new Error(`unexpected dao3 model version ${String(value.version)}`);
  }
  return { value, bytesRead: stream.offset, trailingBytes: stream.length - stream.offset };
}

// Decoder for the compact DAO3 voxel mesh payload embedded in engine/m assets.
// The payload is little-endian and starts with int32 magic -11, followed by
// vertex count, palette count and slice count. Output vertices are packed as
// three uint32 words per corner (position/face, material and flags).
export function decodeVoxelMesh(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  // DAO3 v7 model containers start with a MuVarint version marker. Keep the
  // legacy decoder strict, but expose the marker so callers can route v7
  // assets to the schema-backed decoder instead of treating them as corrupt.
  if (bytes.length > 0 && bytes[0] === 7) {
    try {
      const decoded = decodeMeshAsset(bytes);
      return {
        format: decoded.format,
        version: decoded.version,
        bytes: bytes.length,
        bytesRead: decoded.bytesRead,
        trailingBytes: decoded.trailingBytes,
        nodeCount: decoded.value.nodes?.length ?? Object.keys(decoded.value.nodes ?? {}).length,
        meshCount: decoded.value.meshes?.length ?? 0,
        paletteItems: decoded.value.palette?.items?.length ?? 0,
      };
    } catch (error) {
      return { format: "dao3-model/v7", version: 7, bytes: bytes.length, decodeError: String(error) };
    }
  }
  if (bytes.length > 0 && bytes[0] >= 1 && bytes[0] <= 3) {
    try {
      const decoded = decodeMeshAsset(bytes);
      return {
        format: decoded.format,
        version: decoded.version,
        bytes: bytes.length,
        bytesRead: decoded.bytesRead,
        trailingBytes: decoded.trailingBytes,
        nodeCount: decoded.value.nodes?.length ?? 0,
        meshCount: decoded.value.meshes?.length ?? Object.keys(decoded.value.meshes ?? {}).length,
        textureWidth: decoded.value.texture?.width ?? 0,
      };
    } catch (error) {
      // Keep legacy probing behavior for non-mesh payloads.
    }
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const need = (count, label) => {
    if (offset + count > bytes.length) throw new Error(`truncated legacy voxel mesh while reading ${label}`);
  };
  const readI32 = () => { need(4, "magic"); const v = view.getInt32(offset, true); offset += 4; return v; };
  const readU8 = () => { need(1, "byte"); return bytes[offset++]; };
  const readVarint = () => {
    let shift = 0, out = 0;
    for (;;) { const b = readU8(); out |= (b & 127) << shift; if (!(b & 128)) return out >>> 0; shift += 7; }
  };
  if (readI32() !== -11) return null;
  const surfaceCount = readVarint();
  const paletteCount = readVarint();
  const sliceInfoCount = readVarint();
  const palette = {};
  for (let i = 0; i < paletteCount; i++) {
    const id = readU8();
    palette[id] = { rgb: [readU8(), readU8(), readU8()], pbr: [readU8(), readU8(), readU8()] };
  }
  const sliceInfo = [];
  for (let i = 0; i < sliceInfoCount / 2; i++) {
    sliceInfo.push({ axis: readU8(), count: readVarint() });
  }
  const surfaces = [];
  for (let i = 0; i < surfaceCount; i++) {
    need(6, "surface");
    surfaces.push(Array.from(bytes.slice(offset, offset + 6)));
    offset += 6;
  }
  return {
    format: "legacy-voxel-mesh",
    version: -11,
    surfaceCount,
    paletteCount,
    sliceInfoCount,
    palette,
    sliceInfo,
    surfaces,
    bytesRead: offset,
    trailingBytes: bytes.length - offset,
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const file = process.argv[2]; if (!file) throw new Error("usage: node decode-engine-model.mjs <file>");
  const result = decodeVoxelMesh(fs.readFileSync(file));
  console.log(JSON.stringify(result ? { ...result, packed: undefined } : null, null, 2));
}
