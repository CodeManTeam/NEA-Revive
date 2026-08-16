import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const schema = require("../../../Shared/mudb/schema");
const { MuReadStream } = require("../../../Shared/mudb/stream");
const UNLIMITED = 0xffffffff;
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const ARCHIVE_JSON_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.json$/;

class RelativeArray {
  constructor(itemSchema, capacity, identity) {
    this.itemSchema = itemSchema;
    this.capacity = capacity;
    this.arraySchema = new schema.MuArray(itemSchema, capacity, identity);
    this.identity = this.arraySchema.identity;
  }

  clone(value) {
    return this.arraySchema.clone(value);
  }

  patch(base, input) {
    const result = this.clone(base);
    const length = input.readUint32();
    if (length > this.capacity) throw new RangeError(`target length ${length} exceeds capacity ${this.capacity}`);
    result.length = length;
    let trackerOffset = input.offset;
    input.offset += Math.ceil(length / 8);
    input.checkBounds();
    let tracker = 0;
    let previous = base.length > 0 ? base[0] : this.itemSchema.identity;
    for (let index = 0; index < length; index += 1) {
      const bit = index & 7;
      if (bit === 0) tracker = input.readUint8At(trackerOffset++);
      result[index] = tracker & (1 << bit)
        ? this.itemSchema.patch(previous, input)
        : this.itemSchema.clone(previous);
      previous = result[index];
    }
    return result;
  }
}

const hashSchema = new schema.MuUTF8();
const blockInfoSchema = new schema.MuStruct({
  ids: new RelativeArray(new schema.MuRelativeVarint(), UNLIMITED, [0]),
  names: new schema.MuArray(new schema.MuUTF8(), UNLIMITED, ["air"]),
  emissive: new RelativeArray(new schema.MuVarint(), UNLIMITED, [0]),
  texture: new RelativeArray(new schema.MuRelativeVarint(), UNLIMITED, [0, 0, 0, 0, 0, 0]),
  animLength: new RelativeArray(new schema.MuVarint(1), UNLIMITED, [1, 1, 1, 1, 1, 1]),
  friction: new RelativeArray(new schema.MuQuantizedFloat(1 / 256, 1), UNLIMITED, [0]),
  restitution: new RelativeArray(new schema.MuQuantizedFloat(1 / 256, 0), UNLIMITED, [0]),
  velocity: new RelativeArray(new schema.MuFloat32(0), UNLIMITED, [0, 0, 0]),
  fluids: new schema.MuArray(new schema.MuStruct({
    id: new schema.MuVarint(),
    info: new schema.MuUint32(),
    mass: new schema.MuFloat64(1),
  }), UNLIMITED, [{ id: 0, info: 0, mass: 0 }]),
  category: new schema.MuDictionary(
    new RelativeArray(new schema.MuRelativeVarint(), UNLIMITED),
    UNLIMITED,
    { default: [0] },
  ),
  atlasRadius: new schema.MuVarint(16),
  blockBumpShift: new schema.MuVarint(6),
  blockColorShift: new schema.MuVarint(4),
  colorAtlas: new schema.MuArray(hashSchema, UNLIMITED),
  materialAtlas: new schema.MuArray(hashSchema, UNLIMITED),
  bumpAtlas: new schema.MuArray(hashSchema, UNLIMITED),
});

export function decodeBlockCatalog(bytes) {
  return decodeBlockCatalogMetadata(bytes).catalog;
}

export function decodeBlockCatalogMetadata(bytes) {
  const input = new MuReadStream(bytes);
  const value = blockInfoSchema.patch(blockInfoSchema.identity, input);
  if (input.offset !== input.length) throw new Error(`Block info has ${input.length - input.offset} trailing bytes`);
  if (value.ids.length !== value.names.length) throw new Error("Block info ids and names have inconsistent lengths");
  const fluidIds = new Set(value.fluids.map(fluid => fluid.id).filter(id => id !== 0));
  const seenIds = new Set();
  const seenNames = new Set();
  const entries = value.ids.map((id, index) => {
    const name = value.names[index];
    if (!Number.isInteger(id) || id < 0 || id > 4095) throw new Error(`Invalid block id: ${id}`);
    if (typeof name !== "string" || name.length === 0) throw new Error(`Invalid block name at index ${index}`);
    if (seenIds.has(id)) throw new Error(`Duplicate block id: ${id}`);
    if (seenNames.has(name)) throw new Error(`Duplicate block name: ${name}`);
    seenIds.add(id);
    seenNames.add(name);
    const textures = value.texture.slice(index * 6, index * 6 + 6);
    return Object.freeze(fluidIds.has(id) ? { id, name, textures, fluid: true } : { id, name, textures });
  });
  return Object.freeze({
    catalog: Object.freeze(entries),
    atlas: Object.freeze({
      radius: value.atlasRadius,
      color: Object.freeze(value.colorAtlas.slice()),
      material: Object.freeze(value.materialAtlas.slice()),
      bump: Object.freeze(value.bumpAtlas.slice()),
      blockBumpShift: value.blockBumpShift,
      blockColorShift: value.blockColorShift,
    }),
  });
}

export async function loadPreservedBlockCatalog(assetRoot, manifestName) {
  return (await loadPreservedBlockCatalogMetadata(assetRoot, manifestName)).catalog;
}

export async function loadPreservedBlockCatalogMetadata(assetRoot, manifestName) {
  if (typeof manifestName !== "string" || !ARCHIVE_JSON_PATH.test(manifestName) || manifestName.includes("\\")) {
    throw new Error("A world manifest must be an archive-relative JSON path");
  }
  const root = resolve(assetRoot);
  const manifest = JSON.parse(await readFile(resolve(root, manifestName), "utf8"));
  const contentAddress = manifest?.provenance?.blockInfo;
  if (!CID_V0.test(contentAddress ?? "")) throw new Error("World manifest does not contain a valid BlockInfo CIDv0");
  const resetCounter = optionalResetCounter(manifest?.resetCounter);
  const innerAO = optionalBoolean(manifest?.innerAO, "innerAO");
  const bytes = await readFile(resolve(root, "block", contentAddress));
  return Object.freeze({ contentAddress, resetCounter, innerAO, catalog: decodeBlockCatalog(bytes) });
}

function optionalResetCounter(value) {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw new Error("World manifest resetCounter must be a uint32");
  return value;
}

function optionalBoolean(value, field) {
  if (value === undefined) return null;
  if (typeof value !== "boolean") throw new Error(`World manifest ${field} must be a boolean`);
  return value;
}
