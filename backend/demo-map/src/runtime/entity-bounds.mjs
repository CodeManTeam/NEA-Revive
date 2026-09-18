import { GameBounds3 } from "./game-zones.mjs";
import { Vector3 } from "./vector3.mjs";

export function runtimeEntityBounds(entity) {
  const position = Vector3.from(entity.position);
  const halfExtents = entity.isPlayer === true && entity._body?.boundsHalfExtents
    ? Vector3.from(entity._body.boundsHalfExtents)
    : runtimeEntityHalfExtents(entity);
  if (!halfExtents) return null;
  return new GameBounds3(position.subtract(halfExtents), position.add(halfExtents));
}

export function runtimeEntityHalfExtents(entity) {
  if (!entity.bounds) return null;
  const bounds = Vector3.from(entity.bounds);
  if (entity._boundsModelSpace !== true) return bounds;
  const scale = entity.meshScale ? Vector3.from(entity.meshScale) : new Vector3(1, 1, 1);
  return new Vector3(
    bounds.x * Math.abs(scale.x) * 0.5,
    bounds.y * Math.abs(scale.y) * 0.5,
    bounds.z * Math.abs(scale.z) * 0.5,
  );
}

export function searchRuntimeEntities(bounds, entities) {
  const query = bounds instanceof GameBounds3 ? bounds : new GameBounds3(bounds?.lo, bounds?.hi);
  return entities.filter(entity => {
    const entityBounds = runtimeEntityBounds(entity);
    return entityBounds !== null && query.intersects(entityBounds);
  });
}
