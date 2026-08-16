import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";

export function createRaycastResultFixture(overrides = {}) {
  return new RuntimeRaycastResult({
    hit: false,
    hitEntity: null,
    hitVoxel: 0,
    origin: new Vector3(1, 2, 3),
    direction: new Vector3(0, 0, 1),
    distance: Infinity,
    hitPosition: new Vector3(0, 0, 0),
    normal: new Vector3(0, 0, 0),
    voxelIndex: new Vector3(0, 0, 0),
    ...overrides,
  });
}
