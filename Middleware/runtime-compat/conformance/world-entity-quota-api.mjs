export const worldEntityQuotaApiConformance = Object.freeze({
  canonicalApi: "GameWorld.entityQuota",
  signature: Object.freeze({ parameters: [], returns: "number" }),
  formula: "entityLimit - nonPlayerEntityCount",
  protocolDefault: 3400,
  createLimitResult: null,
  playersConsumeQuota: false,
  status: "compatible",
  evidence: Object.freeze([
    "origin/origin/origin/sync/ScriptEntitySync.js",
    "origin/server-protocols.json",
    "dao3-docs-mirror/markdown/api/GameWorld/entityCD.md",
    "origin/third-party/ArenaPro-CLI/server/types/GameAPI.d.ts",
  ]),
});
