# NEA Map Source Format v1

`nea-map/v1` is the editable creator-facing source format. The importer validates it and emits a deterministic `dao3-project/v1` directory consumed by the recovered Player backend.

Imports are transactional at the package-directory boundary: the importer reads source modules, assets, and capability inputs before creating a staging package, then replaces the requested output only after that package is complete. A failed import preserves an existing output package and does not create a new partial package.

## Root manifest

The source root contains `nea.map.json`:

- `id`: lowercase package identifier.
- `display`: creator-facing name and description.
- `runtime.apiVersion`: requested Script Runtime API version.
- `runtime.tickRate`: integer from 1 to 120.
- `world.shape`: three dimensions; each must be divisible by 32 for the historical Player.
- `world.spawn`: finite position inside the world.
- `world.terrain` and `world.entities`: safe paths inside the source root.
- `world.physics`: optional `nea-physics/v1` material and interaction-volume definition.
- `assets`: optional resource declarations with a unique logical `name`, safe source `path`, and optional descriptive `kind`.
- `ui`: optional safe path to a locally preserved `nea-recovered-client-ui/v1` state whose `sourceMessage` is `gameUI.reset`.
- `scripts.server`: trusted local server script.
- `scripts.client`: optional historical Player client module.
- `scripts.serverModules`: optional complete server module path list; defaults to the server entry and must include it.
- `scripts.clientModules`: optional complete client module path list; defaults to the client entry and must include it. Client modules must remain inside the entry directory so their relative identities can be preserved safely.
- `scripts.serverCapabilities`: explicit grants required by the server script.
- `scripts.clientCapabilities`: explicit grants requested by the historical Player client script. These are published only in the client script manifest and never injected into the server VM.
- Legacy `scripts.capabilities` is accepted as a server-only alias during migration.

## Terrain

Terrain uses `nea-terrain/v1`. `boxes` use inclusive `from` and `to` coordinates. `voxels` apply after boxes, so later writes override earlier cells. A `blockId` of `0` removes a cell. The importer caps expanded terrain at one million non-air voxels.

Non-air block IDs must exist in the BlockInfo catalog shipped with the target Player archive. The compatibility backend performs the authoritative catalog check before listening.

## Physics and interaction volumes

`nea-physics/v1` is optional; omitted files use the runtime defaults. It declares:

- `gravity`, `maxFallSpeed`, and `stepHeight` for the fixed-step player model.
- `materials`, keyed by block ID, with `solid`, `friction`, `restitution`, and tags.
- `colliders`, static axis-aligned solid volumes with stable IDs and tags.
- `triggers`, non-solid axis-aligned volumes that emit enter/leave events.

Positions are world coordinates. Collider and trigger `min` bounds are inclusive and `max` bounds are exclusive. Volumes must stay inside the world shape.

## Entities and mesh projection

Entity records may include an optional `mesh` resource reference. The importer preserves this reference but never derives geometry, bounds, collision, or a physics body from its text. A package-owned entity with a mesh blocks launch until the runtime package supplies a capture-derived `validated-mesh` binding. A mesh passed to `world.createEntity(...)` without such a binding remains a script-local entity and is reported as `partial`; it is not projected into the authoritative Player world.

## Static client UI

The optional UI state uses the already recovered backend contract: `nea-recovered-client-ui` version 1, `gameUI.reset`, a validated `ROOT_ID`, a default screen, bidirectional parent/child links, and captured picture-asset metadata. The importer republishes this state unchanged to the Player archive; it does not translate a new UI schema.

Literal `ui.findChildByName(...)` and default `screen.findChildByName(...)` calls are checked against the packaged tree before launch. Missing names, dynamic arguments, or lookups without a packaged tree block launch. A literal lookup through another receiver is `partial` when the name exists globally but the receiver subtree cannot be proven statically. `Ui*.create()` remains independent of the static tree and can be `ready` when its ABI binding and capability grant are available.

Literal server entity selectors are checked against the recovered `ParsedSelector` grammar. When every call to `world.querySelector`, `world.querySelectorAll`, or `world.testSelector` uses only `*`, `entity`, `player`, `.tag`, or `#id` literals, the project requirement is refined to `ready` even though the global API remains `partial`; that project never enters the unrecovered generic `testComponent` path. A tag or id token containing whitespace and an unprefixed component other than `player` / `entity` remain `partial`. Dynamic selector expressions remain executable but cannot receive the static ready refinement.

Server storage variables returned by `storage.getDataStorage()` are propagated as `GameDataStorage`, and variables returned by `.list()` are propagated as `QueryList`, so their member requirements appear in the Capability Manifest instead of being treated as map-defined properties. `storage.getGroupStorage()` is a blocking diagnostic unless the source declares a non-empty `runtime.groupId`. Import writes that identity into the project package, Capability Manifest v14 binds its normalized `storageScope` digest, the launch gate verifies the package value again, and local persistence includes the group id in its namespace. Manifest v14 also binds `display.name` as `projectIdentity.projectName`; the Runtime uses that verified value for readonly `world.projectName`. Missing group identity remains blocked rather than falling back to a shared synthetic group.

`world.entityLimit` is an optional source-package integer from 0 through 1,000,000. When omitted, import uses the directly recovered `script-protocol.start.config.entityLimit` identity value `3400`. Import writes the resolved value into `world/world.json`, and Capability Manifest v14 binds it as `inputs.worldConfig` before Runtime construction. `world.entityQuota()` returns the remaining non-player entity capacity, and `world.createEntity()` returns `null` without emitting creation events when that capacity is exhausted.

Capability Manifest v14 extracts literal server-side samples from `world.sound(...)` and statically inferred `GameEntity`/`GamePlayerEntity.sound(...)` calls, including object literals with a literal `sample` field. Each extracted sample must resolve to a packaged `player-block-audio` asset, and every sound API/control call adds a `transport:sound-playback` dependency on the recovered `player.sound` MuDB flow. Dynamic sample expressions remain ABI-visible but cannot prove resource availability; the gate does not invent a dictionary entry.

Capability Manifest v14 extracts literal server-side samples from `world.sound(...)` and statically inferred `GameEntity`/`GamePlayerEntity.sound(...)` calls, including object literals with a literal `sample` field. Each extracted sample must resolve to a packaged `player-block-audio` asset, and every sound API/control call adds a `transport:sound-playback` dependency on the recovered `player.sound` MuDB flow. Dynamic sample expressions remain ABI-visible but cannot prove resource availability; the gate does not invent a dictionary entry.

Variables assigned from `world.addZone(...)` are propagated as `GameZone`. Calls such as `zone.onEnter`, `zone.onLeave`, `zone.entities`, and `zone.remove` therefore bind to the evidence-backed `RuntimeGameZone` adapter. Zone membership events are locally executable, while environmental rendering and zone-force fields remain partial and stay visible in the launch report.

Variables assigned from `world.raycast(...)` are propagated as `GameRaycastResult`, and variables assigned from the result's `hitEntity` field are propagated as `GameEntity`. This lets the Capability Manifest resolve result-field and target-entity usage without treating those members as project-defined state. The nine recovered result fields are executable through `RuntimeRaycastResult`, but remain `partial` because local entity intersection is AABB-based and returned entities/vectors are compatibility subsets. The local `voxel` alias is reported only as an extension, not as DAO3 ABI.

Inline or named callback parameters passed to `world` or entity `onVoxelContact`, `nextVoxelContact`, `onVoxelSeparate`, and `nextVoxelSeparate` are propagated as `GameVoxelContactEvent`. Reads of `tick`, `entity`, `x`, `y`, `z`, `voxel`, `axis`, and `force` therefore bind to the typed local event adapter instead of becoming unclassified project properties. The launch report keeps these requirements `partial`; it does not infer native rigid-body equivalence from the local fixed-step contact producer.

The same callback-owner propagation applies to `onFluidEnter`, `nextFluidEnter`, `onFluidLeave`, and `nextFluidLeave`. Their parameters bind to the typed `RuntimeFluidContactEvent` implementation of `tick`, `entity`, and `voxel`. These requirements remain `partial` because local production covers Player body AABB overlap transitions and does not claim historical fluid timing, buoyancy, drag, or the engine's exact overlap-volume formula.

Click callback parameters passed to world or entity `onClick` / `nextClick` are propagated as `GameClickEvent`. Variables assigned from the callback's `entity`, `clicker`, and `raycast` members are further propagated as `GameEntity`, `GamePlayerEntity`, and `GameRaycastResult`. The typed local event is backed by real `player.game-net.input` ingress and authoritative target bindings, but remains `partial` for unmapped targets and compatibility-subset entity/vector behavior.

Press/release callback parameters passed to world or player `onPress`, `nextPress`, `onRelease`, and `nextRelease` are propagated as `GameInputEvent`. Their six fields bind to `RuntimeInputEvent`; variables assigned from `event.entity` and `event.raycast` continue as `GamePlayerEntity` and `GameRaycastResult`. The `position` field is exposed as the local vector compatibility value, but extracting it does not introduce a separate server-side shared-math capability grant. Input events remain partial because browser control generation does not consume projected Public Player flags.

Shared player/entity lifecycle callback parameters are propagated as `GameEntityEvent`. Reads of `tick` and `entity` bind to `RuntimeEntityEvent`, while the local `player` alias remains an extension. This covers world player join/leave, world entity create/destroy, and entity destroy handlers; it does not turn locally produced lifecycle events into proof of independent native engine lifecycle ingress.

Damage callback parameters passed to world or entity `onTakeDamage` / `nextTakeDamage` are propagated as `GameDamageEvent`. Their five fields bind to `RuntimeDamageEvent`; variables assigned from `event.entity` and nullable `event.attacker` continue as `GameEntity`. The launch report retains `partial` status because only script-produced hurt currently proves event production, while native engine DamageBinding ingress remains unverified.

Death callback parameters passed to world or entity `onDie` / `nextDie` are propagated as `GameDieEvent`. Their four fields bind to `RuntimeDieEvent`; variables assigned from `event.entity` and nullable `event.attacker` continue as `GameEntity`. The launch report retains `partial` status because only the script-produced hurt transition currently proves death production, while independent native death-state ingress remains unverified.

Respawn callback parameters passed to world or player `onRespawn` / `nextRespawn` are propagated as `GameRespawnEvent`. Its recovered `tick` and `entity` fields bind to `RuntimeRespawnEvent`, and variables assigned from `event.entity` continue as `GamePlayerEntity`. Only local `forceRespawn()` and its projected respawn state currently prove production; automatic native respawn ingress remains unverified.

Interaction callback parameters passed to world or entity `onInteract` / `nextInteract` are propagated as `GameInteractEvent`. Its recovered `tick`, `entity`, and `targetEntity` fields bind to `RuntimeInteractEvent`; the initiator continues as `GamePlayerEntity` and the target as `GameEntity`. Launch analysis also requires the recovered `player.entity-interact` ingress. Missing native interactive-component projection remains a partial behavioral gap rather than fabricated support.

Tick callback parameters passed to `world.onTick` / `world.nextTick` are propagated as `GameTickEvent`. The four canonical fields bind to `RuntimeTickEvent`; `deltaTime` resolves only through the explicitly documented local extension and is not reported as a DAO3 declaration. Delayed-frame catch-up remains partial because the local scheduler has no authoritative skipped-frame input.

Chat callback parameters passed to `world.onChat` / `world.nextChat` are propagated as `GameChatEvent`, with typed `tick`, `entity`, and `message` fields and no fabricated `player` alias. This improves ABI reporting only: the launch gate continues to block these subscriptions with `chat-ingress-unavailable` until direct Player/browser-to-server transport evidence exists.

Purchase callback parameters passed to `world.onPlayerPurchaseSuccess` / `world.nextPlayerPurchaseSuccess` are propagated as `GamePurchaseSuccessEvent`, with typed `tick`, `userId`, `productId`, and `orderId`. The launch gate continues to emit `purchase-success-ingress-unavailable`; marketplace-open and acknowledgement protocols are not treated as proof of a purchase event producer.

Player keyboard callbacks passed to `onKeyDown` / `onKeyUp` are propagated as `GameKeyBoardEvent`, with typed `tick` and `keyCode` fields. These subscriptions are startup-blocked because the recovered input protocol lacks keyboard-state arrays; action-button `onPress` / `onRelease` packets are not accepted as equivalent evidence.

Canonical entity contact subscriptions are blocked unless a real `bodyContact` / `bodySeparate` producer exists. The local generic `world.onContact` and `world.onContactSeparate` collider streams remain local extensions; their collider metadata and nullable/unresolved `other` field are not accepted as `GameEntityContactEvent` compatibility.

A subscription to `world.onPlayerPurchaseSuccess()` or `world.nextPlayerPurchaseSuccess()` blocks launch with `purchase-success-ingress-unavailable`. Documentation and origin source recover `{ tick, userId, productId, orderId }`, but the saved market transport contains no purchase-success ingress into the local Server Script Runtime. A manually dispatchable signal is not accepted as evidence of a real commerce producer.

The same producer rule applies to `world.onChat()` and `world.nextChat()`: recovered `GameChatEvent` declarations do not prove a browser-to-server chat route. These subscriptions block with `chat-ingress-unavailable`. The generated capability-gate audit applies the same evidence-blocker policy to anonymous corpus usage, including missing group-storage scope, so aggregate reports cannot downgrade a real startup blocker to `partial`.

## Import output

`npm run build` writes `.nea/build/project` with:

- `dao3.project.json`
- `world/world.json`
- `world/terrain.json`
- `world/entities.json`
- `world/physics.json`
- `assets/index.json`
- `assets/files/<sha256>.<extension>` for each declared source asset.
- `scripts/manifest.json`
- `scripts/server.js`
- `capabilities/manifest.json`

Declared binary assets are copied into the project package under content-addressed names. `assets/index.json` records their logical name, kind, packaged path, byte length, and SHA-256 digest. Packaging proves local availability only; it does not invent a DAO3 runtime resource binding.

## Capability manifest and launch gate

Every tracked `dao3-project/v1` producer uses the shared repository capability builder. The public importer and the private capture-package builder statically inventory public server/client API member usage and resolve each usage against `runtime-compat/abi/compatibility-matrix.json` plus the selected binding in `runtime-compat/abi/current-runtime.json`. The generated `nea-project-capability-manifest` records the canonical ABI id, compatibility state, required capability grant, and evidence-backed gaps without embedding script source.

- `ready`: every detected requirement has an executable non-partial binding and the required grant.
- `partial`: every requirement is executable, but at least one retains documented behavioral gaps. Launch is allowed with a warning.
- `blocked`: a requirement is undeclared, non-executable, or lacks its required capability grant. Launch stops before the backend or Player starts.

The startup gate does not trust the top-level `status` or `summary` fields by themselves. It requires manifest version 9, binds `apiVersion` plus client/server contract ids to `dao3.project.json.engine`, validates the closed state vocabulary, recomputes all 22 summary counts, and derives the effective state again from requirements, module resolution, resources, UI, entities, cross-runtime dependencies, and static diagnostics. Version 9 records SHA-256 and byte length for every analyzed server/client module, the exact sorted server/client capability grant sets, a canonical JSON digest of the analyzed client UI state, the packaged asset file identity set, and the project entity `id/kind/mesh` projection used by capability analysis. Before publication or execution, the launcher hashes the actual project server files and Player-archive client files, compares grants from their runtime manifests, verifies the Player UI manifest, reconstructs the same asset/entity projections, and reads every declared asset body to verify its byte length and SHA-256 against the package index. A package is rejected when any declared count, state, analyzed module, authorization, UI node, UI picture reference, asset index entry, asset body, or entity mesh dependency differs from the evidence inputs. Position and other ordinary world state are deliberately excluded because they do not affect Capability resolution. `script-owned` is valid only for inferred script requirements, never for resources or other evidence collections. This prevents stale or modified runtime packages from reusing an ABI conclusion against a different Runtime, replaced script corpus, changed authority set, replaced UI graph, or changed projection evidence and ensures dependency-only blockers are named before the Runtime starts. For directly imported projects the gate runs before client script or UI publication into the Player archive.

The scanner is intentionally conservative. An unresolved member is blocked rather than mapped to a similarly named API. Captured works may add anonymous conformance coverage, but work names and private message/resource identities are not inputs to capability resolution.

For captured packages, public client grants are derived from confirmed `current-runtime` bindings. Internal `client.script` entries are excluded because sandbox creation and module delivery are runtime infrastructure, not map authority. This prevents an implemented HTTP, media, navigator, UI, RemoteChannel, or client-world member from being blocked merely because a hand-maintained package grant list is stale, while the member's own native/compatible/partial status remains unchanged.

Version 5 of the manifest also records:

- Per-module dependencies and missing relative modules.
- Entity and player member usage inferred from `world.querySelector`, `world.createEntity`, DAO3 `onX`/`nextX` event payload destructuring, and `.player` assignments.
- Client UI member usage inferred from `Ui*.create` and `findChildByName` assignments.
- Script-visible audio/image references and entity mesh references, with separate availability and runtime-support states.
- Packaged UI nodes, client UI construction/lookup variables, standalone lookup calls, and the properties used on each inferred node.
- Project UI image dependencies. A named image missing from `pictureAssets` blocks launch; metadata-only pictures remain partial; metadata and image bodies whose SHA-256 base64url keys, dimensions, relationship, and media signatures are all verified use the native Player picture resolver and are ready; external URLs remain partial.
- Project entities and statically visible `world.createEntity({...})` calls, including whether native projection requires a validated mesh binding.
- Explicit local Runtime extensions, which are executable but remain `partial` because they are not canonical DAO3 declarations.
- Cross-runtime dependencies backed by `runtime-contracts.json`: client module delivery over `player.game-net`, client/server RemoteChannel flows over `player.remote-channel`, and evidenced player transform/respawn writes into the authoritative runtime over `nea-control.player-state`. Members with multiple local adapters are resolved against the statically inferred owner. Property reads do not require the state-write flow, and unrelated `server.player.write` extensions are not assumed to use it. Missing flow or contract evidence blocks launch.
- Compatibility matrix status `unavailable` is distinct from `declared-only`: it requires direct evidence that the selected runtime provider does not expose the documented surface. For example, the archived Player stores `UiInput.placeholderOpacity` internally, but its hardened Script Runtime wrapper omits the getter, so projects using it are blocked with that evidence instead of receiving a fabricated value.
- Server terrain access uses the dedicated `server.world.voxels` grant. It covers the `voxels` global and the recovered `world.size` projection, and is deliberately separate from `server.world.entities`; the Capability Manifest and runtime facade both enforce the same boundary.
- Declared GameGUI members use `server.gui`. Unknown `world.*` or `gui.*` names are not automatically accepted: the manifest treats them as `script-owned` only when a static assignment in one of the project's modules establishes that surface, after which reads and calls in other modules remain project state rather than invented Runtime ABI.
- GameStorage access uses `server.storage`. The grant authorizes the local storage provider but does not upgrade its compatibility classification: single-map data storage remains locally persistent, while group storage stays partial unless direct provider support is supplied.
- Historical world configuration projections use `server.world.config`. The current surface is limited to `gravity`, `airFriction`, and `fogColor`; granting it authorizes script access but does not imply authoritative physics or Player environment propagation that has not been recovered.
- `world.entityLimit` is an optional integer from 0 through 1,000,000. When omitted, import uses the recovered `script-protocol.start.config.entityLimit` identity value `3400`. The resolved value is written to `world/world.json` and bound by Capability Manifest v14 as `inputs.worldConfig`.
- Client module delivery is required only when the project declares at least one client module. An absent client module list produces no `player.game-net.syncClientScriptModules` dependency; an explicitly declared zero-byte module is still a real module and therefore retains the delivery requirement.
- Declared GameGUI usage adds a `player.gui` transport dependency. Launch is blocked unless `runtime-contracts.json` confirms the handle-based command and response flow; script-owned `gui.*` fields do not trigger this dependency.

Project-owned resources use the `asset:<name>` form in the capability inventory. A missing project-owned asset blocks launch. A packaged non-mesh asset remains `partial` until a generic DAO3 asset resolver is executable; the local ABI currently records `server.global.resources` as recovered-only. A mesh remains blocked unless its metadata comes from a captured and validated Player projection binding. External references are `partial` because they are not preserved locally and network retrieval is not guaranteed. Named/default ESM imports and CommonJS `require` destructuring propagate inferred DAO3 entity/player/UI ownership when the exported value has a statically recovered source. Server-side `world.querySelectorAll(...)` results propagate `GameEntity` ownership through `for...of` iteration, and direct identifier aliases preserve recovered ownership across assignments.

Captured client audio is a narrower evidence-backed exception to the generic non-mesh rule. DAO3 documentation requires `Audio` sources to use the `/block/<CID>` content URL, saved captures contain the corresponding MP3 response bodies, and the local Player backend already validates and serves that namespace. When a packaged audio declaration has a matching verified CID, the capability manifest reports `player-block-audio` as ready. Missing bodies, invalid MP3 bytes, non-matching CIDs, arbitrary URLs, images, and other resource kinds remain blocked or partial according to their actual resolver evidence.

DAO3-owned collection consumers are also analyzed without treating arbitrary arrays as runtime objects. Callback parameters passed to `forEach`, `map`, `filter`, `find`, `some`, or `every` inherit `GameEntity` ownership from `world.querySelectorAll(...)` and `UiScreen` ownership from `UiScreen.getAllScreen()`. A value returned by `find` inherits the same owner. This covers high-frequency anonymous captured-script shapes while keeping unrelated business collections outside ABI inference.

Dynamic property names, `eval`, `Function` construction, and runtime-generated import specifiers create blocking diagnostics because their API requirements cannot be proven before launch. String-literal computed members such as `world["say"]` remain analyzable. Aliases that cannot be traced to a recovered constructor, event payload, query, collection iteration, or local named/default export remain outside static proof and must not be assumed compatible.

Event payload ownership is inferred only when a destructuring callback is directly registered with a known DAO3 world/entity/player `onX` or `nextX` member, or when a same-module named function is passed to that registration. A standalone business callback such as `({ entity }) => ...` does not make `entity` a `GameEntity`; this prevents common application data shapes from being promoted into Runtime ABI requirements.

Server module resolution matches the local CommonJS loader: relative, package-root absolute, and bare `node_modules` requests must resolve to an explicitly synchronized file or a synchronized `index.js` directory entry. Bare packages are not assumed to exist. The analyzer can inventory ESM imports/exports, but server ESM syntax remains a blocking diagnostic because the current executable server substrate is CommonJS-only.
