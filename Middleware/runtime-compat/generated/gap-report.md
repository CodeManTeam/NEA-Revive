# Runtime Compatibility Gap Report

Generated: 2026-08-09T18:49:33.899Z

## Summary

- Documentation declarations: 599
- Current contract entries: 676
- Recovered compatible entries: 788
- Identifier/canonical matches: 416
- Documented declarations still missing: 183
- Local extensions not joined to documentation: 278
- Native: 125
- Compatible: 131
- Partial: 160
- Recovered only: 90
- Unavailable in selected provider: 1
- Declared only: 92

## By Runtime Side

- client: 125/126 represented; 1 missing
- server: 174/346 represented; 172 missing
- shared: 117/127 represented; 10 missing

## Recovery vs Implementation

- Client confirmed/native: 132
- Client declared/missing: 0
- Server confirmed but unimplemented: 440
- Server confirmed/bridged: 2
- Server confirmed/emulated: 53

## Interpretation

- Native, compatible and partial matrix states are executable classifications; partial still records unresolved behavioral gaps.
- Documentation declarations remain missing until Player/origin evidence and conformance tests prove compatibility.
- The upright Player default collision dimensions are recovered; crouch and flying historical shapes are explicit null fields with a non-historical preserve-current-collider compatibility policy.
- Per-contact fx/fy/fz production is recovered from the historical impulse solver; only the GameEntity.contactForce aggregate and local solver integration remain unresolved.

## Evidence Gaps

- Player posture producer: not-found-in-indexed-local-evidence
- Player posture representation: evidence-deferred
- Unknown posture wire fields: rx, ry, rz, hsx, hsy, hsz
- Unknown posture policy: preserve-current-collider; historical claim=false
- Blocking current phase: false
- Posture frame corpus: not-found-in-safe-local-frame-corpus
- Captured binary traffic: 1864 client-to-server; 0 server-to-client
- Indexed source sets: origin-server-runtime, lokibox-runtime-adapters, local-player-backend, archived-player-bundle, player-browser-profile, legacy-worktree, posture-delta-frame-corpus
- ContactBinding: reference-only
- Per-contact force: confirmed-historical-production-local-compatible
- Aggregate contactForce: unresolved

## Deferred Evidence

- player-posture-authoritative-shapes: not-found-in-indexed-local-evidence; blocking=false

## Immediate Priorities

1. Recover ContactBinding or equivalent server source to determine GameEntity.contactForce aggregation and active contact object reuse.
2. Integrate the recovered per-contact impulse force formula only with a compatible authoritative solver, not the current sweep approximation.
3. Bind recovered origin GameEntity and GamePlayer surfaces to server runtime adapters only after behavior matches.
4. Search other evidence-compatible historical Player providers before changing the confirmed-unavailable UiInput.placeholderOpacity classification for the selected archived provider.
