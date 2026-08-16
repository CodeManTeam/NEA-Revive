# AGENTS.md — mudb/

## 1. 核心使命（Project DNA）

Vendored MuDB (mikolalysenko/mudb) — the historical transport, kept as evidence. Read-only upstream: do not modify behavior here; compatibility conclusions live in `runtime-compat/`, runtime use lives in `demo-map`/`local-player`.

## 2. 目录导航地图（Path Mapping）

- `src/` — upstream TypeScript: `client.ts`, `server.ts`, `protocol.ts`, `logger.ts`, `schema/`, `stream/`, `rda/`, `replica/`, `rpc/`, `scheduler/`, `socket/`, `util/`.
- `schema/`, `stream/` — compiled JS output (gitignored), produced by `tools/build-mudb.mjs`; required by `local-player/src/block-info.mjs` and `demo-map`.
- `tool/mudo/` — mudo CLI tool.
- `example/` — upstream example.
- `package.json` — upstream package manifest (tape/ts-node test scripts).

## 3. 技术栈与环境约束（Tech Stack）

- TypeScript source, MIT. Tests are tape/ts-node based, not the repo-wide node:test convention (`npm test src/<pkg>/test/*.ts`).
- Compiled output is gitignored — regenerate via `tools/build-mudb.mjs` (compiles only schema + stream layers, pins TypeScript into `tools/.mudb-toolchain/`).

## 4. 给 AI 的特殊指令（Behavior Rules）

- Read-only upstream: do not modify behavior here; compatibility conclusions live in `runtime-compat/`, runtime use lives in `demo-map`/`local-player`.
- Edits allowed only for preservation metadata or corrections documented against upstream.

## 5. 常用自动化指令（Commands）

```bash
node ../tools/build-mudb.mjs   # from repo root: node tools/build-mudb.mjs
npm test src/<pkg>/test/*.ts   # upstream tape tests
```
