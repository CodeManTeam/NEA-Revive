export const soundApiConformance = Object.freeze({
  canonicalApis: Object.freeze([
    "GameWorld.sound",
    "GameEntity.sound",
    "Sound.resume",
    "Sound.setCurrentTime",
    "Sound.pause",
    "Sound.stop",
  ]),
  status: "partial",
  positions: Object.freeze(["global", "position", "entity", "player"]),
  controls: Object.freeze(["resume", "setCurrentTimeAndResume", "setCurrentTime", "pause", "stop"]),
  guarantees: Object.freeze([
    "samples resolve only through the packaged bootstrap sound dictionary",
    "entity and player targets require real backend ids",
    "historical gain, pitch, and radius defaults and validation are preserved",
  ]),
  gaps: Object.freeze([
    "browser decode and playback completion are not acknowledged",
    "ClientAudio.mediaError is not transported to the Server Runtime",
    "script-local entities cannot produce fabricated spatial audio targets",
  ]),
  evidence: Object.freeze([
    "origin/origin/origin/sync/ScriptWorldSync.js",
    "origin/origin/origin/sync/ScriptEntitySync.js",
    "origin/origin/origin/shell/ScriptShell.js",
    "origin/origin/origin/api/Sound.js",
    "Middleware/runtime-compat/abi/protocols.json",
    "local-player/backend/box3-server.cjs",
  ]),
});
