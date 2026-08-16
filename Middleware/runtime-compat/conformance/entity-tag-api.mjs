export const entityTagApiConformance = Object.freeze({
  canonicalApis: Object.freeze(["GameEntity.addTag", "GameEntity.removeTag", "GameEntity.hasTag"]),
  localApis: Object.freeze(["RuntimeEntity.addTag", "RuntimeEntity.removeTag", "RuntimeEntity.hasTag"]),
  coercion: "String(tag)",
  storage: "Set<string>",
  returns: Object.freeze({ addTag: "void", removeTag: "void", hasTag: "boolean" }),
  historicalEvidence: "origin/origin/origin/api/GameEntity.js:constructor tag bindings",
  declarationEvidence: "dao3-docs-mirror/markdown/api/GameEntity/label.md",
  localEvidence: "Frontend/demo-map/src/runtime/script-runtime.mjs:createRuntimeEntity",
  excludedApi: "GameEntity.tags() remains partial because local tags is a Set property rather than an array-returning method.",
});

export const entityKindDiscriminatorConformance = Object.freeze({
  canonicalApi: "GameEntity.isPlayer",
  localBindings: Object.freeze({ RuntimeEntity: false, RuntimePlayer: true }),
  signature: Object.freeze({ type: "boolean", readonly: true }),
  historicalEvidence: "origin/origin/origin/api/GameEntity.js:isPlayer",
  declarationEvidence: "dao3-docs-mirror/markdown/api/GameEntity/isPlayer.md",
});
