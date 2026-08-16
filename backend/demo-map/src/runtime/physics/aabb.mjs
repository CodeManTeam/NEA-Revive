export function playerAabb(position, halfExtents) {
  return Object.freeze({
    minX: position.x - halfExtents.x,
    maxX: position.x + halfExtents.x,
    minY: position.y - halfExtents.y,
    maxY: position.y + halfExtents.y,
    minZ: position.z - halfExtents.z,
    maxZ: position.z + halfExtents.z,
  });
}

export function overlapsOpen(aMin, aMax, bMin, bMax, epsilon = 1e-9) {
  return aMax > bMin + epsilon && aMin < bMax - epsilon;
}
