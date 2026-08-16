export const gameZoneContract = Object.freeze({
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameWorld/mapZone.md",
    "origin/origin/origin/api/GameZone.js",
    "origin/origin/origin/ScriptZoneWrapper.js",
    "origin/origin/origin/ScriptZoneSystem.js",
  ]),
  worldSurface: Object.freeze(["addZone", "removeZone", "zones"]),
  zoneMethods: Object.freeze(["entities", "onEnter", "nextEnter", "onLeave", "nextLeave", "remove"]),
  eventFields: Object.freeze(["tick", "entity"]),
  matchRules: Object.freeze({ selector: "normalized-cached-ParsedGameSelector", collides: "false-excluded", bounds: "entity-center-expanded-by-entity-bounds" }),
  unsupported: Object.freeze(["native-physics-selector", "zone-force-application", "client-environment-projection"]),
});
