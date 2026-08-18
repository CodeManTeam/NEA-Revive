export const VOXEL_TYPE_MASK = 0x3fff;
export const VOXEL_ROTATION_SHIFT = 14;

const STRING_ROTATIONS = new Map([
  ["north", 0], ["n", 0], ["0", 0],
  ["south", 1], ["s", 1], ["1", 1],
  ["east", 2], ["e", 2], ["2", 2],
  ["west", 3], ["w", 3], ["3", 3],
]);

export class GameVoxelsRuntime {
  #collisionWorld;
  #shape;
  #idsByName = new Map();
  #namesById = new Map();
  #fluidIds = new Set();
  #onVoxelChange;

  constructor({ shape, catalog, collisionWorld, onVoxelChange }) {
    if (!Array.isArray(shape) || shape.length !== 3 || shape.some(value => !Number.isInteger(value) || value < 1)) {
      throw new Error("GameVoxelsRuntime requires a positive integer three-dimensional shape");
    }
    if (!Array.isArray(catalog) || catalog.length === 0) throw new Error("GameVoxelsRuntime requires a BlockInfo catalog");
    if (!collisionWorld) throw new Error("GameVoxelsRuntime requires a collision world");
    this.#shape = Object.freeze({ x: shape[0] - 1, y: shape[1] - 1, z: shape[2] - 1 });
    this.#collisionWorld = collisionWorld;
    this.#onVoxelChange = typeof onVoxelChange === "function" ? onVoxelChange : () => {};
    for (const entry of catalog) {
      if (!Number.isInteger(entry?.id) || typeof entry?.name !== "string") throw new Error("Invalid BlockInfo catalog entry");
      this.#idsByName.set(entry.name, entry.id);
      this.#namesById.set(entry.id, entry.name);
      if (entry.fluid === true) this.#fluidIds.add(entry.id);
    }
    this.shape = this.#shape;
    this.VoxelTypes = [...this.#idsByName.keys()].sort();
    this.id = this.id.bind(this);
    this.name = this.name.bind(this);
    this.getVoxel = this.getVoxel.bind(this);
    this.getVoxelRotation = this.getVoxelRotation.bind(this);
    this.setVoxelId = this.setVoxelId.bind(this);
    this.getVoxelId = this.getVoxelId.bind(this);
    this.isFluid = this.isFluid.bind(this);
    this.setVoxel = this.setVoxel.bind(this);
  }

  id(name) {
    if (typeof name !== "string" || !this.#idsByName.has(name)) return 0;
    return this.#idsByName.get(name) | 0;
  }

  name(id) {
    if (typeof id !== "number" || !this.#isValidVoxelType(id)) return "";
    return String(this.#namesById.get(id & VOXEL_TYPE_MASK));
  }

  getVoxel(x, y, z) {
    return this.getVoxelId(x, y, z) & VOXEL_TYPE_MASK;
  }

  getVoxelRotation(x, y, z) {
    return this.getVoxelId(x, y, z) >>> VOXEL_ROTATION_SHIFT;
  }

  getVoxelId(x, y, z) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    if (!this.#inBounds(ix, iy, iz)) return 0;
    return this.#collisionWorld.getVoxelId(ix, iy, iz);
  }

  isFluid(id) {
    return typeof id === "number" && this.#fluidIds.has(id & VOXEL_TYPE_MASK);
  }

  setVoxelId(x, y, z, voxel) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fullId = voxel | 0;
    if (!this.#inBounds(ix, iy, iz) || !this.#isValidVoxelType(fullId)) return 0;
    const previousId = this.#collisionWorld.getVoxelId(ix, iy, iz);
    if (previousId === fullId) return fullId;
    this.#collisionWorld.setVoxelId(ix, iy, iz, fullId);
    this.#onVoxelChange(Object.freeze({ x: ix, y: iy, z: iz, voxel: fullId, previousVoxel: previousId }));
    return fullId;
  }

  setVoxel(x, y, z, voxel, rotation) {
    const baseId = typeof voxel === "string" ? this.id(voxel) : this.#numericBaseId(voxel);
    const fullId = baseId | (this.#rotation(rotation || 0) << VOXEL_ROTATION_SHIFT);
    return this.setVoxelId(x | 0, y | 0, z | 0, fullId);
  }

  #numericBaseId(voxel) {
    const baseId = voxel & VOXEL_TYPE_MASK;
    return this.#isValidVoxelType(baseId) ? baseId : 0;
  }

  #rotation(rotation) {
    if (typeof rotation === "number") return rotation & 3;
    return STRING_ROTATIONS.get(rotation) ?? 0;
  }

  #isValidVoxelType(fullId) {
    return this.#namesById.has(fullId & VOXEL_TYPE_MASK);
  }

  #inBounds(x, y, z) {
    // World coordinates are 0..shape-1 inclusive. A 256-wide world must allow
    // x=255 (the outermost column) — the recovered chunk layout is
    // chunkCount * chunkSize = shape exactly, so the last layer is real terrain
    // that map scripts must be able to read and write (parkour fixtures read
    // and place blocks at the map edge).
    return (
      x >= 0 &&
      y >= 0 &&
      z >= 0 &&
      x <= this.#shape.x &&
      y <= this.#shape.y &&
      z <= this.#shape.z
    );
  }
}
