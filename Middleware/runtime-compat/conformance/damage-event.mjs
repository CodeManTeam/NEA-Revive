import { createGameDamageEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createDamageEventFixture(overrides = {}) {
  return createGameDamageEvent(
    overrides.tick ?? 19,
    overrides.entity ?? Object.freeze({ id: "victim" }),
    overrides.damage ?? 12,
    overrides.attacker ?? Object.freeze({ id: "attacker" }),
    overrides.damageType ?? "melee",
  );
}
