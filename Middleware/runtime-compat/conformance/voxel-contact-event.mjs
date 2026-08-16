import { createContactEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createVoxelContactEventFixture(overrides = {}) {
  const entity = overrides.entity ?? Object.freeze({ id: "entity" });
  const contact = {
    normal: overrides.axis ?? { x: 0, y: 1, z: 0 },
    force: overrides.force ?? { x: 0, y: 20, z: 0 },
    collider: Object.freeze({
      kind: "voxel",
      id: "voxel:1:2:3",
      x: overrides.x ?? 1,
      y: overrides.y ?? 2,
      z: overrides.z ?? 3,
      blockId: overrides.voxel ?? 631,
      tags: Object.freeze([]),
      material: Object.freeze({ friction: 0, restitution: 0 }),
    }),
  };
  return createContactEvent(overrides.tick ?? 7, entity, contact);
}
