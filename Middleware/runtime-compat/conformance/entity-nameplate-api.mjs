export const entityNameplateApiConformance = Object.freeze({
  canonicalApis: Object.freeze(["GameEntity.showEntityName", "GameEntity.customName", "GameEntity.nameRadius", "GameEntity.nameColor"]),
  defaults: Object.freeze({ showEntityName: false, customName: "", nameRadius: 16, nameColor: Object.freeze([1, 1, 1]) }),
  protocol: Object.freeze({ component: "state.entityName", fields: Object.freeze(["name", "radius", "color"]), deletion: "entityUpdates.deletedEntityName" }),
  localProjection: "RuntimeEntity -> loopback entity-state -> authoritative replica.nameplate -> Player entityName component",
  supportedOwner: "RuntimeEntity",
  unsupportedOwner: "RuntimePlayer",
  status: "partial",
});
