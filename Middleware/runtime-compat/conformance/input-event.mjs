import { createGameInputEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";

export function createInputEventFixture(overrides = {}) {
  const entity = overrides.entity ?? Object.freeze({ id: "player", isPlayer: true });
  const raycast = overrides.raycast ?? new RuntimeRaycastResult({
    hit: false,
    hitEntity: null,
    hitVoxel: 0,
    origin: new Vector3(0, 0, 0),
    direction: new Vector3(0, 0, 1),
    distance: Infinity,
    hitPosition: new Vector3(0, 0, 0),
    normal: new Vector3(0, 0, 0),
    voxelIndex: new Vector3(0, 0, 0),
  });
  return createGameInputEvent(overrides.tick ?? 13, entity, overrides.position ?? [1, 2, 3], overrides.button ?? "jump", overrides.pressed ?? true, raycast);
}
