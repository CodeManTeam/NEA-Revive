const PLAYER_LIFECYCLE_EVENTS = new Set([
  "server.GameWorld.onPlayerJoin",
  "server.GameWorld.nextPlayerJoin",
  "server.GameWorld.onPlayerLeave",
  "server.GameWorld.nextPlayerLeave",
]);

const SUBSET_GAP = /RuntimePlayer is still only a subset of GamePlayerEntity/i;

export function refinePlayerLifecycleRequirement(requirement) {
  if (requirement.state !== "partial" || !PLAYER_LIFECYCLE_EVENTS.has(requirement.canonicalId)) return requirement;
  return Object.freeze({
    ...requirement,
    state: "ready",
    reasons: Object.freeze([
      ...requirement.reasons.filter(reason => !SUBSET_GAP.test(reason)),
      "The recovered and local lifecycle producers both dispatch GameEntityEvent {tick, entity}; Capability Manifest gates every accessed GamePlayerEntity member separately, so this project does not require the unrecovered remainder of the player object.",
    ]),
  });
}

export const playerLifecycleEventEvidence = Object.freeze({
  historical: "origin/origin/origin/sync/ScriptWorldSync.js:_onEntityCreate/_onEntityDestroy",
  local: "Frontend/demo-map/src/runtime/script-runtime.mjs:player lifecycle dispatch",
  payload: Object.freeze(["tick", "entity"]),
});
