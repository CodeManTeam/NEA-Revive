export const selectorCapabilityRefinementContract = Object.freeze({
  globallyPartialApi: Object.freeze(["server.GameWorld.querySelector", "server.GameWorld.querySelectorAll", "server.GameWorld.testSelector"]),
  projectReadyTokens: Object.freeze(["*", "entity", "player", ".tag", "#id"]),
  projectPartialInputs: Object.freeze(["dynamic expression", "unknown bare component", "escaped or multiline literal", "whitespace-bearing id/tag token"]),
  policy: "Project readiness may refine a global partial API only when every call statically avoids the unrecovered testComponent path.",
});
