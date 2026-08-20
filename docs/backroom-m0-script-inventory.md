# Backroom M0 Script Inventory

This is the first traceability index for `packages/there-is-backroom`. The
source scripts remain unchanged; this document records entry points and the
first runtime capabilities that must be checked against the DAO3 contract and
historical evidence.

## Entry Points

| Role | File | Notes |
|---|---|---|
| Server bootstrap | `scripts/index.js` | Loads `main.js` and `GUI.js`, installs world hooks. |
| Main gameplay | `scripts/main.js` | Passwords, interactions, doors, dialogs, timers, entities. |
| Server modules | `scripts/体力.js`, `scripts/管理员.js`, `scripts/GHOST.js`, `scripts/SQL.js` | Stamina, admin, GHOST, persistence integrations. |
| Client bootstrap | `scripts/clientIndex.js` | UI scale and remote-channel client events. |
| Client UI | `scripts/GUI.js` | Historical UI tree and client-facing controls. |

## Initial Capability Families

| Family | Observed calls | Current evidence status |
|---|---|---|
| World/entity query | `world.querySelector`, `querySelectorAll`, entity tags and ids | inferred; needs API/document cross-check |
| Interaction | `enableInteract`, `interactRadius`, `interactHint`, `onInteract` | verified through generic projection, real MuDB ingress, and the Backroom password lock flow |
| Player dialog | `player.dialog({type: input/text/select})` | verified for the Backroom password input flow; broader dialog variants remain partial |
| Entity motion | `position`, `velocity`, `meshOrientation`, `meshScale`, `destroy` | verified for the password-door animation and destruction; broader animation parity remains partial |
| Combat/damage | `hp`, `maxHp`, `hurt`, `onDie`, `enableDamage` | missing or incomplete for full Backroom parity |
| Audio/assets | `sound`, `.mp3`, mesh and voxel assets | assets present; playback/mesh browser proof pending |
| Storage/purchases | `player.getMiaoShells`, `money`, purchase event, SQL module | evidence-dependent; must remain capability-gated |
| Client bridge | `remoteChannel.events`, UI scale, HUD updates | partially confirmed; needs browser assertion |

## Next Acceptance Probe

The next M1 probe should connect to the Backroom service, join one player, and
assert: server script load, spawn position, first world hook, at least one
interaction-capable entity, and one dialog request. A failure should be recorded
against the family above rather than patched in the map script.

## M1 Probe Result (2026-08-18)

`backend/box-go/src/runtime-server-backroom.test.ts` now verifies the real
Backroom package through `createSession` and MuDB sockets. The probe passes for
project import, server runtime activation, the dynamic `160x128x192` reset,
spawn response, a non-empty streamed terrain chunk, and continued runtime
activity after join. The spawn chunk itself is legally empty (`0` boxes); the
probe therefore checks a neighboring grid chunk for terrain instead of making
an invalid density assumption. Browser review also reached the Backroom loading
screen and emitted `map ready` in the live service.

The generic runtime now exposes `dispatchPlayerPurchaseSuccess(...)` with a
focused regression test. Protocol-to-runtime purchase transport remains a
separate integration gap; no map-specific workaround was added.

## M2 Password-Lock Slice (2026-08-20)

The original `scripts/main.js` password-lock flow now runs without script edits
or map-specific branches. Runtime entity writes project `enableInteract`,
`interactHint`, and `interactRadius`; VoxWeb consumes both the initial camelCase
scene fields and later `nea-revive:entity-state` updates, including entities
without collision bodies. The MuDB probe performs a real entity interaction,
submits `2738` through the input dialog, observes the original success message,
waits for the scripted door animation, verifies interaction is disabled, and
verifies the password door is destroyed. The flow passed three consecutive
isolated runs and the affected module regressions.

Status: `verified`, not `accepted`. The current headless Edge environment does
not expose usable WebGPU, so visible mesh targeting, overlay/input behavior,
audio playback, and final canvas parity still require a WebGPU-capable browser.
