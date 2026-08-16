import { playerLifecycleEventEvidence, refinePlayerLifecycleRequirement } from "../../../Frontend/demo-map/src/lifecycle-event-refinement.mjs";

export const playerLifecycleProjectRefinementConformance = Object.freeze({
  api: Object.freeze(["world.onPlayerJoin", "world.nextPlayerJoin", "world.onPlayerLeave", "world.nextPlayerLeave"]),
  payload: playerLifecycleEventEvidence.payload,
  historicalEvidence: playerLifecycleEventEvidence.historical,
  localEvidence: playerLifecycleEventEvidence.local,
  globalCompatibility: "partial",
  projectSubscriptionState: "ready",
  memberPolicy: "independently-gated",
});

export function projectLifecycleState(requirement) {
  return refinePlayerLifecycleRequirement(requirement).state;
}
