export const worldSearchBoxApiConformance = Object.freeze({
  canonicalApi: "GameWorld.searchBox",
  signature: Object.freeze({ parameters: ["GameBounds3"], returns: "GameEntity[]" }),
  geometry: "axis-aligned overlap using body-center half extents",
  includes: Object.freeze(["RuntimeEntity", "RuntimePlayer"]),
  status: "partial",
  gaps: Object.freeze(["native oriented-body search is unavailable", "GameWorld.useOBB is not implemented"]),
  evidence: Object.freeze([
    "dao3-docs-mirror/markdown/api/GameWorld/querySelectorEntity.md",
    "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts",
    "origin/origin/origin/api/GameEntity.js",
    "origin/origin/origin/ScriptZoneWrapper.js",
    "Frontend/demo-map/src/runtime/entity-bounds.mjs",
  ]),
});
