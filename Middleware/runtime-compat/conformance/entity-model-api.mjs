export const entityModelApiConformance = Object.freeze({
  canonicalApis: Object.freeze(["GameEntity.meshInvisible", "GameEntity.meshScale", "GameEntity.meshOrientation", "GameEntity.meshOffset", "GameEntity.meshColor", "GameEntity.meshMetalness", "GameEntity.meshEmissive", "GameEntity.meshShininess"]),
  protocolFields: Object.freeze(["invisible", "scaleX", "scaleY", "scaleZ", "offsetX", "offsetY", "offsetZ", "red", "green", "blue", "alpha", "emissive", "shininess", "metalness"]),
  dynamicMeshSwap: false,
  anchorOffset: "evidence-blocked",
  nestedMutationBridge: false,
  supportedOwner: "RuntimeEntity",
  unsupportedOwner: "RuntimePlayer",
  status: "partial",
});
