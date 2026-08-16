export const fluidContactContract = Object.freeze({
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameEntity/input.md",
    "dao3-docs-mirror/markdown/api/GameEntity/physics.md",
    "origin/origin/origin/shell/ScriptShell.js",
    "origin/server-protocols.json",
    "Middleware/runtime-compat/abi/contact-event-model.json",
  ]),
  eventFields: Object.freeze(["tick", "entity", "voxel"]),
  dispatchOrder: Object.freeze(["world", "entity"]),
  activeContactFields: Object.freeze(["voxel", "volume"]),
  localVolume: "body-aabb-overlap-fraction",
  unsupported: Object.freeze(["native-fluid-producer-timing", "buoyancy", "drag", "native-volume-fraction-formula"]),
});
