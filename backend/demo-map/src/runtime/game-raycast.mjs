import { Vector3 } from "./vector3.mjs";

import { runtimeEntityBounds } from "./entity-bounds.mjs";

const EPSILON = 1e-7;

export class RuntimeRaycastResult {
  constructor({ hit, hitEntity, hitVoxel, origin, direction, distance, hitPosition, normal, voxelIndex }) {
    this.hit = hit;
    this.hitEntity = hitEntity;
    this.hitVoxel = hitVoxel;
    this.voxel = hitVoxel;
    this.origin = origin;
    this.direction = direction;
    this.distance = distance;
    this.hitPosition = hitPosition;
    this.normal = normal;
    this.voxelIndex = voxelIndex;
  }
}

export function raycastWorld({ origin, direction, options = {}, voxels, entities = [], matchesSelector = () => false }) {
  const rayOrigin = Vector3.from(origin);
  const rawDirection = Vector3.from(direction);
  const rayDirection = rawDirection.sqrMag() > 1e-16 ? rawDirection.normalize() : rawDirection;
  const maxDistance = resolveMaxDistance(options?.maxDistance);
  const voxelHit = options?.ignoreVoxel === true
    ? null
    : raycastVoxels(rayOrigin, rayDirection, maxDistance, voxels, options?.ignoreFluid === true);
  const entityHit = options?.ignoreEntities === true
    ? null
    : raycastEntities(rayOrigin, rayDirection, maxDistance, entities, options?.ignoreSelector, matchesSelector);
  const nearest = nearestHit(voxelHit, entityHit);
  const distance = nearest?.distance ?? maxDistance;
  const hitPosition = nearest?.position ?? new Vector3(0, 0, 0);
  const hitVoxel = nearest?.kind === "voxel" ? nearest.voxel : 0;
  return new RuntimeRaycastResult({
    hit: nearest !== null,
    hitEntity: nearest?.kind === "entity" ? nearest.entity : null,
    hitVoxel,
    origin: rayOrigin,
    direction: rayDirection,
    distance,
    hitPosition,
    normal: nearest?.normal ?? new Vector3(0, 0, 0),
    voxelIndex: nearest?.kind === "voxel" ? nearest.index : new Vector3(0, 0, 0),
  });
}

function raycastVoxels(origin, direction, maxDistance, voxels, ignoreFluid) {
  const worldExitDistance = rayBoxExitDistance(origin, direction, voxels.shape);
  if (worldExitDistance === null) return null;
  const traversalLimit = Math.min(maxDistance, worldExitDistance);
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  let tMaxX = axisBoundaryDistance(origin.x, direction.x, x, stepX);
  let tMaxY = axisBoundaryDistance(origin.y, direction.y, y, stepY);
  let tMaxZ = axisBoundaryDistance(origin.z, direction.z, z, stepZ);
  const tDeltaX = axisDelta(direction.x);
  const tDeltaY = axisDelta(direction.y);
  const tDeltaZ = axisDelta(direction.z);
  let distance = 0;
  let normal = new Vector3(0, 0, 0);

  while (distance <= traversalLimit + EPSILON) {
    const voxel = voxels.getVoxelId(x, y, z);
    if (voxel !== 0 && (!ignoreFluid || !voxels.isFluid(voxel))) {
      return {
        kind: "voxel",
        voxel,
        index: new Vector3(x, y, z),
        distance,
        normal,
        position: origin.add(direction.scale(distance)),
      };
    }
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      distance = tMaxX;
      tMaxX += tDeltaX;
      x += stepX;
      normal = new Vector3(-stepX, 0, 0);
    } else if (tMaxY <= tMaxZ) {
      distance = tMaxY;
      tMaxY += tDeltaY;
      y += stepY;
      normal = new Vector3(0, -stepY, 0);
    } else {
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      z += stepZ;
      normal = new Vector3(0, 0, -stepZ);
    }
    if (!Number.isFinite(distance)) break;
  }
  return null;
}

function raycastEntities(origin, direction, maxDistance, entities, ignoreSelector, matchesSelector) {
  let nearest = null;
  for (const entity of entities) {
    if (!entity || entity.destroyed === true) continue;
    if (ignoreSelector !== undefined && ignoreSelector !== null && matchesSelector(entity, ignoreSelector)) continue;
    const bounds = entityBounds(entity);
    if (!bounds) continue;
    const distance = intersectAabb(origin, direction, bounds.min, bounds.max);
    if (distance === null || distance <= EPSILON || distance > maxDistance + EPSILON) continue;
    if (!nearest || distance < nearest.distance) {
      nearest = {
        kind: "entity",
        entity,
        distance,
        position: origin.add(direction.scale(distance)),
        normal: aabbNormal(origin.add(direction.scale(distance)), bounds.min, bounds.max),
      };
    }
  }
  return nearest;
}

function entityBounds(entity) {
  const bounds = runtimeEntityBounds(entity);
  return bounds ? { min: bounds.lo, max: bounds.hi } : null;
}

function intersectAabb(origin, direction, min, max) {
  let near = -Infinity;
  let far = Infinity;
  for (const axis of ["x", "y", "z"]) {
    if (Math.abs(direction[axis]) <= EPSILON) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    const first = (min[axis] - origin[axis]) / direction[axis];
    const second = (max[axis] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  if (far < 0) return null;
  return near >= 0 ? near : 0;
}

function aabbNormal(position, min, max) {
  const faces = [
    [Math.abs(position.x - min.x), new Vector3(-1, 0, 0)],
    [Math.abs(position.x - max.x), new Vector3(1, 0, 0)],
    [Math.abs(position.y - min.y), new Vector3(0, -1, 0)],
    [Math.abs(position.y - max.y), new Vector3(0, 1, 0)],
    [Math.abs(position.z - min.z), new Vector3(0, 0, -1)],
    [Math.abs(position.z - max.z), new Vector3(0, 0, 1)],
  ];
  faces.sort((a, b) => a[0] - b[0]);
  return faces[0][1];
}

function nearestHit(voxelHit, entityHit) {
  if (!voxelHit) return entityHit;
  if (!entityHit) return voxelHit;
  return entityHit.distance < voxelHit.distance ? entityHit : voxelHit;
}

function axisBoundaryDistance(origin, direction, cell, step) {
  if (step === 0) return Infinity;
  const boundary = step > 0 ? cell + 1 : cell;
  return (boundary - origin) / direction;
}

function axisDelta(direction) {
  return Math.abs(direction) <= EPSILON ? Infinity : Math.abs(1 / direction);
}

function rayBoxExitDistance(origin, direction, shape) {
  let near = -Infinity;
  let far = Infinity;
  for (const axis of ["x", "y", "z"]) {
    if (Math.abs(direction[axis]) <= EPSILON) {
      if (origin[axis] < 0 || origin[axis] >= shape[axis]) return null;
      continue;
    }
    const first = -origin[axis] / direction[axis];
    const second = (shape[axis] - origin[axis]) / direction[axis];
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  return far < 0 ? null : far;
}

function resolveMaxDistance(value) {
  if (value !== undefined) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      throw new RangeError("GameWorld.raycast maxDistance must be a non-negative number");
    }
    return value;
  }
  return Infinity;
}
