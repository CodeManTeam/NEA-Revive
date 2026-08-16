# NEA Runtime Compatibility Phase 5 Audit

Generated: 2026-08-01T01:46:10.808Z
Overall status: **complete**

## Requirements

### layered-architecture: complete

Client Script Runtime, Server Script Runtime, MuDB transport and authoritative state are separate layers.

- Middleware/runtime-compat/abi/runtime-contracts.json: ["project-package","client-script-runtime","server-script-runtime","mudb-transport","authoritative-game-runtime"]
- Middleware/runtime-compat/abi/script-runtime-boundaries.json: "Client Script Runtime and Server Script Runtime are separate execution realms connected only through declared transport and authoritative state flows."

### machine-readable-api-abi: complete

Every locally documented canonical declaration, kind-qualified member signature and recovered MuDB message has an explicit machine-readable record with availability, compatibility and evidence.

- Middleware/runtime-compat/generated/api-abi-completeness.json: {"status":"complete","summary":{"documentation":{"entries":599,"memberVariants":602,"byKind":{"method":245,"event":53,"property":265,"global":17,"object":22}},"catalogs":{"client":133,"server":1158,"shared":131},"compatibilityMatrix":{"entries":599,"coveredDocumentationEntries":599},"protocols":{"catalogs":32,"messages":180,"byDirection":{"server-to-client":86,"client-to-server":94}},"gaps":0}}
- Middleware/runtime-compat/abi/compatibility-matrix.json: {"declarations":599,"byStatus":{"native":125,"compatible":131,"partial":136,"recovered-only":93,"unavailable":1,"declared-only":113}}
- Middleware/runtime-compat/abi/protocols.json: {"protocols":32,"messages":180,"byDirection":{"server-to-client":86,"client-to-server":94}}

### player-standing-body: complete

Historical standing Player body dimensions and body-center coordinates replace the unsupported 0.6x1.8x0.6 assumption.

- Middleware/runtime-compat/abi/physics-player-body.json: {"origin":"body-center","halfExtents":[0.45,1.1,0.45],"dimensions":[0.9,2.2,0.9],"status":"confirmed-player-bundle-default"}

### player-posture-shapes: complete

Crouch/fly state encoding and client motor behavior are recovered; unavailable historical shapes are explicit null fields and the local runtime preserves the current collider instead of synthesizing dimensions.

- Middleware/runtime-compat/abi/physics-player-posture.json: {"crouching":{"stateStatus":"confirmed","confirmedClientEffects":["crouch-speed","crouch-acceleration","edge-occupancy-limiting"],"clientShapeMutation":"absent","authoritativeShape":{"status":"evidence-deferred","boundsHalfExtents":null,"shapeHalfExtents":null,"dimensions":null,"wireFields":{"rx":null,"ry":null,"rz":null,"hsx":null,"hsy":null,"hsz":null}}},"flying":{"stateStatus":"confirmed","confirmedClientEffects":["gravity-flag","collision-flag","vertical-motor-force"],"clientShapeMutation":"absent","authoritativeShape":{"status":"evidence-deferred","boundsHalfExtents":null,"shapeHalfExtents":null,"dimensions":null,"wireFields":{"rx":null,"ry":null,"rz":null,"hsx":null,"hsy":null,"hsz":null}}},"compatibilityPolicy":{"onUnknownAuthoritativeShape":"preserve-current-collider","requireCompleteAuthoritativeShape":true,"historicalClaim":false},"captureEvidence":"The explicit captures, inspected Player profile stores, and legacy worktree contain no historical binary server-to-client PUBLIC body frame."}
- Middleware/runtime-compat/generated/legacy-worktree-posture-inventory.json: {"clientShapeWrites":[],"legacyProducer":"local-reproduction-not-historical-evidence","authoritativeStatus":"unresolved"}
- Middleware/runtime-compat/generated/posture-delta-corpus-inventory.json: {"captures":9,"clientToServerBinaryFrames":1864,"serverToClientBinaryFrames":0,"resourceArchives":3,"rawReplayPayloadAvailable":false,"status":"not-found-in-safe-local-frame-corpus"}
- Middleware/runtime-compat/generated/authoritative-runtime-evidence-coverage.json: {"indexedSourceSets":["origin-server-runtime","lokibox-runtime-adapters","local-player-backend","archived-player-bundle","player-browser-profile","legacy-worktree","posture-delta-frame-corpus"],"producerStatus":"not-found-in-indexed-local-evidence","contactBindingStatus":"reference-only"}

### terrain-contact-rules: complete

Terrain contact axes, grounded support selection, force fields and active ContactRecord schemas are recovered.

- Middleware/runtime-compat/abi/physics-player-body.json: {"wireQuantization":0.00390625,"contactCutoff":0.0009765625,"minimumRadius":0.00390625,"groundedAggregation":"confirmed: voxel axis 2 support plus strongest body contact with non-zero ny","sweep":"predicted body-center position expanded symmetrically by rigid-body rx/ry/rz","narrowphaseShape":"hsx/hsy/hsz are tracked separately from broadphase rx/ry/rz"}
- Middleware/runtime-compat/abi/contact-event-model.json: {"axis":{"entityWire":"nx/ny/nz are reconstructed directly as GameVector3","voxelWire":"packed axis is passed through origin unpackAxis before event construction","local":"sweep contact normal is exposed as canonical axis and retained as the normal extension alias","packedMapping":{"0":[1,0,0],"1":[-1,0,0],"2":[0,1,0],"3":[0,-1,0],"4":[0,0,1],"5":[0,0,-1]},"status":"confirmed","evidence":[{"path":"Lokibox/box-go/dump/cube-axis.js","confidence":"direct"},{"path":"Lokibox/box-go/custom-schema.ts","confidence":"direct"},{"path":"origin/origin/origin/shell/ScriptShell.js","confidence":"direct"}]},"authoritativeState":{"schema":"ContactIndexSchema = sorted ContactRecordSchema[] by entity id","synchronization":"ScriptEntitySync.preTick applies ContactBinding to state.contact after RigidBodyBinding and DamageBinding","records":{"ContactRecord":["id","body","voxel","fluidVoxels","fluidVolumeFraction"],"BodyContact":["otherId","nx","ny","nz","fx","fy","fz"],"VoxelContact":["x","y","z","b","axis","fx","fy","fz"],"FluidContact":["b","volumeFraction"]},"status":"confirmed-schema-partial-binding","unresolved":["ContactBinding implementation is absent from the recovered origin tree.","The exact GameEntity.contactForce aggregation rule across active contact records is not yet recovered.","The exact construction and reuse policy for active contact value objects is not yet recovered."],"evidence":[{"path":"Lokibox/box-go/dump/cube-axis.js","confidence":"direct"},{"path":"origin/origin/origin/sync/ScriptEntitySync.js","confidence":"direct"}],"conformance":{"status":"covered","fixture":"runtime-compat/conformance/contact-state.mjs","tests":"runtime-compat/test/contact-state-conformance.test.mjs","coveredMappings":["body contact fields","voxel contact fields","fluid contact fields","cube axis decoding"],"excludedMappings":["GameEntity.contactForce aggregation"]}}}

### version-capability-conformance: complete

API version, runtime contracts, side-qualified capabilities, compatibility levels and conformance fixtures are enforced.

- Middleware/runtime-compat/abi/runtime-contracts.json: {"apiVersion":"0.1.0","contracts":["dao3-client-runtime/v1","nea-server-runtime/v1"]}
- Middleware/runtime-compat/abi/compatibility-matrix.json: {"native":"Executable in the historical runtime provider with direct evidence.","compatible":"Executable locally with conformance evidence sufficient for the documented contract.","partial":"Executable locally, but one or more access, signature or behavioral gaps remain.","recovered-only":"The historical declaration or implementation is recovered, but no local executable binding exists.","unavailable":"Direct runtime evidence proves that the selected historical provider does not expose this declaration to scripts.","declared-only":"Only the documentation declaration is currently recovered."}
- Middleware/runtime-compat/conformance/entity-tag-api.mjs: {"compatible":["GameEntity.addTag","GameEntity.removeTag","GameEntity.hasTag"],"partial":["GameEntity.tags"]}
- Middleware/runtime-compat/conformance/world-collision-filter-api.mjs: {"partial":["GameWorld.addCollisionFilter","GameWorld.removeCollisionFilter","GameWorld.clearCollisionFilters","GameWorld.collisionFilters"]}

### project-capability-launch-gate: complete

Capability Manifest v14 binds analyzed scripts, grants, UI, resources, entities, storage group scope, project identity, world entity-limit configuration, static server sound samples and semantic Runtime ABI artifacts to the actual package before publication or execution; sound calls additionally require the evidenced player.sound transport, while exact player lifecycle payloads may be project-ready even though the global player ABI remains partial because accessed members are independently gated.

- Middleware/runtime-compat/abi/runtime-contracts.json: {"format":"nea-project-capability-manifest","version":14,"producer":"demo-map/src/capability-manifest.mjs","launchGate":"demo-map/src/capability-launch-gate.mjs","states":["ready","partial","blocked","script-owned"],"evidenceCollections":["requirements","modules","resources","ui","entities","dependencies","diagnostics"],"inputBindings":["api-version","client-contract","server-contract","server-modules","client-modules","server-capability-grants","client-capability-grants","client-ui-state","asset-file-evidence","entity-projection-evidence","storage-group-scope","project-identity","world-config","runtime-abi-artifacts"],"integrityChecks":["closed-state-vocabulary","derived-summary-counts","derived-launch-status","declared-derived-status-match","exact-module-set","exact-grant-set","canonical-json-digests","asset-file-bytes-sha256","storage-scope-semantic-digest","project-identity-semantic-digest","world-config-semantic-digest","runtime-abi-semantic-digest"],"projectRefinements":[{"id":"player-lifecycle-event-payload","apis":["world.onPlayerJoin","world.nextPlayerJoin","world.onPlayerLeave","world.nextPlayerLeave"],"globalCompatibility":"partial","projectState":"ready","condition":"GameEntityEvent {tick,entity} payload is exact and every accessed GamePlayerEntity member is independently gated"}],"launchBefore":["client-script-publication","client-ui-publication","block-catalog-load","server-script-runtime-construction","backend-spawn","player-navigation"],"evidence":["demo-map/src/capability-manifest.mjs","demo-map/src/capability-launch-gate.mjs","demo-map/src/capability-input-digest.mjs","demo-map/src/capability-input-normalize.mjs","demo-map/src/lifecycle-event-refinement.mjs","runtime-compat/conformance/player-lifecycle-project-refinement.mjs","demo-map/src/server.mjs"]}
- Frontend/demo-map/src/capability-launch-gate.mjs: {"version":14,"inputs":["api-version","client-contract","server-contract","server-modules","client-modules","server-capability-grants","client-capability-grants","client-ui-state","asset-file-evidence","entity-projection-evidence","storage-group-scope","project-identity","world-config","runtime-abi-artifacts"],"launchBefore":["client-script-publication","client-ui-publication","block-catalog-load","server-script-runtime-construction","backend-spawn","player-navigation"]}
- Middleware/runtime-compat/conformance/player-lifecycle-project-refinement.mjs: [{"id":"player-lifecycle-event-payload","apis":["world.onPlayerJoin","world.nextPlayerJoin","world.onPlayerLeave","world.nextPlayerLeave"],"globalCompatibility":"partial","projectState":"ready","condition":"GameEntityEvent {tick,entity} payload is exact and every accessed GamePlayerEntity member is independently gated"}]
- Middleware/runtime-compat/conformance/world-project-identity.mjs: {"compatible":"GameWorld.projectName","excluded":["GameWorld.url","GameWorld.serverId"]}

### demo-contract-bindings: complete

Demo client.js and server.js bind separate declared runtime contracts and capabilities.

- Middleware/runtime-compat/abi/runtime-contracts.json: [{"side":"client","contract":"dao3-client-runtime/v1","resolved":true},{"side":"server","contract":"nea-server-runtime/v1","resolved":true}]

### gap-report: complete

The generated gap report uses the same canonical compatibility matrix classification.

- Middleware/runtime-compat/generated/gap-report.json: {"executable":392,"compatibilityStatus":{"native":125,"compatible":131,"partial":136,"recovered-only":93,"unavailable":1,"declared-only":113}}

## Deferred Evidence

- player-posture-authoritative-shapes: not-found-in-indexed-local-evidence; blocking=false; representation=evidence-deferred

## Validation

- `cd runtime-compat && npm run build && npm test`
- `cd demo-map && npm run build && npm test`

Policy: Historical behavior is never synthesized. Evidence-deferred fields remain null; a local preserve-current-collider policy may complete the compatibility contract without claiming recovered historical values.
