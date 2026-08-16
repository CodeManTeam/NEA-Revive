export const gameEventHandlerTokenApiConformance = Object.freeze({
  canonicalType: "GameEventHandlerToken",
  compatible: Object.freeze(["cancel", "resume", "active"]),
  lifecycle: Object.freeze({
    cancel: "Marks the handler finished; active() becomes false and the record leaves the dispatcher queue after compaction.",
    resume: "Clears finished and requeues a removed record unless the dispatcher has been destroyed.",
    active: "Returns the inverse of the recovered finished flag.",
    destroy: "Marks queued records finished; later resume() is a no-op.",
  }),
  evidence: Object.freeze([
    "origin/origin/origin/api/GameEventHandlerToken.js",
    "origin/origin/origin/ScriptDispatcher.js",
    "Frontend/demo-map/src/runtime/event-signal.mjs",
    "local-player/archive/project/bedwars/client-runtime/assets/_next/static/chunks/734.8dcb480d99773395.js",
  ]),
});
