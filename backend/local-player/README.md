# NEA Local Player

Offline host for the manifest-verified historical DAO3/Box3 Player.

It serves the recovered Next.js Player, project bootstrap data, client scripts,
and content-addressed block/engine/avatar assets without contacting dao3.fun.

## Build

```powershell
npm run build
npm start
```

Open `http://127.0.0.1:4317/play/c40feef55d3bd7d9de36?contentId=100110008`.

`npm start` launches the recovered MuDB backend and historical Player together.
`npm run start:recovery` launches the earlier HTTP/WebSocket inspection harness.

ABI reports:

- `reports/runtime-abi.md` and `reports/runtime-abi.json`: startup HTTP,
  iframe bridge, socket topology, 20 Player protocols, and 12 Script protocols.
- `reports/abi.md` and `reports/abi.json`: public developer API inventory.

## Current status

- All 43 historical Player files are SHA-256 verified before serving.
- The Penpal iframe bridge reaches `data-local-bridge="ready"`.
- The Player calls `POST /api/createSession` and opens three MuDB sockets with one SID.
- The bundled backend registers all 20 recovered Player protocols.
- The recovered bootstrap, terrain chunks, model hashes, sound dictionary, and client modules are dispatched.
- A local `Guest` entity is created and the archived BedWars terrain renders in the historical Player.
- Map scripts, combat, full physics, persistence, and multiplayer rooms remain intentionally disabled for this stage.

## Map Script Demo

The separate `../demo-map` subproject compiles an editable `nea-map/v1` source project, starts a capability-gated server Script Runtime, publishes a historical Player `clientIndex.js`, and runs the generated map on port 4322.
