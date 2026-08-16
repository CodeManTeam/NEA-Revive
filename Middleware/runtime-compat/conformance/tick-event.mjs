import { createGameTickEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createTickEventFixture(overrides = {}) {
  return createGameTickEvent(
    overrides.tick ?? 35,
    overrides.prevTick ?? 33,
    overrides.elapsedTimeMS ?? 128,
    overrides.skip ?? true,
  );
}
