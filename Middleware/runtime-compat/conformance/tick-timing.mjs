export const tickTimingContract = Object.freeze({
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameWorld/mapInfo.md",
    "origin/origin/origin/shell/ScriptShell.js",
  ]),
  elapsedTimeMS: "Date.now() - previousDispatchMS",
  skip: "tick - prevTick > 1",
  localScheduler: "one-tick-per-callback",
  unresolved: Object.freeze(["authoritative-multi-tick-frame-ingress", "native-catch-up-scheduling"]),
});
