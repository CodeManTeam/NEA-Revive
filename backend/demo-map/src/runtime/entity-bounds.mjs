import { GameBounds3 } from "./game-zones.mjs";
import { Vector3 } from "./vector3.mjs";

export function runtimeEntityBounds(entity) {
  const position = Vector3.from(entity.position);
  const halfExtents = entity.isPlayer === true && entity._body?.boundsHalfExtents
    ? Vector3.from(entity._body.boundsHalfExtents)
    : entity.bounds
      ? Vector3.from(entity.bounds)
      : null;
  if (!halfExtents) return null;
  return new GameBounds3(position.subtract(halfExtents), position.add(halfExtents));
}

export function searchRuntimeEntities(bounds, entities) {
  const query = bounds instanceof GameBounds3 ? bounds : new GameBounds3(bounds?.lo, bounds?.hi);
  return entities.filter(entity => {
    const entityBounds = runtimeEntityBounds(entity);
    return entityBounds !== null && query.intersects(entityBounds);
  });
}
