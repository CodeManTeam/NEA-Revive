import { createGameClickEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";
import { RuntimeRaycastResult } from "../../../Frontend/demo-map/src/runtime/game-raycast.mjs";
import { Vector3 } from "../../../Frontend/demo-map/src/runtime/vector3.mjs";

export function createClickEventFixture(overrides = {}) {
  const entity = overrides.entity ?? Object.freeze({ id: "clicked" });
  const clicker = overrides.clicker ?? Object.freeze({ id: "clicker", isPlayer: true });
  const raycast = overrides.raycast ?? new RuntimeRaycastResult({
    hit: true,
    hitEntity: entity,
    hitVoxel: 0,
    origin: new Vector3(0, 0, 0),
    direction: new Vector3(1, 0, 0),
    distance: 3,
    hitPosition: new Vector3(3, 0, 0),
    normal: new Vector3(-1, 0, 0),
    voxelIndex: new Vector3(0, 0, 0),
  });
  return createGameClickEvent(overrides.tick ?? 11, entity, clicker, overrides.button ?? "action0", overrides.distance ?? 3, overrides.clickerPosition ?? [0, 0, 0], raycast);
}
