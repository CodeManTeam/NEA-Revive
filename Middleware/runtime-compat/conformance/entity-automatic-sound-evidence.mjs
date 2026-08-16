export const entityAutomaticSoundEvidenceConformance = Object.freeze({
  canonicalProperties: Object.freeze([
    "GameEntity.chatSound",
    "GameEntity.hurtSound",
    "GameEntity.dieSound",
    "GameEntity.interactSound",
  ]),
  status: "evidence-blocked",
  confirmed: Object.freeze([
    "GameEntity initializes each property as GameSoundEffect",
    "ScriptEntitySync invokes SoundBinding for state.sound.entity and PlayerSoundBinding for state.sound.player",
    "GameSoundEffect declares sample, radius, gain, gainRange, pitch, and pitchRange defaults",
  ]),
  missing: Object.freeze([
    "SoundBinding and PlayerSoundBinding field mapping",
    "serialized update schema for each automatic sound property",
    "Player browser or authoritative backend consumer behavior",
    "interactSound recipient scoping",
  ]),
  prohibitedFallback: "Do not translate these persistent component properties into event-triggered entity.sound() calls.",
  evidence: Object.freeze([
    "origin/origin/origin/api/GameEntity.js",
    "origin/origin/origin/api/GameSoundEffect.js",
    "origin/origin/origin/sync/ScriptEntitySync.js",
    "dump/dump/view.goboxgame.com_734.8dcb480d99773395.js",
    "Middleware/runtime-compat/abi/protocols.json",
    "local-player/backend/box3-server.cjs",
  ]),
});
