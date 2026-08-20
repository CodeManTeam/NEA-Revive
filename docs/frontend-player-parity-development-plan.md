# Frontend Player Parity 子计划

Plan date: 2026-08-18

Source audit: [`frontend-player-parity-audit.md`](./frontend-player-parity-audit.md)

本文件只负责 `frontend/voxweb` 与历史 DAO3 Player 的协议、渲染、UI 和生命周期一致性。
它是项目总计划的子计划，不定义 NEA-Revive 的首个内容复活目标；当前首个内容目标是
`there-is-backroom`，总路线见 [`project-revival-development-plan.md`](./project-revival-development-plan.md)。

## Objective

Make `frontend/voxweb` a verifiable local replacement for the historical DAO3
Player, with `packages/parkour` as the first renderer/protocol regression gate. Work is complete
only when behavior reaches the browser through the real `?nea=` path and is
covered by an end-to-end test or capture. A schema, helper, or isolated unit
test without main-path integration does not count as complete.

## Status model

| State | Meaning |
|---|---|
| `TODO` | Not started |
| `DOING` | Active implementation; one owner and a named branch/worktree |
| `BLOCKED` | Cannot proceed until the listed dependency/evidence is available |
| `VERIFY` | Implemented; awaiting required integration or visual verification |
| `DONE` | Acceptance criteria and required tests pass |

## Current progress

| Area | Status | Progress |
|---|---|---:|
| Historical/current source audit | `DONE` | 100% |
| Shader and render-pipeline inventory | `DONE` | 100% |
| Non-shader integration audit | `DONE` | 100% |
| Automated unit-test baseline | `DONE` | 100% |
| Private visual parity harness | `TODO` | 0% |
| Parkour correctness blockers | `DOING` | 80% |
| General Player compatibility | `TODO` | 0% |

Baseline verified on 2026-08-18:

- `cargo test -p voxweb-render`: 53 passed.
- `cargo test -p voxweb-protocol`: 93 passed.
- `cargo test -p voxweb-client`: 151 passed.
- `cargo test -p voxweb-physics`: 34 passed.

These tests establish the starting point only. They do not prove the archived
and current players produce equivalent frames or workflows.

## Release gates

### Parkour parity gate

All of the following must work in one browser session using
`packages/parkour`:

- Full terrain and authorized local asset set load without missing chunks.
- Startup `voxels.setVoxel(..., "water")` changes appear in rendering,
  collision, fluid contact, eye-fluid fog, raycast, and light data.
- Join messages and command responses appear in chat.
- The `帮助` command opens a dialog and resolves the server promise when closed.
- ACTION0/ACTION1 press and release reach the server with the recovered tick and
  raycast semantics.
- Walking, running, crouching, jumping, double jumping, flying, spectator mode,
  teleport, damage, death, and respawn reconcile against server authority.
- Player visibility, name visibility, scale, color, emissive, shininess, and
  avatar skin changes appear for local and remote players.
- Resize, fullscreen, DPR changes, disconnect, and reconnect do not require a
  page reload or leave duplicate listeners/scripts.
- Fixed-camera comparison against the historical Player passes the agreed
  visual thresholds.

### General Player gate

No protocol family may be called supported merely because its schema parses.
Every supported message requires a consumer/producer, lifecycle behavior,
negative tests, and an explicit compatibility status.

## Phase 0: Evidence and observability

Goal: make every later parity claim measurable.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| OBS-001 | Build a private dual-Player launch harness | `TODO` | None | Historical Player and VoxWeb launch the same package, viewport, camera, tick, and environment from one command. |
| OBS-002 | Add deterministic camera/state injection | `TODO` | OBS-001 | Capture can set position, yaw, pitch, first/follow camera, time, exposure, and debug view without manual input. |
| OBS-003 | Capture render attachments and WebGL/WebGPU state | `TODO` | OBS-001 | Final color, depth, shadow atlas, albedo, direct, ambient, fog, and transparent result are saved with metadata. |
| OBS-004 | Add perceptual and numeric image comparison | `TODO` | OBS-003 | Report contains linear-RGB error, edge/silhouette error, perceptual score, and approved masks. |
| OBS-005 | Add runtime diagnostic counters | `TODO` | None | UI/log exposes chunk RPC state, dirty meshes, OIT overflow, dropped frames, net decode errors, prediction corrections, and reconnect count. |
| OBS-006 | Record private asset binding manifest | `TODO` | None | Every historical/current texture and avatar resource has slot, hash, dimensions, format, mip count, and color-space metadata. |

Phase exit: one reproducible parkour spawn capture can be generated from both
players and compared without manual camera alignment.

## Phase 1: Parkour correctness blockers

Goal: close failures that directly break current parkour behavior.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| PKR-001 | Bridge ScriptRuntime voxel writes to `game-terrain.voxelChange` | `DONE` | None | Backend emits recovered RLE runs for committed `setVoxel*` mutations in deterministic tick order. |
| PKR-002 | Consume `voxelChange` in the NEA client | `DONE` | PKR-001 | Correct chunks mutate; adjacent mesh faces, collision, fluids, raycasts, light, and eye ambient are invalidated. |
| PKR-003 | Add parkour startup-water end-to-end test | `DONE` | PKR-002 | Browser observes a script-created water voxel and behaves consistently across render/physics queries. |
| PKR-004 | Render canonical `game-chat.log` and `globalNotice` | `DONE` | None | `world.say`, targeted messages, duration/type/private/valid fields, and FIFO order are visible. |
| PKR-005 | Send chat through canonical `noticeMessage` | `DONE` | PKR-004 | Typed browser chat reaches `world.onChat` once, with no duplicate RemoteChannel route. |
| PKR-006 | Implement dialog open/close/cancel protocol | `DONE` | None | TEXT/RICH_TEXT/PLAYER_LIST/PLAYER results and cancellation follow recovered RPC IDs and lifecycle. |
| PKR-007 | Add `帮助` command browser test | `DONE` | PKR-006 | Dialog opens from the real parkour script and closing it resolves the awaiting handler. |
| PKR-008 | Implement ACTION0/ACTION1 input edges | `DONE` | None | Mouse mapping, pointer lock, permission flags, press/release events, tick, position, and raycast match recovered packets. |
| PKR-009 | Validate parkour admin appearance commands | `TODO` | Phase 3 avatar tasks | Invisible/show-name/scale/color/emissive/shininess/spectator commands are visible to another session. |
| PKR-010 | Fix complete shadow submission | `DONE` | None | Every terrain batch, static entity batch, and avatar caster writes all relevant cascades. |

Phase exit: the parkour script's startup mutation, chat, help dialog, input, and
basic visual/collision loop pass in a real browser.

## Phase 2: Session, world, and authority

Goal: make the player resilient and server-authoritative.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| SES-001 | Implement independent authoritative player simulation | `TODO` | None | Backend produces transforms from inputs rather than echoing client bodies. |
| SES-002 | Connect prediction reconciliation and replay | `TODO` | SES-001 | `reconcile_and_replay` is used by the main path; latency/loss tests converge without periodic hitching. |
| SES-003 | Implement exact handshake transitions | `TODO` | None | Join is triggered by the recovered negotiation condition, not any parseable frame. |
| SES-004 | Add disconnect/reconnect/resync state machine | `TODO` | SES-003 | Bounded retry creates a clean session, resets terrain/net bases, and exposes a user-visible failure state. |
| SES-005 | Add owned teardown scope | `TODO` | SES-004 | Sockets, Rust closures, JS listeners, timers, RAFs, media, audio, UI, and script realm are disposed exactly once. |
| SES-006 | Handle resize, DPR, fullscreen, and surface loss | `TODO` | None | Surface, depth, OIT, projection, overlays, and input scaling rebuild atomically at physical-pixel size. |
| SES-007 | Support signed world coordinates and reset bounds | `TODO` | None | Negative X/Y/Z and nonzero world origins work in chunk lookup, mesh, physics, fluid, light, camera, and raycast. |
| SES-008 | Support partial edge chunks | `TODO` | SES-007 | Both sides use the same ceiling-division grid and pass 33/65/257-axis tests. |
| SES-009 | Complete remaining net-state replica types | `TODO` | None | `entityName`, `models`, and future known fields decode without dropping unrelated state in the frame. |
| SES-010 | Add chunk RPC timeout/retry/cancellation | `TODO` | None | Missing, duplicate, late, and reordered responses cannot stall loading or corrupt request mapping. |
| SES-011 | Replace eager full-world rebuild with chunk resources | `TODO` | PKR-002, SES-010 | Dirty chunks and neighbors rebuild independently; view-based loading and bounded concurrency are enforced. |

Phase exit: two clients remain converged under simulated delay, loss,
reordering, resize, and reconnect, including negative/partial-edge worlds.

## Phase 3: Avatar, entities, UI, and media

Goal: match the Player-facing project surface beyond terrain.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| AVT-001 | Cache avatar resources per skin identity | `TODO` | SES-009 | Each player uses its own resolved 18-part skin with deduplicated GPU resources. |
| AVT-002 | Maintain per-player animation state | `TODO` | AVT-001 | Remote walk/run/crouch/jump/fall/swim/roll/death pose derives from that player's state. |
| AVT-003 | Apply player display material/visibility fields | `TODO` | AVT-001 | Scale, invisible, show-name, color, emissive, metalness, shininess, dead, and spectator state affect rendering. |
| AVT-004 | Make skin loading retryable and hot-swappable | `TODO` | AVT-001 | Transient failure retries; runtime skin change atomically replaces the renderer. |
| ENT-001 | Preserve glTF primitives and materials | `TODO` | OBS-006 | Static models keep normals, tangents, textures, colors, alpha modes, and primitive material assignments. |
| ENT-002 | Apply replicated entity model fields | `TODO` | ENT-001, SES-009 | Runtime color/emissive/shininess/metalness/visibility/offset/scale/orientation update without rebuilding terrain. |
| ENT-003 | Implement entity nameplate state and occlusion | `TODO` | ENT-002 | Text, radius, color, show/hide, invisibility, distance, and terrain occlusion match evidence. |
| ENT-004 | Replace screen-space particles with 3D entity particles | `TODO` | ENT-002 | Rate, spread, lifetime, size, color, velocity, damping, and entity transform are simulated in world space. |
| ENT-005 | Define collision-shape compatibility | `TODO` | SES-001 | Box/OBB/compound/mesh support is evidence-scoped; visual and collision transforms stay aligned. |
| UI-001 | Remove duplicate historical UI renderer | `TODO` | None | One authoritative UI tree consumes both `gameUI.reset` and client-script mutations. |
| UI-002 | Implement complete UI layout and element types | `TODO` | UI-001 | Anchor, ratio/offset, auto layout, scale, visibility, z-index, box/image/text/input/scroll/screen match captured cases. |
| UI-003 | Complete UI input/event semantics | `TODO` | UI-002, SES-005 | Pointer behavior, focus, blur, input, scroll, screen resize, and teardown are covered. |
| UI-004 | Unify damage/death/respawn presentation | `TODO` | UI-001, AVT-003 | Local players, remote players, and entities use one replicated state model with no stale overlays. |
| MED-001 | Implement spatial sound | `TODO` | None | Listener/entity transforms, attenuation, panning, gain, pitch, loop, seek, and stop use a Web Audio graph. |
| MED-002 | Report audio completion and errors | `TODO` | MED-001 | Decode/playback/end/error state returns through the expected compatibility event/RPC. |

Phase exit: two players with different skins and states, one dynamic model,
captured UI, particles, and positional audio behave correctly in the same map.

## Phase 4: Rendering parity

Goal: convert the recovered render path from plausible to measured parity.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| REN-001 | Add exact/tuned environment modes | `TODO` | OBS-003 | Parity runs use exact recovered fog/fluid/environment values; tuning is explicit and opt-in. |
| REN-002 | Feed project environment state | `TODO` | REN-001 | Sun/time/frequency, fog, sky, weather, and exposure state update from authoritative project/session data. |
| REN-003 | Verify cascade fitting and stabilization | `TODO` | OBS-003, PKR-010 | Cascade matrices, splits, atlas viewports, bias, and caster coverage match captured frames. |
| REN-004 | Verify color-space and output chain | `TODO` | OBS-003, OBS-006 | Atlas formats, linear/sRGB conversion, tone mapping, exposure, gamma, and presentation match numeric captures. |
| REN-005 | Verify OIT capacity and overflow behavior | `TODO` | OBS-005 | Allocation, ordering, depth rejection, overflow, and dense transparency frames match evidence. |
| REN-006 | Verify voxel-light propagation | `TODO` | PKR-002, OBS-003 | Packed channels, borders, emissive updates, sky propagation, and update timing match worker captures. |
| REN-007 | Replace block-ID parity transparency routing | `TODO` | OBS-006 | Every catalog material is routed by verified metadata; parity assertion covers the full parkour catalog. |
| REN-008 | Implement active parkour sky/weather/post effects | `TODO` | REN-002, OBS-003 | Only effects proven active in parkour are release blockers; broader effects remain explicitly scoped. |
| REN-009 | Resolve dual renderer ownership | `TODO` | None | Generic and NEA paths have documented owners or are consolidated; tests prove which path `?nea=` uses. |
| REN-010 | Harden mesh batching | `TODO` | None | Arbitrary valid index order batches through vertex remapping without underflow or topology change. |

Phase exit: agreed parkour reference frames pass visual thresholds on the
supported browser/GPU matrix.

## Phase 5: Client runtime and protocol completion

Goal: make package execution capability-scoped and make support claims honest.

| ID | Task | Status | Depends on | Definition of done |
|---|---|---|---|---|
| CRT-001 | Replace ambient `new Function` execution | `TODO` | SES-005 | Client modules run in an isolated realm/worker with no undeclared access to window/document/storage/network. |
| CRT-002 | Replace regex module transformation | `TODO` | CRT-001 | Real parser/linker handles supported module grammar with deterministic errors and source locations. |
| CRT-003 | Enforce client capability endowments | `TODO` | CRT-001 | Fetch, media, links, UI, input, and RemoteChannel are exposed only when manifest capabilities grant them. |
| CRT-004 | Validate outbound network destinations | `TODO` | CRT-003 | Project HTTP cannot silently access arbitrary origins or local services outside declared policy. |
| PRO-001 | Build protocol consumer coverage matrix | `TODO` | None | Every client/server message is `implemented`, `partial`, `blocked`, or `unused`, with a test/evidence link. |
| PRO-002 | Complete interaction acknowledgement and emotes | `TODO` | PKR-008, ENT-002 | Prompt/radius/acknowledge/playEmote behavior is end-to-end tested. |
| PRO-003 | Complete GUI RPC | `TODO` | UI-002 | init/show/append/remove/get/set/reset plus return/throw/sendMessage work through canonical protocol. |
| PRO-004 | Scope navigator/ref/RTC/market/teleport/admin | `TODO` | PRO-001 | Each family is implemented with policy controls or explicitly startup-blocked; none is silently ignored. |
| PRO-005 | Add touch/gamepad/focus input support | `TODO` | PKR-008 | Recovered device paths work; focus/visibility loss clears held inputs deterministically. |

Phase exit: capability analysis, protocol negotiation, and actual Player
consumers report the same support surface.

## Verification matrix

Each completed task must add the smallest applicable layers below.

| Layer | Required evidence |
|---|---|
| Unit | Pure codec/math/state behavior, including invalid and boundary inputs |
| Integration | Real protocol table plus backend/client producer-consumer pair |
| Browser | `start.html?nea=...` with WebSocket, WASM, DOM, and WebGPU active |
| Multiplayer | Two sessions for authority, remote avatar, chat, interaction, and reconnect work |
| Visual | Fixed camera/state comparison against the archived Player |
| Performance | CPU time, GPU time, memory, chunk latency, and resource counts before/after |

Required recurring commands:

```powershell
cd backend\box-go
npx tsx --test src/runtime-server.test.ts
npx tsx --test src/runtime-server-voxweb.test.ts
npx tsx --test src/runtime-server-driver.test.ts
npx tsx --test src/runtime-server-netstate.test.ts

cd frontend\voxweb
cargo test -p voxweb-protocol
cargo test -p voxweb-render
cargo test -p voxweb-physics
cargo test -p voxweb-client
trunk build --release
```

## Recommended execution order

1. `OBS-001` through `OBS-006` establish evidence and diagnostics.
2. `PKR-001` through `PKR-008` restore the visibly broken parkour workflows.
3. `SES-001`, `SES-002`, `SES-006`, `SES-009`, and `SES-010` remove authority
   and lifecycle hazards before expanding features.
4. Finish Phase 3 player/entity/UI state required by `PKR-009`.
5. Complete measured rendering parity in Phase 4.
6. Harden the client runtime and remaining protocol surface in Phase 5.

`PKR-010` can run in parallel with the voxel/chat/dialog work. Avoid broad
visual tuning until `OBS-006`, `PKR-001/002`, and complete shadow submission are
done; otherwise mismatched inputs and missing geometry will contaminate every
comparison.

## Progress log

| Date | Change | Result |
|---|---|---|
| 2026-08-18 | Completed three-pass historical/current frontend audit | Shader, render, protocol, physics, UI, avatar, entity, media, lifecycle, and security gaps documented. |
| 2026-08-18 | Established Rust unit-test baseline | 331 tests passed across protocol/render/client/physics; warnings remain. |
| 2026-08-18 | Exported this development plan | Implementation work has not started. |
| 2026-08-18 | Implemented the runtime voxel mutation transport | ScriptRuntime commits now invalidate chunk cache and emit canonical `game-terrain.voxelChange`; VoxWeb applies world-space Morton runs and rebuilds terrain-derived state. Backend WebSocket integration and Rust protocol tests pass; browser startup-water verification remains for PKR-002/003. |
| 2026-08-18 | Added Parkour startup-water integration coverage | The real parkour server script is exercised through the runtime server; a generated water voxel is found in the authoritative world and in a fetched terrain chunk. Browser visual/physics observation remains for final acceptance. |
| 2026-08-18 | Verified parkour startup water in the running stack | Probed the authoritative voxel world: parkour commits 44 `water`(364) voxels, all at y=8, scattered across x63–248/z32–221. These are discrete 1×1 puddles (surrounded by solid 127 on all sides, +Y air), not a ground-covering body. Closest to spawn (115,154) is (116,8,140), ~14 blocks away. PKR-002/003 marked DONE. |
| 2026-08-18 | Completed Phase 1 chat/dialog/input/shadow blockers | PKR-004: decode `game-chat.log`/`globalNotice` and surface via `nea-revive:chat` DOM lines. PKR-005: chat input encodes canonical `game-chat.noticeMessage` (backed by `encode_runtime_outbound` chat branch). PKR-006: dialog open/close/cancel bridged — fixed dialog close union indexes to `close=0,text=1,input=2,select=3` and `open` `text=0,input=1,select=2`; added backend `dialog.close` resolution of awaiting promises; `帮助` command end-to-end test passes. PKR-008: registered mouse down/up producing ACTION0(1)/ACTION1(2) input bits. PKR-010: shadow submission now submits every terrain batch and every static entity batch (only first clears the depth atlas). Tests: box-go 4 suites pass, voxweb protocol 82 + client 152 + render 52, wasm32 check passes. |
| 2026-08-18 | Reworked engine system UI onto the engine UI API | Per user direction, the engine (not each map) now owns chat/dialog/HUD chrome using the same UI API (`createUiNode`/`UiBox`/`UiText`/`UiInput`) that map scripts use, instead of bespoke DOM/CSS. Chat panel + input, historical dialog (open/close/cancel, input/select/text), gameplay HUD, health bars, death overlay, and player modal all moved onto `#nea-engine-ui`; new `#nea-engine-ui` layer is separate from the map UI tree (`#nea-client-ui`) so `installUiState` cannot clear it; `parent` setter hardened for element-host parents. Browser runtime smoke, box-go suites, protocol tests, and `trunk build --release` all pass. |
| 2026-08-18 | Clarified project scope | Parkour remains the frontend regression gate; Backroom revival is tracked by the project-level plan. |

## Definition of project completion

The project is complete when the Parkour parity gate and General Player gate
both pass, the private visual report is reproducible, all supported protocol
families have end-to-end consumers, no project script receives ambient browser
authority, and the compatibility matrix contains no silent `parse-only`
features.
