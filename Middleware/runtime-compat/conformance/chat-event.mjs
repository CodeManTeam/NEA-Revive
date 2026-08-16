import { createGameChatEvent } from "../../../Frontend/demo-map/src/runtime/script-runtime.mjs";

export function createChatEventFixture(overrides = {}) {
  return createGameChatEvent(
    overrides.tick ?? 37,
    overrides.entity ?? Object.freeze({ id: "speaker" }),
    overrides.message ?? "hello",
  );
}
