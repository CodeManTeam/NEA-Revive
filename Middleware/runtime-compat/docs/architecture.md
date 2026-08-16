# Runtime Compatibility Architecture

## Layers

1. **Project Package** loads exported map data, assets, script entries and requested capabilities without granting implementation access directly.
2. **Client Script Runtime** executes the map's client script inside the archived Player environment or a future compatible sandbox. It owns client-only UI, input, audio, media and client event APIs.
3. **Server Script Runtime** executes the authoritative map script in an isolated VM. It exposes only versioned server ABI entries granted by project capabilities.
4. **MuDB Transport** preserves historical protocol names and schemas. It serializes transport envelopes but does not interpret map-specific event payloads.
5. **Authoritative Game Runtime** owns players, entities, physics state, ticks and accepted state transitions. Script and network layers submit commands instead of mutating transport state directly.

## Recovered Client Script Flow

1. The authoritative side sends the `game-net.syncClientScriptModules` dictionary.
2. Player clones the dictionary into `state.clientModules`.
3. Client Runtime starts `clientIndex.js` after world synchronization.
4. A locked-down SES `Compartment` resolves relative imports from the delivered dictionary.
5. The Compartment receives an explicit client-only global object: UI, input, screen, world rendering state, HTTP, media, timers, math/vector helpers and `remoteChannel`.
6. Client events are queued until the isolate starts; remote payloads cross MuDB as JSON strings with authoritative ticks.

Client Script Runtime is therefore not a browser-global copy and not a second Server Runtime. Its ABI must be cataloged and versioned independently.

## RemoteChannel Boundary

- MuDB owns the fixed `{ tick, args }` envelope; `args` is UTF-8 JSON text.
- Client scripts send arbitrary JSON-serializable values, not transport schema objects.
- Incoming packets are cloned into the client event state and remain queued until the SES isolate starts.
- Malformed incoming JSON is ignored by the historical Player instead of reaching script listeners.
- Listener lifecycle is part of the client ABI: subscribe, remove one listener, or clear all listeners when the isolate stops.
- The executable fixture under `Middleware/runtime-compat/conformance/` describes only these directly observed behaviors; it is not a substitute implementation for unrecovered APIs.

## Server Adapter Rule

- Local server globals use ergonomic access paths such as `world.onTick`; canonical declarations retain class owners such as `GameWorld.onTick`.
- `implements` is emitted only for behavior judged structurally compatible. Similar names with different event payloads, target cardinality, selector grammar or delivery effects remain `partial` adapters.
- Server event tokens preserve the recovered `cancel()`, `resume()` and `active()` lifecycle, including duplicate handler registrations.
- Local tick events expose the recovered `tick`, `prevTick`, `elapsedTimeMS` and `skip` fields. Tick delay and skip calculation remain partial until the historical scheduler is conformed.

## Compatibility Rules

- Documentation proves that an API was declared, not that its behavior has been recovered.
- Player bundle, origin source or protocol schema is required for `confirmed` availability.
- Local implementations remain `emulated` or `bridged` until conformance fixtures prove historical behavior.
- Client and server globals use separate contracts even when names overlap.
- Physics dimensions and coordinate origin are profile data, never magic constants in the solver.
- Unsupported APIs must fail explicitly and must not silently return plausible dummy values.

## Version Negotiation

Each project requests a runtime contract version and capabilities. The loader resolves every requested entry to one of `native`, `bridged`, `emulated` or `missing`; startup fails when a required entry is missing. Optional entries are exposed through a capability query rather than feature guessing.

Capability identifiers are side-qualified. Client scripts request `client.*` capabilities and server scripts request `server.*` capabilities; unqualified or cross-side grants are rejected by the architecture conformance build.

The executable registry is generated at `Middleware/runtime-compat/abi/runtime-contracts.json`. It binds the five layers, both script contracts, MuDB protocol dependencies, authoritative state flows, Demo script usage and resolved ABI entry identifiers. `Middleware/runtime-compat/abi/current-runtime.json` is also generated from the Player and local Server Runtime analyzers rather than maintained as a hand-written subset.
