# Frontend Player parity audit

Audit date: 2026-08-18

本文是 `frontend/voxweb` 与历史 Player 的前端 parity 审计，不代表整个
NEA-Revive 项目的完成度。后续实现状态以本文件的发现和
[`frontend-player-parity-development-plan.md`](./frontend-player-parity-development-plan.md)
为准；项目总体复活路线见 [`project-revival-development-plan.md`](./project-revival-development-plan.md)。

后续修复记录：审计中关于 shadow submission 的 P1 问题已在 2026-08-18 的实现中修复，
当前仍需保留视觉 capture 验证；不要把该条当作未修复的代码缺陷。

## Scope and evidence boundary

This audit compares the current Rust/WASM/WebGPU player in `frontend/voxweb`
with the historical Player bundle launched by
`${NEA_PROJECT_ROOT}/Frontend/demo-map`.

The old `demo-map` directory is not the renderer source. It launches an
archived, minified Next.js Player from
`${NEA_PROJECT_ROOT}/Backend/local-player/archive/project/bedwars/client-runtime`.
Consequently this is a feature- and pipeline-level audit, not a source diff.
The strongest historical evidence is the archived bundle, especially chunks
`734.8dcb480d99773395.js`, `491.987dc3d747ee296d.js`,
`342.a9e967c46d78a58e.js`, `441.b1be47b7cd3a98f6.js`, and
`425.9edb1a70ad3ce058.js`.

Evidence labels used below:

- **Confirmed**: directly visible in both implementations or in preserved data.
- **Self-declared divergence**: current code explicitly documents a changed value.
- **Inferred**: architectural or visual conclusion that still needs capture-based validation.

## Executive assessment

The current player is a substantive compatibility renderer, not a generic
voxel approximation. It reconstructs the historical terrain material chain,
four-cascade shadow atlas, per-pixel linked-list transparency, fluid surface,
six-direction sky irradiance, eye-local exposure, avatar mesh/IK, fog, ACES
tone mapping, and display gamma.

It is not yet a faithful replacement of the historical Player. The largest
remaining gaps are incomplete shadow submission, intentionally changed
environment constants, fixed rather than project-driven environment state,
sanitized/default asset substitutions, a simplified sky/weather surface, and
the lack of a reproducible image-parity harness. These gaps can materially
change the appearance of parkour even when the shader equations themselves
match recovered bundle fragments.

## Findings

### P1: Shadow submission omits most render geometry

**Confirmed.** `RenderTerrain::build_chunks` splits terrain into 4 MiB batches
and builds separate static-entity pipelines. The main color pass iterates all
terrain and entity pipelines, but the shadow pass submits only
`terrain_pipelines[0]`. Static entities are never submitted to the terrain
shadow renderer. Large maps therefore lose cast shadows for every terrain
batch after the first, and imported static entities cannot cast terrain-style
shadows. Avatar shadows use a separate path and do not fix this omission.

Impact: high. Shadow coverage changes with mesh packing order and map size,
causing discontinuous or missing shadows that the historical renderer's scene
submission would not exhibit.

Required correction: make shadow rendering accept all terrain and entity
batches, then add a regression test or GPU capture proving that geometry in a
second batch and an entity batch writes the shadow atlas.

### P1: No reproducible visual parity gate exists

**Confirmed.** Existing tests validate shader parsing, constants, protocol
identity, mesh rules, and CPU behavior. They do not launch the archived Player
and current Player at identical camera/world/time state and compare output.
Shader recovery comments therefore cannot establish final framebuffer parity.

Impact: high. Errors in color space, matrix conventions, atlas orientation,
pass order, depth semantics, exposure, and browser implementation can survive
unit tests while producing visibly different frames.

Required correction: add a private evidence-side harness that records fixed
camera screenshots plus WebGL/WebGPU captures for both players. Compare linear
RGB, depth/shadow debug views, silhouettes, and perceptual metrics. Keep the
historical bundle and screenshots outside the public repository.

### P1: Environment behavior is fixed and partly hand-tuned

**Confirmed / self-declared divergence.** The current frame loop recreates
`NeaEnvironment::recovered_default()` every frame and fixes sky time to
`4 / 24`. Fog defaults (`start=32`, `height=-8`, `heightScale=0.8`,
`density=0.0012`) are described in code as deliberately very light. The
underwater density is explicitly replaced by `0.08 + 0.2 * alpha` because the
recovered formula was judged visually too weak.

Impact: high for any project that changes fog, sun phase/frequency, sky,
weather, or fluid appearance; medium for a map that truly uses only preserved
defaults. The result may look nicer while still being non-equivalent.

Required correction: separate `historical_exact` from optional readability
tuning. Feed environment state from the session/project schema, and make the
exact recovered underwater formula the parity default.

### P1: Runtime-visible assets are not identical by default

**Confirmed.** The current player deliberately uses sanitized/generated atlas
chains unless local `asset-overrides` supply preserved assets. The historical
Player archive consumes the captured block, engine, avatar, and project assets.

Impact: high. Texture albedo, alpha, material, bump, fluid normal, avatar part,
and mip content feed directly into otherwise-correct shaders. A shader parity
claim made with different inputs is not an output-parity claim.

Required correction: for authorized local parity runs, generate a private
override manifest from the archive and record hashes/dimensions/color-space
metadata for every bound texture. Retain sanitized defaults for distributable
builds.

### P2: Sky and atmospheric feature surface is narrower

**Confirmed / inferred.** The archived bundle contains systems and shader
identities for sky, rain, snow, ambient light, bloom/SSAO-related renderer
infrastructure, and tone mapping. The current NEA path renders a procedural
full-screen sky with a fixed sun and fog color, but has no NEA rain, snow,
cloud, moon, or equivalent project-driven weather pass. ACES tone mapping is
performed independently in terrain, avatar, fluid, and alpha shaders rather
than through a demonstrated equivalent full-frame post chain.

Impact: medium for parkour if those project settings remain at defaults; high
for general project-package compatibility.

Required correction: first capture which archived features are active in the
parkour frame. Implement only active effects for parkour parity, while keeping
the broader omissions explicit in the compatibility matrix.

### P2: OIT has deterministic truncation not yet proven equivalent

**Confirmed / inferred.** The current per-pixel linked-list OIT allocates a
nominal ten nodes per pixel (subject to the WebGPU storage-buffer limit), then
resolves at most sixteen fragments. On buffer exhaustion, new transparent
fragments are silently dropped. The three vertical bands and linked-list
structure are strongly aligned with recovered evidence, but buffer sizing,
overflow behavior, ordering, and the sixteen-fragment cap have no end-to-end
parity proof.

Impact: medium. Dense overlapping glass/fluid/avatar effects can flicker or
lose layers in a device-dependent way.

Required correction: expose overflow counters in debug builds, reproduce an
archived stress frame, and compare allocation limits and overflow policy.

### P2: Static voxel light is a local approximation

**Confirmed.** The current client derives a static voxel-light field from the
received chunk cells and recovered block metadata. It is not the historical
worker implementation or an authoritative dynamic light stream. Eye ambient
and four-corner face light can therefore be structurally correct while their
input field differs after voxel edits, emissive changes, or incomplete chunk
arrival.

Impact: medium to high in caves, around emissive blocks, and during dynamic
terrain changes.

Required correction: compare worker light volumes from a historical capture,
then validate propagation, border exchange, update timing, and packed-channel
quantization against the current implementation.

### P2: Transparency classification is coupled to block-id parity

**Confirmed.** During terrain construction, non-fluid blocks are routed to the
alpha pipeline with `block_id & 1 == 0`. This is a compact recovered rule, but
it is not cross-checked at runtime against the complete BlockInfo material
classification. Any catalog/version mismatch sends opaque geometry through
OIT or alpha geometry through the opaque pass.

Impact: medium. Incorrect routing affects depth writes, ordering, shadowing,
and performance.

Required correction: assert parity between the bit rule and every preserved
catalog entry used by parkour; fall back to explicit material metadata when
the assertion fails.

### P2: Shadow fitting is compatibility-inspired, not demonstrated exact

**Self-declared divergence / inferred.** Cascades use fixed world cubes of
24/64/160/320 units anchored on the eye, with a hard-coded 1024 atlas and
0.5..700 shadow depth. Comments explain that this replaced frustum fitting to
avoid swimming. This may be a useful stabilization, but it is not evidence of
the archived Player's cascade fitting and stabilization algorithm.

Impact: medium. Texel density, transition placement, peter-panning, acne, and
off-screen caster coverage can differ substantially.

Required correction: extract the archived cascade matrices and viewport state
from a WebGL capture, then compare them numerically over camera translation and
rotation.

### P3: Two renderer architectures coexist

**Confirmed.** `crates/render` still contains the older generic
opaque/transparent/player/skybox passes alongside the NEA-specific pipelines.
The `?nea=` path uses the latter, but shared types and future changes can easily
land in the unused renderer or accidentally diverge between paths.

Impact: maintainability and test-selection risk rather than an immediate
parkour visual defect.

Required correction: document ownership of each path and add compile-time or
integration coverage that proves which renderer `start.html?nea=` instantiates.

## Subsystem comparison

| Subsystem | Historical Player | Current VoxWeb | Assessment |
|---|---|---|---|
| Graphics API | Archived browser WebGL/GLSL bundle | WebGPU/WGSL | Architectural rewrite |
| Terrain mesh | Worker/chunk-driven voxel surfaces | CPU rebuild from decoded chunks | Broadly compatible, timing/data differ |
| Albedo/material/bump | Preserved captured atlases | Sanitized atlases plus private overrides | Non-identical by default |
| Lighting | Worker-packed corner/sky light | Reconstructed static voxel field | Equation parity stronger than data parity |
| Exposure | Eye-local adaptation | Recovered asymmetric adaptation | Strong partial parity |
| Fog | Project/environment driven | Fixed tuned defaults plus fluid override | Material divergence |
| Tone/gamma | Archived output chain | ACES plus gamma in several material shaders | Plausible, framebuffer parity unproven |
| Shadows | Cascaded atlas in archived renderer | Four 1024 cascades | Core exists; submission and fitting differ |
| Transparency | Historical OIT infrastructure | Three-band PPLL OIT | Strong structural parity; limits unproven |
| Fluids | Preserved animated bump/reflection/extinction | Recovered WGSL formula | Strong shader parity; tuned underwater fog |
| Avatar | Preserved part meshes, palette, animation/IK | Recovered mesh, palette, pose blending and IK | Strong partial parity |
| Sky/weather | Historical environment systems | Fixed procedural sky, no NEA weather | Incomplete |
| Post effects | Renderer infrastructure present in bundle | No demonstrated equivalent full-frame chain | Incomplete/unproven |
| UI/client scripts | Historical Player UI/runtime | DOM overlays plus compatibility client runtime | Functionally partial, visually different |

## Non-shader findings

### P1: Runtime voxel changes never reach the NEA player

**Confirmed.** The recovered `game-terrain` protocol includes `voxelChange`,
and `voxweb-protocol` contains `apply_voxel_runs`, but the NEA event loop only
handles `reset` and `chunkResponse`. The backend also does not emit
`voxelChange` when `GameVoxelsRuntime.setVoxel*` mutates its collision world.
This is immediately relevant to parkour: its server script writes water above
dirt during startup, but the browser retains the bootstrap chunk contents.

Impact: critical project-behavior divergence. Rendering, collision, fluid
contact, eye-fluid state, light, and raycasts all use stale client chunk data.

Required correction: bridge ScriptRuntime voxel mutations into recovered RLE
`voxelChange` messages, apply runs to the correct world/chunk coordinates,
invalidate affected mesh/light/collision data, and test the parkour water loop
end to end.

### P1: ACTION0 and ACTION1 have no browser input producer

**Confirmed.** Protocol constants and backend event reconstruction exist, but
the NEA input listener only uses mouse click to acquire pointer lock. It does
not register mouse down/up state, and `recovered_player_state` has no action
arguments. Therefore the Player never sends the recovered ACTION0/ACTION1
button bits.

Impact: click, attack, use, and project input callbacks cannot work through
their canonical transport. This also makes the backend's recovered click and
raycast event machinery unreachable from the current player.

Required correction: reproduce the archived mouse/pointer button mapping,
press/release edge semantics, permission masking, and raycast payload timing.

### P1: Net-state decoding rejects valid replica feature bits

**Confirmed.** `decode_net_public_frame` returns an error when the replica
tracker contains `entityName` or `models`. Because the candidate base is only
committed after successful decoding, the complete frame is discarded, not
just the unsupported field.

Impact: enabling historical name/model replication can stop body, player,
damage, and input-state updates carried in the same frame. Compatibility only
holds while the backend deliberately avoids these valid protocol fields.

Required correction: implement the remaining schema types or at minimum
consume and preserve unknown fields without losing all independently decoded
state.

### P1: Client prediction currently trusts the client transform

**Confirmed.** The main loop explicitly treats the next server transform as
an echo of the client-authored body and discards it instead of reconciling.
The comment states that the compatibility backend does not yet implement
independent player simulation.

Impact: multiplayer authority, cheat resistance, collision correction,
moving-platform behavior, teleport conflicts, and server-script position
writes cannot match the historical authoritative model. Network loss can also
leave local and server state permanently divergent.

Required correction: make the backend the simulation authority, preserve
input history by tick, and reconcile/replay against independently produced
authoritative snapshots.

### P1: Canvas, depth, OIT, and projection never resize

**Confirmed.** Width and height are read once from CSS pixels during startup.
There is no NEA resize handler, device-pixel-ratio scaling, surface
reconfiguration, or recreation of depth and OIT resources. The generic VoxWeb
renderer has recovery logic, but the `?nea=` path bypasses it.

Impact: resizing, display scaling changes, fullscreen transitions, mobile
orientation, and moving a window between monitors produce stretched/blurry
output or repeated surface acquisition failure. Pointer sensitivity also uses
the live window width while projection keeps the old width, creating an input
and camera mismatch.

Required correction: track physical canvas size, rebuild all size-dependent
resources atomically, and handle `Lost`, `Outdated`, `Suboptimal`, and device
loss explicitly.

### P1: Client scripts execute with ambient browser authority

**Confirmed.** Client modules are run with `new Function`. Supplying selected
arguments does not create a security realm: evaluated code can still reach
`globalThis`, `window`, `document`, storage, network APIs, and the runtime
bridge. The exposed compatibility globals additionally include unrestricted
`fetch`, microphone recording, Blob, Audio, timers, and link opening.

Impact: this is not equivalent to the historical independent SES client realm
described by the recovered launcher. An imported project package can access
more browser capability than its manifest declares, exfiltrate local data, or
interfere with the player itself.

Required correction: execute client code in a real isolated realm/worker or a
carefully hardened compartment, expose capability-scoped endowments, validate
network destinations, and terminate the realm on session replacement.

### P1: Client runtime installation has no teardown lifecycle

**Confirmed.** Reinstalling modules resets the module object and cache but
does not cancel module timers, unsubscribe event listeners, stop audio/media,
remove generated UI, or clear emitter subscriptions. Rust keyboard closures
are also intentionally leaked with `Closure::forget`, with no session-owned
cleanup handle.

Impact: reconnect/reload-in-place or a second installation can execute old and
new scripts simultaneously, duplicate outbound events, retain microphone
streams, and accumulate controls and DOM nodes.

Required correction: create an explicit session scope owning listeners,
timers, animation frames, media, audio, UI roots, and Rust closures; dispose it
before every install and on disconnect.

### P2: Disconnects and surface failures have no recovery path

**Confirmed.** Any socket closure returns an error labelled "closed before
terrain" even after gameplay has started. Socket errors are only logged.
Surface acquisition errors yield the next animation frame indefinitely
without reconfiguration. There is no reconnect, resync, or user-facing
disconnected state in the NEA path.

Impact: brief network or graphics disruptions require a full page reload and
may leave leaked client-runtime resources active.

Required correction: distinguish pre-play failure from in-game disconnect,
dispose the old session, retry with bounded backoff, and perform a clean
terrain/net-state reset.

### P2: Terrain loading is eager, duplicate-heavy, and non-incremental

**Confirmed.** The client requests every chunk in the declared world, stores
each as a 32-cubed `Vec<u16>`, linearly scans the vector for duplicates, builds
the near region once, then rebuilds the entire world again after all responses.
Entity changes likewise rebuild all terrain and GPU pipelines. No render
distance, eviction, dirty-chunk rebuild, cancellation, or RPC retry is used.

Impact: startup time and peak memory scale with the complete declared volume,
not visible content. Larger project packages can stall WASM, duplicate CPU/GPU
memory, and recreate textures/pipelines for an unrelated entity transform.

Required correction: use an indexed chunk map, bounded concurrent requests,
per-chunk mesh/light resources, dirty-neighbor invalidation, and view-based
streaming.

### P2: Missing chunk responses can stall loading forever

**Confirmed / inferred.** Completion depends on `chunk_cells.len()` reaching
the complete request count. There is no per-RPC timeout, retry, failure marker,
or partial-world completion policy. The outer loop remains alive after terrain
exists, so a lost response after the near build prevents the final rebuild
without producing a terminal error.

Required correction: track each RPC state, retry idempotently, and expose
failed/empty/received as distinct states.

### P2: Static entity rendering discards most model appearance

**Confirmed.** The backend fallback loader extracts only positions, UVs, and
indices from embedded glTF. The client assigns every entity the same block
atlas tile, recomputes flat-ish vertex normals, and ignores glTF materials,
textures, vertex colors, tangents, alpha modes, skinning, morphs, and primitive
materials. Runtime `model.color`, emissive, shininess, metalness, and nameplate
updates are produced by the server bridge but are not applied to the WebGPU
entity scene; only visibility, scale, and offset are used. Particle state is
rendered as a single screen-space DOM effect, not per-entity 3D particles.

Impact: imported checkpoints, decorations, interactive objects, and animated
models can have the right silhouette but the wrong identity, material, spatial
effect, or visibility semantics.

Required correction: retain model/material primitives and implement the
recovered model replica fields rather than routing models through the terrain
block shader.

### P2: Entity collision is reduced to one OBB/AABB profile

**Confirmed.** Browser collision bodies are synthesized from one
`halfExtents` vector and entity transform. Mesh collision geometry, compound
shapes, anchors, dynamic gravity integration, and independent authoritative
generic-body simulation are not represented.

Impact: visual mesh and collision can disagree; rotating or non-box obstacles
produce incorrect parkour contacts and camera obstruction.

### P2: Audio is non-spatial and lacks server acknowledgement

**Confirmed.** Server sounds are played through `HTMLAudioElement` with URL,
gain, pitch, seek, pause, resume, and stop. Entity/player position is not used;
there is no listener transform, attenuation, panning, occlusion, or Web Audio
graph. Playback/decode failures are swallowed, and completion/error does not
return to the Script Runtime.

Impact: world/entity sound does not behave as a spatial game sound and scripts
cannot observe browser playback failure.

### P2: Input coverage is desktop-keyboard-only

**Confirmed.** The archived bundle contains touch/gamepad/device-scale paths.
The current NEA path implements WASD, Space, Shift, E, mouse look, and debug F
keys only. It has no touch controls, gamepad sampling, key rebinding, browser
focus-loss reset, or visibility handling.

Impact: held keys can remain latched after focus transitions, and mobile or
controller play is unavailable despite the compatibility runtime exposing a
mobile device identity.

### P2: Client module transformation is regex-based and incomplete

**Confirmed.** ES module syntax is converted to CommonJS with regular
expressions covering only a few line-oriented import/export forms. Default
exports, re-exports, multiline syntax, import assertions, comments/strings
containing matching text, and broader JavaScript grammar are not handled by a
parser.

Impact: valid recovered client modules can fail or be silently transformed
incorrectly. This also makes capability analysis and executed code diverge.

Required correction: use a real JavaScript parser/module linker or preserve
the historical CommonJS packaging contract without source rewriting.

### P3: Mesh batching assumes monotonically increasing indices

**Confirmed / risk.** `split_mesh_batches` selects boundaries from the largest
index in each triangle and subtracts the current batch base from every index.
For a valid mesh whose index order returns to an earlier vertex after a split,
the subtraction underflows. Current terrain generation likely emits monotonic
groups, but the helper contract does not enforce this.

Required correction: batch by remapping referenced vertices, or assert and
test the monotonic-index precondition.

## Additional integration findings

### P1: Canonical chat output is sent but never displayed by the NEA path

**Confirmed.** The backend emits `game-chat.log` for `world.say` and targeted
chat delivery. The NEA frame parser has no `game-chat` handler. The visible
chat DOM only receives locally typed lines and compatibility events; it is not
wired to the recovered chat protocol.

Impact: parkour join announcements, command responses, checkpoint messages,
and server broadcasts can cross the backend protocol successfully yet remain
invisible to the player.

Required correction: decode `globalNotice` and `log`, reproduce validity,
duration, float/private/type behavior, and route chat input through the
canonical `noticeMessage` path where appropriate.

### P1: Dialog RPC is absent from the current player

**Confirmed.** Parkour calls `entity.player.dialog()` for its help command.
The protocol table contains `dialog.open`, `cancelDialog`, and `cancelDialogs`,
but the NEA client does not handle any dialog messages or send `dialog.close`.
The generic compatibility modal handles a separate `nea-revive:player-ui`
event and is not the dialog RPC.

Impact: the parkour help promise cannot complete through the current Player's
canonical transport. Other maps can hang async script handlers waiting for a
dialog result.

Required correction: implement the full dialog protocol, including text,
rich-text, player-list/player variants, cancellation, result values, and
session teardown rejection.

### P1: World coordinate support is restricted to nonnegative X/Z and Y 0..255

**Confirmed.** Chunk keys use `(u32,u32,u32)`. Negative X/Z values are divided
with Euclidean arithmetic and then cast to huge unsigned values, so they can
never match loaded chunks. Several collision, block, fluid, camera, and light
queries hard-code Y to `0..256`; Y below zero is additionally synthesized as a
solid bedrock floor.

Impact: maps with negative coordinates, below-zero space, height above 256, or
a non-bedrock lower boundary render and collide incorrectly. This is a local
world policy, not a recovered Player invariant.

Required correction: preserve signed world chunk coordinates and use reset
world bounds/origin for every query rather than literal 0 and 256.

### P1: Non-32-aligned world dimensions lose edge chunks

**Confirmed.** The frontend computes chunk grid axes with integer
`world / 32`; the backend computes `sourceShape / 32` without `ceil` and then
uses the possibly fractional results in chunk-id division/modulo. Neither side
tests dimensions such as 33, 65, or 257.

Impact: valid edge voxels are unreachable, chunk IDs disagree, and spawn
clamping can underflow when an axis produces a zero-sized grid.

Required correction: define the recovered shape convention precisely and use
ceiling division consistently on both sides, with partial-edge chunk tests.

### P2: Every remote player uses the local player's skin and pose

**Confirmed.** Net-state decodes an 18-part `avatar_skin` for every display,
but only the local display's IDs are resolved and loaded. One
`NeaAvatarRenderer` supplies one mesh/texture/pose set for all
`AvatarInstance`s. Remote instances are then drawn using the local player's
locomotion matrices.

Impact: remote appearance, animation mode, jump/fall/swim/roll state, color,
emissive, metalness, and shininess are wrong even though the corresponding
display fields are available.

Required correction: cache renderers or compatible part/material sets by skin
identity and maintain animation state per player.

### P2: Remote death and visibility state are decoded but ignored

**Confirmed.** `RemotePlayerPose.dead` is populated and then never read. Local
and remote player visibility/model flags likewise do not control instance
submission. Parkour commands for invisibility, color, emissive, shininess, and
spectator appearance therefore do not produce the historical visual result.

### P2: Avatar loading cannot recover or react to skin changes

**Confirmed.** `avatar_load_attempted` is set before the async load and never
cleared. A transient 404/decode failure permanently disables the avatar for
that session. Once a renderer exists, changes to `avatar_skin` do not replace
it.

Required correction: key renderer state by the resolved skin identity, retry
transient failures with backoff, and atomically swap only after a complete new
skin loads.

### P2: Historical game UI is rendered twice through incompatible models

**Confirmed.** `gameUI.reset` is rendered immediately by the Rust
`HistoricalUi` DOM layer. The imported package also embeds
`__nea_ui_state__` in `syncClientScriptModules`, causing the JavaScript client
runtime to build another UI tree. These layers use separate roots, layout
rules, z-indices, and event models.

Impact: boxes/text can be duplicated or misaligned, with one inert copy above
or below the interactive copy. State changes in the script-owned tree do not
update the Rust copy.

Required correction: choose one authoritative UI implementation and route
both reset state and client mutations through it.

### P2: The Rust historical UI layout applies anchors incorrectly

**Confirmed.** `HistoricalUi` adds `base.width * anchor.x` and
`base.height * anchor.y` to the position. The JavaScript runtime, matching
ordinary anchor semantics, translates by a negative percentage of the
element's own size. The Rust renderer also supports only box and text nodes,
forces text to white, ignores visibility and most style fields, and skips
image/input/scroll elements.

Impact: even without the duplicate tree, captured UI cannot match the original
layout or appearance.

### P2: Nameplates ignore occlusion and recovered display properties

**Confirmed.** Player nameplates are screen-space DOM labels whenever their
clip coordinate is visible. They are not depth-tested or ray-occluded and do
not honor show-name flags, radius, custom color, invisibility, or entity
nameplate components. A name remains readable through terrain and walls.

Required correction: consume replicated nameplate state and test visibility
against depth or an authoritative occlusion query.

### P2: Damage/death presentation is split across unrelated overlays

**Confirmed.** Local player damage is handled in `client-script-runtime.js`,
while entity health is handled by a separate Rust DOM overlay. The Rust layer
is updated only with `static_collision_bodies`, not arbitrary net-state player
or entity bodies. State entries are retained indefinitely and missing bodies
do not remove their labels.

Impact: health bars can disappear, persist stale, or use different layout and
timing depending on target type. Remote-player damage and death presentation
is incomplete.

### P2: Most recovered Player protocol families are parse-only

**Confirmed.** Outside startup/models/gameUI/client modules/remote events and
terrain reset/chunks, the NEA main path has no behavioral projection for the
recovered sound, input-camera, player-protocol, entity-interact acknowledgement
and emotes, dialog, navigator, ref, RTC, GUI RPC responses, market, teleport,
or admin client messages. Some local extensions replace selected operations,
but they do not make the canonical protocol surface complete.

Impact: a project may pass schema negotiation while user-visible operations
are silently ignored. Capability readiness must distinguish "schema present"
from "Player consumer implemented".

### P3: Session negotiation advances on any parseable frame

**Confirmed / risk.** While negotiating, `SessionDriver` sends `game-net.join`
after the first successfully parsed client-direction frame, regardless of
protocol or semantic readiness. The local backend deliberately sends a clock
pong to trigger this behavior.

Impact: reordering or unsolicited parseable frames can advance the state
machine earlier than the historical handshake. This is fragile against a more
complete backend.

Required correction: model the exact recovered negotiation message and state
transition rather than using parseability as the signal.

## Recommended validation order

1. Fix complete shadow submission; it is an unconditional correctness defect.
2. Build an authorized local asset override manifest and verify all texture hashes.
3. Add exact-versus-tuned environment modes; run parity in exact mode.
4. Capture one fixed parkour spawn frame in both players with albedo, direct,
   ambient, shadow, fog, final color, and depth outputs.
5. Compare shadow matrices and OIT overflow behavior on representative scenes.
6. Only then tune remaining shader constants; visual tuning before identical
   inputs and pass coverage will hide root causes.

## Audit limitations

This pass is a static audit of the archived bundle, current source, manifests,
and tests. It does not claim pixel parity and did not modify private evidence.
A definitive visual verdict requires launching both players with the same full
parkour terrain, preserved assets, viewport, camera transform, input tick,
environment state, browser color configuration, and capture point.
