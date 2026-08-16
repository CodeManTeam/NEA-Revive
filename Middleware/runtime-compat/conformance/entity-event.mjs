import { createGameEntityEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createEntityEventFixture(overrides = {}) {
  return createGameEntityEvent(overrides.tick ?? 17, overrides.entity ?? Object.freeze({ id: "entity" }));
}
