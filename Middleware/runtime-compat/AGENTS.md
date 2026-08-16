# AGENTS.md — runtime-compat/

## 1. 核心使命（Project DNA）

Machine-readable ABI catalogs, evidence generators, conformance fixtures, and generated reports. Every claim needs a conformance fixture; when evidence is absent, record an explicit gap — do not synthesize APIs.

## 2. 目录导航地图（Path Mapping）

- `tools/` — generators & extractors, one per artifact (`extract-*.mjs` = pull from evidence, `build-*.mjs` = compose, `inventory-*.mjs` = catalog private data, `generate-gap-report.mjs` = reports, `import-script-corpus.mjs` = anonymous works samples).
- `abi/` — derived catalogs (client/server runtime, protocols, contracts, adapter maps, compatibility matrix).
- `generated/` — derived reports/analysis JSON + MD (incl. `gap-report.md`, `capability-gate-audit.*`, `phase-5-audit.*`). Machine output; large.
- `conformance/` + `test/` — executable conformance fixtures and `node --test` suites; every claim needs one.
- `evidence/` — hand-vetted evidence summaries (script corpus usage, player body origin, server voxels).
- `docs/architecture.md` — how the layers and generators fit together.
- `schema/runtime-abi.schema.json` — validates `abi/*.json` shape.

## 3. 技术栈与环境约束（Tech Stack）

- ESM, Node built-in test runner. Status vocabulary: `declared` / `confirmed` / `native` / `bridged` / `emulated` / `missing` — declarations never count as implementations.

## 4. 给 AI 的特殊指令（Behavior Rules）

- `generated/` and `abi/` are derived artifacts: never hand-edit; change the generator in `tools/`, then `npm run build`.
- Read `generated/gap-report.md`, never cat the raw JSON in `generated/` (large, machine-only).
- Add a conformance fixture next to any new claim.

## 5. 常用自动化指令（Commands）

```bash
npm run build   # extract -> report -> audit (regenerates abi/ + generated/)
npm test        # node --test
```
