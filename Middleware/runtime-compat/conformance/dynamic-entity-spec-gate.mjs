export const dynamicEntitySpecGateContract = Object.freeze({
  inventoryPolicy: "Every statically visible world.createEntity call is represented in the project Capability Manifest, including dynamic argument expressions.",
  projectionPolicy: "Only a statically resolved mesh with a captured and validated binding creates a launch-time authoritative projection requirement.",
  dynamicPolicy: "Dynamic specifications and dynamic mesh values remain partial and script-local unless the Runtime resolves a validated mesh at execution time.",
  prohibitedBehavior: Object.freeze(["fabricated mesh bounds", "fabricated geometry", "fabricated physics body", "unverified authoritative projection"]),
});
