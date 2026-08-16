# AGENTS.md — local-player/

## 1. 核心使命（Project DNA）

Offline host for the recovered historical Player: backend, recovered runtime assets, launch tooling, and ABI reports. All served historical Player files are SHA-256 verified before serving; the backend registers only recovered MuDB protocols from `runtime-compat/abi/protocols.json` — no invented protocols.

## 2. 目录导航地图（Path Mapping）

- `backend/` — `box3-server.cjs` (recovered MuDB backend), `client-ui-state.cjs`, `start.cjs`.
- `src/` — `server.mjs` (static host), `client-runtime.mjs`, `websocket.mjs`, `block-info.mjs` (loads `mudb/schema` + `mudb/stream`).
- `runtime/` — recovered Player files (`assets/`, `responses/`, `http-cache/`, `cache-manifest.json`) served after SHA-256 verification.
- `archive/` — content-addressed block/avatar assets (read-only evidence, `archive/block/Qm…`, `archive/avatar/m/`).
- `reports/` — `runtime-abi.*` (startup HTTP, iframe bridge, socket topology, Player/Script protocols), `abi.*` (public developer API inventory).
- `tools/` — `scan-runtime-abi.mjs` (feeds `runtime-compat`), `extract-cache.mjs`, `extract-blockfile-cache.mjs`, `bundle-backend.cjs`, `legacy-ts-loader.mjs`, `patch-generic-remote-channel.cjs` + `backend-compat.patch` (explicit patches to preserved sources).

## 3. 技术栈与环境约束（Tech Stack）

- ESM, Node built-in test runner. Depends on compiled `mudb/schema` + `mudb/stream` output (see `tools/build-mudb.mjs`).

## 4. 给 AI 的特殊指令（Behavior Rules）

- `archive/` and `runtime/` are immutable recovered evidence — never regenerate or reorder.
- Compatibility patches are explicit patch files in `tools/`, not inline rewrites of preserved sources.
- Map scripts, combat, physics, persistence, multiplayer rooms are intentionally disabled in this stage — don't enable them here; that's `demo-map`'s scope.

## 5. 常用自动化指令（Commands）

```bash
npm run build
npm start                      # http://127.0.0.1:4317/play/c40feef55d3bd7d9de36?contentId=100110008
npm run start:recovery         # HTTP/WebSocket inspection harness
```
