import { createGameRespawnEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createRespawnEventFixture(overrides = {}) {
  return createGameRespawnEvent(
    overrides.tick ?? 29,
    overrides.entity ?? Object.freeze({ id: "player", name: "Player" }),
  );
}
