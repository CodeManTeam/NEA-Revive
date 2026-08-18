export function normalizeWorldSpawn(value) {
  const components = Array.isArray(value) ? value.slice(0, 3) : [value?.[0] ?? value?.x, value?.[1] ?? value?.y, value?.[2] ?? value?.z];
  if (components.length !== 3 || components.some(component => typeof component !== "number" || !Number.isFinite(component))) {
    throw new Error("World spawn must be a finite three-dimensional vector");
  }
  return components;
}

export function normalizeWorldSpawnWithinShape(value, shape) {
  const spawn = normalizeWorldSpawn(value);
  if (!Array.isArray(shape) || shape.length !== 3 || shape.some(component => !Number.isFinite(component) || component <= 0)) {
    throw new Error("World shape must be a positive three-dimensional vector");
  }
  return spawn;
}
