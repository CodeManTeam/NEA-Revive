# AGENTS.md — demo-map/

## 1. 核心使命（Project DNA）

Reference project: editable `nea-map/v1` source -> importer -> capability-gated server Script Runtime -> historical Player on port 4322. Capability gates must be evidence-backed; capabilities confirmed on one side never grant the other side.

## 2. 目录导航地图（Path Mapping）

- `project/` — editable sample map (`nea.map.json`, `scripts/` client+server, `world/` entities/physics/terrain). Hand-edited input.
- `tools/import.mjs` — compiles `project/` into `build/project/` (generated `dao3-project/v1` package; never hand-edit `build/`). Also `--check`, `probe-remote-channel.cjs`, `inspect-player-ui-schema.cjs`.
- `src/` — server (`server.mjs`), importer (`import-project.mjs`), runtime package (`runtime-package.mjs`), capability gates (`capability-*.mjs`), control client (`control-client.mjs`).
- `src/runtime/` — server Script Runtime: script-runtime.mjs, game-* modules (world, gui, storage, voxels, zones, selector, raycast, sound, body part), physics/, vector/quaternion, colors, event-signal, commonjs-module-loader.
- `test/` — `node --test` suites mirroring `src/`.
- `docs/` — `map-import-format.md`, `script-runtime.md`: current contracts and limitations.

## 3. 技术栈与环境约束（Tech Stack）

- ESM, Node built-in test runner. Vendored MuDB has no compiled output in git — imports of `../../mudb/schema` fail on a fresh clone until compiled.

## 4. 给 AI 的特殊指令（Behavior Rules）

- `npm test`/`npm start` auto-run `../tools/build-mudb.mjs` first. Don't work around missing `mudb/schema` modules by hand.
- Client/server runtimes are separate realms; capabilities confirmed on one side never grant the other.
- Body posture policy: explicit `null` unknown shapes preserve the current collider; complete updates replace it; partial updates rejected.
- Control bridge on 4323 is loopback-only, random token by default.

## 5. 常用自动化指令（Commands）

```bash
npm test
npm run build
npm run validate   # import --check
npm start          # http://127.0.0.1:4322/play/nea-script-lab?contentId=100110008
```
