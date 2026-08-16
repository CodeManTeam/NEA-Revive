export const capabilityChainResolutionContract = Object.freeze({
  supportedChains: Object.freeze([
    "GameChatEvent.player -> GamePlayerEntity",
    "GameEntity.player -> GamePlayerEntity",
    "GameInteractEvent.entity -> GamePlayerEntity",
    "GameInteractEvent.targetEntity -> GameEntity",
    "world.querySelector(...) -> GameEntity",
  ]),
  localExtensionClassification: "A local executable member with no canonical declaration is reported as extension even when its implementation strategy is emulated.",
  dynamicMemberPolicy: "Non-literal computed members block launch because their ABI dependency cannot be proven statically.",
});
