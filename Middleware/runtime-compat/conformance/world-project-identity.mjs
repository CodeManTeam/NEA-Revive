export const worldProjectIdentityConformance = Object.freeze({
  canonicalApi: "GameWorld.projectName",
  signature: Object.freeze({ type: "string", readonly: true }),
  historicalSource: "script-protocol.client.start.projectName",
  historicalAssignment: "origin/origin/origin/shell/ScriptShell.js:world.world.projectName = config.projectName",
  packageSource: "dao3.project.json.display.name",
  manifestBinding: "Capability Manifest v14 inputs.projectIdentity",
  localAssignment: "ScriptRuntime world.projectName readonly own property",
  excluded: Object.freeze(["GameWorld.url", "GameWorld.serverId"]),
});
