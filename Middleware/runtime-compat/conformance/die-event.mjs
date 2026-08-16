import { createGameDieEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createDieEventFixture(overrides = {}) {
  return createGameDieEvent(
    overrides.tick ?? 23,
    overrides.entity ?? Object.freeze({ id: "victim" }),
    overrides.attacker ?? Object.freeze({ id: "attacker" }),
    overrides.damageType ?? "melee",
  );
}
