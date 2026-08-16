import { overlapsOpen, playerAabb } from "./aabb.mjs";

const EPSILON = 1e-7;
const CHUNK_SIZE = 16;
const DEFAULT_MATERIAL = Object.freeze({ solid: true, friction: 8, restitution: 0, tags: Object.freeze([]) });

export class VoxelCollisionWorld {
  #chunks = new Map();
  #chunkCount = 0;
  #voxelIds = new Map();
  #materials = new Map();
  #fluidIds = new Set();
  #colliders = [];
  #triggers = [];
  #colliderChunks = new Map();
  #triggerChunks = new Map();
  #diagnostics = { sweeps: 0, chunkQueries: 0, candidates: 0, triggerQueries: 0, triggerCandidates: 0 };

  constructor(options = []) {
    const config = Array.isArray(options) ? { voxels: options } : options;
    for (const [id, material] of Object.entries(config.materials ?? {})) {
      this.#materials.set(String(id), normalizeMaterial(material));
    }
    for (const id of config.fluidIds ?? []) this.#fluidIds.add(Number(id));
    for (const voxel of config.voxels ?? []) {
      const [x, y, z] = voxel.position;
      const fullId = (voxel.blockId & 0x3fff) | (((voxel.rotation ?? 0) & 3) << 14);
      this.setVoxelId(x, y, z, fullId);
    }
    this.#colliders = (config.colliders ?? []).map(item => volumeCollider(item, this.materialFor(item.material)));
    this.#triggers = (config.triggers ?? []).map(item => volumeTrigger(item));
    // Colliders and triggers are static for the life of a world (there is no add/remove API),
    // so the chunk index is built once here instead of scanning the full flat list on every
    // sweep/queryTriggers call.
    this.#colliderChunks = buildVolumeChunkIndex(this.#colliders);
    this.#triggerChunks = buildVolumeChunkIndex(this.#triggers);
  }

  materialFor(id) {
    return this.#materials.get(String(id)) ?? DEFAULT_MATERIAL;
  }

  getVoxelId(x, y, z) {
    return getNested(this.#voxelIds, x, y, z) ?? 0;
  }

  setVoxelId(x, y, z, fullId) {
    const previous = getNested(this.#voxelIds, x, y, z) ?? 0;
    if (previous === fullId) return fullId;
    if (previous !== 0) this.#removeCollisionCell(x, y, z);
    if (fullId === 0) {
      deleteNested(this.#voxelIds, x, y, z);
      return 0;
    }
    setNested(this.#voxelIds, x, y, z, fullId);
    const blockId = fullId & 0x3fff;
    const material = this.materialFor(blockId);
    if (!material.solid || blockId === 0) return fullId;
    const cell = Object.freeze({
      kind: "voxel",
      id: key(x, y, z),
      x,
      y,
      z,
      blockId: fullId,
      min: Object.freeze({ x, y, z }),
      max: Object.freeze({ x: x + 1, y: y + 1, z: z + 1 }),
      material,
      tags: Object.freeze([]),
    });
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    let chunk = getNested(this.#chunks, chunkX, chunkY, chunkZ);
    if (!chunk) {
      chunk = [];
      setNested(this.#chunks, chunkX, chunkY, chunkZ, chunk);
      this.#chunkCount += 1;
    }
    chunk.push(cell);
    return fullId;
  }

  #removeCollisionCell(x, y, z) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    const chunk = getNested(this.#chunks, chunkX, chunkY, chunkZ);
    if (!chunk) return;
    const index = chunk.findIndex(cell => cell.x === x && cell.y === y && cell.z === z);
    if (index >= 0) chunk.splice(index, 1);
    if (chunk.length === 0) {
      deleteNested(this.#chunks, chunkX, chunkY, chunkZ);
      this.#chunkCount -= 1;
    }
  }

  sweep(body, axis, amount) {
    this.#diagnostics.sweeps += 1;
    if (!Number.isFinite(amount) || amount === 0) return Object.freeze({ amount: 0, collisions: Object.freeze([]) });
    const boundsBox = playerAabb(body.position, body.boundsHalfExtents ?? body.halfExtents);
    const shapeBox = playerAabb(body.position, body.shapeHalfExtents ?? body.halfExtents);
    const candidates = [
      ...this.#sweptVoxelCandidates(boundsBox, axis, amount),
      ...queryVolumeChunks(this.#colliderChunks, sweptBox(boundsBox, axis, amount)),
    ];
    this.#diagnostics.candidates += candidates.length;
    let allowed = amount;
    const hits = [];
    const upper = axis.toUpperCase();
    const boxMin = shapeBox[`min${upper}`];
    const boxMax = shapeBox[`max${upper}`];

    for (const collider of candidates) {
      if (!overlapsOtherAxes(shapeBox, collider, axis)) continue;
      const limit = movementLimit(boxMin, boxMax, collider, axis, amount);
      if (limit === undefined) continue;
      if (amount > 0 ? limit < allowed : limit > allowed) {
        allowed = limit;
        hits.length = 0;
        hits.push(collider);
      } else if (Math.abs(limit - allowed) <= EPSILON) {
        hits.push(collider);
      }
    }

    const normal = axisNormal(axis, amount);
    return Object.freeze({
      amount: Math.abs(allowed) <= EPSILON ? 0 : allowed,
      collisions: Object.freeze(hits.map(collider => Object.freeze({ collider, normal }))),
    });
  }

  queryTriggers(body) {
    this.#diagnostics.triggerQueries += 1;
    const box = playerAabb(body.position, body.shapeHalfExtents ?? body.halfExtents);
    const candidates = queryVolumeChunks(this.#triggerChunks, box);
    this.#diagnostics.triggerCandidates += candidates.length;
    return Object.freeze(candidates.filter(trigger => intersects(box, trigger)));
  }

  queryFluidContacts(body) {
    const box = playerAabb(body.position, body.shapeHalfExtents ?? body.halfExtents);
    const bodyVolume = Math.max(EPSILON, (box.maxX - box.minX) * (box.maxY - box.minY) * (box.maxZ - box.minZ));
    const contacts = [];
    for (let x = Math.floor(box.minX); x <= Math.floor(box.maxX - EPSILON); x += 1) {
      for (let y = Math.floor(box.minY); y <= Math.floor(box.maxY - EPSILON); y += 1) {
        for (let z = Math.floor(box.minZ); z <= Math.floor(box.maxZ - EPSILON); z += 1) {
          const voxel = this.getVoxelId(x, y, z);
          if (!this.#fluidIds.has(voxel & 0x3fff)) continue;
          const overlapX = Math.max(0, Math.min(box.maxX, x + 1) - Math.max(box.minX, x));
          const overlapY = Math.max(0, Math.min(box.maxY, y + 1) - Math.max(box.minY, y));
          const overlapZ = Math.max(0, Math.min(box.maxZ, z + 1) - Math.max(box.minZ, z));
          const volume = overlapX * overlapY * overlapZ / bodyVolume;
          if (volume <= 0) continue;
          contacts.push(Object.freeze({ id: `${x},${y},${z}`, voxel, volume }));
        }
      }
    }
    return Object.freeze(contacts);
  }

  querySolidContacts(body) {
    const box = playerAabb(body.position, body.shapeHalfExtents ?? body.halfExtents);
    const contacts = [];
    for (let x = Math.floor(box.minX); x <= Math.floor(box.maxX - EPSILON); x += 1) {
      for (let y = Math.floor(box.minY); y <= Math.floor(box.maxY - EPSILON); y += 1) {
        for (let z = Math.floor(box.minZ); z <= Math.floor(box.maxZ - EPSILON); z += 1) {
          const voxel = this.getVoxelId(x, y, z);
          const blockId = voxel & 0x3fff;
          if (blockId === 0 || !this.materialFor(blockId).solid) continue;
          const overlapX = Math.max(0, Math.min(box.maxX, x + 1) - Math.max(box.minX, x));
          const overlapY = Math.max(0, Math.min(box.maxY, y + 1) - Math.max(box.minY, y));
          const overlapZ = Math.max(0, Math.min(box.maxZ, z + 1) - Math.max(box.minZ, z));
          const volume = overlapX * overlapY * overlapZ;
          if (volume <= 0) continue;
          contacts.push(Object.freeze({ id: `${x},${y},${z}`, voxel, volume }));
        }
      }
    }
    return Object.freeze(contacts);
  }

  diagnostics() {
    return Object.freeze({
      ...this.#diagnostics,
      chunks: this.#chunkCount,
      colliders: this.#colliders.length,
      triggers: this.#triggers.length,
    });
  }

  #sweptVoxelCandidates(box, axis, amount) {
    const swept = sweptBox(box, axis, amount);
    const minX = Math.floor(swept.minX - EPSILON);
    const maxX = Math.floor(swept.maxX + EPSILON);
    const minY = Math.floor(swept.minY - EPSILON);
    const maxY = Math.floor(swept.maxY + EPSILON);
    const minZ = Math.floor(swept.minZ - EPSILON);
    const maxZ = Math.floor(swept.maxZ + EPSILON);
    const result = [];
    for (let chunkX = Math.floor(minX / CHUNK_SIZE); chunkX <= Math.floor(maxX / CHUNK_SIZE); chunkX += 1) {
      for (let chunkY = Math.floor(minY / CHUNK_SIZE); chunkY <= Math.floor(maxY / CHUNK_SIZE); chunkY += 1) {
        for (let chunkZ = Math.floor(minZ / CHUNK_SIZE); chunkZ <= Math.floor(maxZ / CHUNK_SIZE); chunkZ += 1) {
          this.#diagnostics.chunkQueries += 1;
          for (const voxel of getNested(this.#chunks, chunkX, chunkY, chunkZ) ?? []) {
            if (voxel.max.x < minX || voxel.min.x > maxX + 1) continue;
            if (voxel.max.y < minY || voxel.min.y > maxY + 1) continue;
            if (voxel.max.z < minZ || voxel.min.z > maxZ + 1) continue;
            result.push(voxel);
          }
        }
      }
    }
    return result;
  }
}

function normalizeMaterial(material = {}) {
  return Object.freeze({
    solid: material.solid !== false,
    friction: Number.isFinite(material.friction) ? material.friction : DEFAULT_MATERIAL.friction,
    restitution: Number.isFinite(material.restitution) ? material.restitution : DEFAULT_MATERIAL.restitution,
    tags: Object.freeze([...(material.tags ?? [])]),
  });
}

function volumeCollider(item, material) {
  return Object.freeze({
    kind: "collider",
    id: item.id,
    min: vectorObject(item.min),
    max: vectorObject(item.max),
    material,
    tags: Object.freeze([...(item.tags ?? [])]),
  });
}

function volumeTrigger(item) {
  return Object.freeze({
    kind: "trigger",
    id: item.id,
    min: vectorObject(item.min),
    max: vectorObject(item.max),
    material: item.material ?? null,
    tags: Object.freeze([...(item.tags ?? [])]),
  });
}

function vectorObject(value) {
  return Object.freeze({ x: value[0], y: value[1], z: value[2] });
}

function overlapsOtherAxes(box, collider, axis) {
  if (axis !== "x" && !overlapsOpen(box.minX, box.maxX, collider.min.x, collider.max.x)) return false;
  if (axis !== "y" && !overlapsOpen(box.minY, box.maxY, collider.min.y, collider.max.y)) return false;
  if (axis !== "z" && !overlapsOpen(box.minZ, box.maxZ, collider.min.z, collider.max.z)) return false;
  return true;
}

function movementLimit(min, max, collider, axis, amount) {
  const colliderMin = collider.min[axis];
  const colliderMax = collider.max[axis];
  if (amount > 0) {
    if (max > colliderMin + EPSILON || max + amount < colliderMin - EPSILON) return undefined;
    return colliderMin - max;
  }
  if (min < colliderMax - EPSILON || min + amount > colliderMax + EPSILON) return undefined;
  return colliderMax - min;
}

// The raw (unfloored) world-space AABB swept by moving `box` by `amount` along `axis`. Shared
// by voxel candidate gathering (which floors it to whole voxel cells) and the collider chunk
// query (which floors it to chunk coordinates), so a fast-moving body still finds colliders
// and voxels anywhere along its path this tick, not just at its current position.
function sweptBox(box, axis, amount) {
  const moved = { ...box };
  const upper = axis.toUpperCase();
  moved[`min${upper}`] += amount;
  moved[`max${upper}`] += amount;
  return {
    minX: Math.min(box.minX, moved.minX), maxX: Math.max(box.maxX, moved.maxX),
    minY: Math.min(box.minY, moved.minY), maxY: Math.max(box.maxY, moved.maxY),
    minZ: Math.min(box.minZ, moved.minZ), maxZ: Math.max(box.maxZ, moved.maxZ),
  };
}

function chunkRange(minX, maxX, minY, maxY, minZ, maxZ) {
  return {
    minX: Math.floor(minX / CHUNK_SIZE), maxX: Math.floor((maxX - EPSILON) / CHUNK_SIZE),
    minY: Math.floor(minY / CHUNK_SIZE), maxY: Math.floor((maxY - EPSILON) / CHUNK_SIZE),
    minZ: Math.floor(minZ / CHUNK_SIZE), maxZ: Math.floor((maxZ - EPSILON) / CHUNK_SIZE),
  };
}

// Colliders and triggers are static AABB volumes that may span multiple chunks, so each one is
// referenced from every chunk cell it overlaps (unlike a voxel, which belongs to exactly one).
function buildVolumeChunkIndex(volumes) {
  const index = new Map();
  for (const volume of volumes) {
    const range = chunkRange(volume.min.x, volume.max.x, volume.min.y, volume.max.y, volume.min.z, volume.max.z);
    for (let chunkX = range.minX; chunkX <= range.maxX; chunkX += 1) {
      for (let chunkY = range.minY; chunkY <= range.maxY; chunkY += 1) {
        for (let chunkZ = range.minZ; chunkZ <= range.maxZ; chunkZ += 1) {
          let chunk = getNested(index, chunkX, chunkY, chunkZ);
          if (!chunk) {
            chunk = [];
            setNested(index, chunkX, chunkY, chunkZ, chunk);
          }
          chunk.push(volume);
        }
      }
    }
  }
  return index;
}

// Collects the volumes overlapping `box`'s chunk range, deduplicated (a volume spanning
// multiple chunks would otherwise be returned once per chunk it is referenced from).
function queryVolumeChunks(index, box) {
  const range = chunkRange(box.minX, box.maxX, box.minY, box.maxY, box.minZ, box.maxZ);
  const seen = new Set();
  const result = [];
  for (let chunkX = range.minX; chunkX <= range.maxX; chunkX += 1) {
    for (let chunkY = range.minY; chunkY <= range.maxY; chunkY += 1) {
      for (let chunkZ = range.minZ; chunkZ <= range.maxZ; chunkZ += 1) {
        for (const volume of getNested(index, chunkX, chunkY, chunkZ) ?? []) {
          if (seen.has(volume)) continue;
          seen.add(volume);
          result.push(volume);
        }
      }
    }
  }
  return result;
}

function intersects(box, volume) {
  return overlapsOpen(box.minX, box.maxX, volume.min.x, volume.max.x)
    && overlapsOpen(box.minY, box.maxY, volume.min.y, volume.max.y)
    && overlapsOpen(box.minZ, box.maxZ, volume.min.z, volume.max.z);
}

function axisNormal(axis, amount) {
  const value = amount > 0 ? -1 : 1;
  return Object.freeze({ x: axis === "x" ? value : 0, y: axis === "y" ? value : 0, z: axis === "z" ? value : 0 });
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

// Coordinates are unbounded (the world shape may grow past today's limit), so cells are
// indexed through nested integer-keyed Maps instead of a bound-dependent packed number or
// a per-lookup string key.
function getNested(map, x, y, z) {
  return map.get(x)?.get(y)?.get(z);
}

function setNested(map, x, y, z, value) {
  let byY = map.get(x);
  if (!byY) {
    byY = new Map();
    map.set(x, byY);
  }
  let byZ = byY.get(y);
  if (!byZ) {
    byZ = new Map();
    byY.set(y, byZ);
  }
  byZ.set(z, value);
}

function deleteNested(map, x, y, z) {
  const byY = map.get(x);
  if (!byY) return;
  const byZ = byY.get(y);
  if (!byZ) return;
  byZ.delete(z);
  if (byZ.size === 0) byY.delete(y);
  if (byY.size === 0) map.delete(x);
}
