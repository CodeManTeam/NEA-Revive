# NEA Map + Script Demo

Repository-wide progress and cleanup decisions live in `../Docs/project-progress.md` and `../Docs/repository-cleanup-plan.md`. This README is limited to the demo package's build, run, and validation workflow.

This subproject demonstrates the first creator workflow for the recovered DAO3/Box3 Player:

1. Author an editable `nea-map/v1` source project.
2. Compile it into the compatibility `dao3-project/v1` package.
3. Start the historical Player against the compiled terrain.
4. Execute a capability-gated server map script.
5. Deliver a small client map script through `gameNet.syncClientScriptModules`.

## Commands

```powershell
cd D:\Projects\Gaming\NEA-Revive\backend\demo-map
npm test
npm run test:control-bridge
npm run build
npm start
```

The Demo starts the historical Player on `4322` and a random-token, loopback-only Script Runtime control bridge on `4323`. Set `NEA_DEMO_CONTROL_PORT` to move the bridge or `NEA_DEMO_CONTROL_TOKEN` only for deterministic local testing. `NEA_DEMO_CONTROL_REQUEST_TIMEOUT_MS` accepts a positive integer in milliseconds and defaults to `2000`; it applies to short control operations such as chat, sound, entity/state updates, GUI commands, and remote events. `NEA_DEMO_STATE_SYNC_INTERVAL_MS` accepts a positive integer in milliseconds and defaults to `50`; overlapping state syncs are still skipped. `NEA_DEMO_STATE_SYNC_WARNING_INTERVAL_MS` accepts a positive integer in milliseconds and defaults to `5000`; repeated state-sync failures with the same session and error message are throttled. `NEA_DEMO_BACKEND_SHUTDOWN_TIMEOUT_MS` accepts a positive integer in milliseconds and defaults to `5000`; the Demo sends `SIGTERM` first and escalates to `SIGKILL` only if the Player backend does not exit in time. Dialog completion remains user-driven and is cancelled only when the Demo stops.

When running multiple Demo instances concurrently, set `NEA_DEMO_BUILD_ROOT` to a distinct package directory for each instance so Windows package replacement stays isolated.

`npm run test:control-bridge` starts the checked-in local Player backend with an ephemeral game port and a dedicated loopback control port. It verifies authentication, required session input, unknown-route handling, and JSON error responses without contacting MuDB or a browser. If the Player process cannot spawn, `src/server.mjs` reports the startup error separately from a normal backend exit.

## MuDB build

`src/server.mjs` and three test suites load the preserved block catalog through `../../../Backend/local-player/src/block-info.mjs`, which requires `Shared/mudb/schema` and `Shared/mudb/stream`. MuDB is vendored as TypeScript and ignores its own compiled output, so a fresh clone has no such modules and those suites fail to resolve their imports.

`npm test` and `npm start` therefore run `../../tools/build-mudb.mjs` first. The script compiles only the `schema` and `stream` layers, skips work when the emitted files are newer than `Shared/mudb/src`, and on its first run installs a pinned TypeScript into the gitignored `tools/.mudb-toolchain/`. Every later run is a no-op, so only the first build needs network access.

```powershell
npm run build:mudb              # compile explicitly
node ..\..\tools\build-mudb.mjs --check    # verify without building
node ..\..\tools\build-mudb.mjs --force    # recompile unconditionally
```

The script reuses `Shared/mudb/node_modules` when MuDB's own dependencies are already installed, so a full `npm install` inside `Shared/mudb/` keeps working.

The server-side player model runs fixed-step physics at 20 Hz. Historical Player evidence confirms the upright default half extents `0.45 / 1.1 / 0.45`; separate broadphase bounds and shape half extents remain distinct evidence fields. Player positions remain rigid-body-center coordinates. Runtime snapshots expose the exact collider source and AABB used by the solver. A complete authoritative `bodyHalfExtents` plus `bodyShapeHalfExtents` update replaces the current collider; explicit unknown (`null`) posture shapes preserve it, and partial updates are rejected.

Run `npm run probe:remote` while the Demo is active to create a real MuDB session and verify ack, checkpoint, and hazard events end to end.

The same probe now verifies the authoritative state bridge: after the hazard script teleports and applies an impulse, it reads the backend runtime snapshot and confirms the final position and velocity. Use `NEA_DEMO_CONTROL_TOKEN` when running a deterministic local probe; normal starts generate a random token.

Open `http://127.0.0.1:4322/play/nea-script-lab?contentId=100110008`.

The editable sample is under `project/`. Generated compatibility output is under `build/project/`.

## Capability Showcase

The second editable source under `showcase/` keeps the compact map intact and provides a 256 x 64 x 256 capability gallery through the same importer, Script Runtime, local Player backend, and browser client. It exposes verified, partial, and evidence-deferred behavior in the in-game dashboard rather than presenting unresolved behavior as complete.

```powershell
npm run validate:showcase
npm run build:showcase
$env:NEA_DEMO_PLAYER_PORT = "4422"
$env:NEA_DEMO_CONTROL_PORT = "4423"
npm run start:showcase
```

Open `http://127.0.0.1:4422/play/nea-capability-showcase?contentId=100110008` when running on alternate ports. The dashboard probes world events, raycast result members, data/group storage, mutable gravity and air friction, Player movement writes, directed and broadcast RemoteChannel events, and the guarded HTTP path. Inbound chat, posture variants, and complete historical contact-force semantics remain explicitly evidence-deferred.

## Verified flow

- The importer expands the sample to 11,592 non-air voxels.
- The historical Player renders the generated map and creates a Guest avatar.
- `clientIndex.js` is delivered through `gameNet.syncClientScriptModules`.
- A recovered minimal `gameUI` identity allows the Player client script to start.
- The client sends `nea-demo:ready` through `remote-channel`.
- The server Script Runtime receives the event and executes the map handler.

See `docs/map-import-format.md` and `docs/script-runtime.md` for the current contracts and limitations.
