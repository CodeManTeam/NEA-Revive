export function normalizeRecoveredEntityPlacement(value) {
  const components = Array.isArray(value) ? value : [value?.[0] ?? value?.x, value?.[1] ?? value?.y, value?.[2] ?? value?.z];
  if (components.length !== 3 || components.some(component => typeof component !== "number" || !Number.isFinite(component))) {
    throw new Error("Recovered entity position must be a finite three-dimensional vector");
  }
  return components;
}
