import { createGameInteractEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createInteractEventFixture(overrides = {}) {
  return createGameInteractEvent(
    overrides.tick ?? 31,
    overrides.entity ?? Object.freeze({ id: "player", name: "Player" }),
    overrides.targetEntity ?? Object.freeze({ id: "target" }),
  );
}
