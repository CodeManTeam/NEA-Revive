# NEA-Revive

DAO3/box3 历史项目的本地复活运行器。它把一个地图项目包（地形、实体、脚本和素材）
加载到本地兼容后端，再由 Rust/WASM/WebGPU 的 VoxWeb 在浏览器中建立会话并渲染。

当前首个正式内容目标是 `there-is-backroom`；`parkour` 是协议、渲染和运行时的回归地图，
`minecraft` 用于大地图验证，其他 `packages/` 目录是导入或实验产物。

## 当前架构

```text
packages/<map>/
        |
        | importMapProject()
        v
.build/<map>/                 生成的 dao3.project.json、capabilities、资源索引
        |
        | ScriptRuntime + Box-GO runtime-server
        v
/api/createSession + 3 WebSockets (18081)
        |
        | ?nea=<createSessionUrl>
        v
frontend/voxweb/dist          VoxWeb player (18082)
```

- `backend/box-go`：MuDB 传输、20 组兼容协议、会话、地形、net-state、avatar 和资源服务。
- `backend/demo-map`：地图导入器、ScriptRuntime、能力门禁和脚本运行时模块。
- `backend/local-player`：共享方块目录、归档素材及历史 Player 兼容工具。归档数据可能被
  `.gitignore` 排除，不是干净 checkout 的必需输入，除非正在运行依赖它的本地恢复流程。
- `frontend/voxweb`：Rust workspace，编译为 WASM/WebGPU player。
- `Middleware/runtime-compat`：ABI 目录、证据生成器和一致性测试，不是运行时服务。
- `Shared/mudb`：本地 MuDB 源码副本；部分 Node 测试会按需编译它的 `schema` 和 `stream` 层。
- `evidence/manifest.json`：私有证据的路径映射。原始 dump 不复制进仓库。

完整数据流和模块责任见 [`docs/architecture.md`](docs/architecture.md)。

## 快速启动

先准备 Node.js、Rust、`wasm32-unknown-unknown`、Trunk，以及支持 WebGPU 的桌面浏览器。

```powershell
# 首次安装后端依赖
cd backend\box-go
npm install

# 构建浏览器端（产出 frontend/voxweb/dist，dist 已被 gitignore）
cd ..\..\frontend\voxweb
trunk build --release

# 启动默认地图：后端 18081，静态前端 18082
cd ..\..
node scripts\serve.mjs --map there-is-backroom
```

打开：

```text
http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession
```

也可以用 `--backend-port`、`--frontend-port` 修改端口；`NEA_MAP`、
`NEA_BACKEND_PORT`、`NEA_FRONTEND_PORT` 是对应的环境变量。导航文件声明的地图链接会在
需要时被 `serve.mjs` 一起启动，并分配连续的后端端口。

前端源码变化后必须重新执行 `trunk build --release`。浏览器仍显示旧版本时使用
Ctrl+Shift+R；开发服务器对 WASM、JS 和 HTML 使用重新验证缓存策略，但不会替代硬刷新。

## 验证

```powershell
# 后端类型检查和测试
cd backend\box-go
npm run typecheck
npx tsx --test src\*.test.ts

# Rust 协议和受影响 crate 的测试
cd ..\..\frontend\voxweb
cargo test -p voxweb-protocol
cargo test -p voxweb-client

# WASM 检查和生产构建
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
```

地图导入器、ScriptRuntime 和控制桥测试：

```powershell
cd backend\demo-map
npm test
npm run validate
```

完整验证矩阵、浏览器 smoke 检查和排错顺序见
[`docs/dev-workflow-and-debugging.md`](docs/dev-workflow-and-debugging.md)。

## 项目包

可运行地图以 `packages/<map>/nea.map.json` 为源清单，通常包含：

```text
packages/<map>/
├── nea.map.json
├── world/                 terrain.json、entities.json、physics.json
├── scripts/               server/client 入口和原始模块
├── source/                可选的标准导出源数据
└── assets/                可选的地图专属 mesh/audio/bootstrap
```

后端启动时通过 `importMapProject(sourceRoot, buildRoot)` 将源包导入 `.build/<map>/`；生成物
包括 `dao3.project.json`、能力清单和资源索引，不应手工编辑，也不应写回 `packages/`。
字段和导入边界见 [`packages/README.md`](packages/README.md)。

## 现状和边界

已具备：

- `createSession`、三路 MuDB WebSocket、join/secret/sync/unpause 握手；
- terrain reset/fetchChunk/chunkResponse 和通用世界 shape；
- net-state/avatar skin、静态实体和项目资源索引；
- VoxWeb NEA smoke 路径、地形/实体/avatar 渲染、输入和加载界面；
- `parkour` 回归包、`minecraft` 大地图包，以及 `there-is-backroom` 的导入包和脚本。

仍在推进：

- Backroom 原始脚本的能力清点和可检查启动闭环；
- Backroom 的最小完整游玩流程，包括脚本驱动的交互、UI、音频和状态收敛；
- 大地图的流式加载、视锥裁剪和更完整的历史视觉 parity；
- 多人、持久化和尚未有充分证据支持的历史 API。

“已实现”只表示当前代码和测试覆盖的兼容行为，不表示 DAO3 历史实现的完全等价。

## 证据与隐私

项目允许基于用户授权的 DAO3 dump 做非净室复原。私有 dump、浏览器抓包、凭据、原始运行时
bundle 和未审查素材不应提交。`evidence/manifest.json` 只登记本机路径；文档使用
`NEA_EVIDENCE_ROOT` 等占位符，运行时代码不得依赖这些变量。

## 文档导航

- [`docs/architecture.md`](docs/architecture.md)：系统边界、启动链和数据流。
- [`docs/project-revival-development-plan.md`](docs/project-revival-development-plan.md)：当前里程碑、完成定义和风险。
- [`docs/dev-workflow-and-debugging.md`](docs/dev-workflow-and-debugging.md)：验证、浏览器 smoke 和排错流程。
- [`docs/ai-assisted-development-workflow.md`](docs/ai-assisted-development-workflow.md)：AI 协作的任务边界和验收规则。
- [`backend/demo-map/docs/map-import-format.md`](backend/demo-map/docs/map-import-format.md)：导入器细节。
- [`backend/demo-map/docs/script-runtime.md`](backend/demo-map/docs/script-runtime.md)：脚本运行时契约和限制。

## Git 约定

每组可验证的修改使用一个 Conventional Commit（`docs:`、`fix:`、`feat:` 等），提交前运行
相关测试。不要提交 `.build/`、`dist/`、`target/`、私有 dump 或未经授权的素材。
