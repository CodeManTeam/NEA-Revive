# NEA-Revive

**DAO3/box3 历史项目本地复活运行器。** 给定一个「项目包」（地图 + 代码 + 素材 + 音乐），
通过通用运行时和 VoxWeb Player 在本地复活它。当前首个正式内容目标是
**There is Backroom-新年快乐（there-is-backroom）**；Parkour 是既有的技术验证和回归地图。

## 这是什么

DAO3（box3）是一个 UGC 体素游戏社区。本项目目标是：把从 DAO3 采集的项目包
（地形、server/client 脚本、方块/avatar 素材、音频）在本地重新跑起来，
后端自写、前端用 VoxWeb（Rust/WASM/WebGPU）改造的 player。

## 目录结构

```
NEA-Revive/
├── backend/            # 自写后端（协议层 + 运行时层 + 服务层）
│   ├── box-go/         #   mudb 协议层 + runtime-server
│   ├── demo-map/       #   ScriptRuntime + 地图导入
│   └── local-player/   #   block-info + archive 共享素材
├── frontend/voxweb/    # VoxWeb 前端（Rust/WASM/WebGPU）
├── Shared/mudb/        # mudb 本地副本（依赖）
├── Middleware/         # ABI 合规证据 + 一致性测试
├── packages/           # 项目包（每个地图一个目录）
├── evidence/           # 证据数据映射（dump 留原位置）
├── scripts/serve.mjs   # 一键本地开发栈
└── .build/             # 构建产物（gitignored）
```

## 快速开始

```powershell
# 1. 构建前端（一次性，产出 frontend/voxweb/dist）
cd frontend\voxweb
trunk build --release

# 2. 启动后端 + 前端静态（--map 选择项目包）
cd ..\..\
node scripts\serve.mjs --map there-is-backroom

# 3. 打开（浏览器需 WebGPU，Edge/Chrome ≥113）
# http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession
```

后端（18081）加载 `packages/<map>` 项目包；前端（18082）走完整握手链
（createSession → 3 WS → join → secret → 地形 → 人物模型）。世界 shape（含 128 高的
minecraft）由 terrain reset 帧动态下发，前后端均已通用化，不再硬编码 256×64×256。

## 项目包格式

每个地图一个目录。当前项目包存在两类清单格式：`nea.map.json`（nea-map/v1）和
导入产物使用的 `dao3.project.json`（dao3-project/v1）。运行时通过导入器和 manifest
读取对应格式。典型 `nea.map.json` 示例：

```jsonc
{
  "formatVersion": "nea-map/v1",
  "id": "parkour-demo",
  "world": {
    "shape": [64, 32, 64],
    "spawn": [16, 12, 32],
    "terrain": "world/terrain.json",
    "entities": "world/entities.json",
    "physics": "world/physics.json"
  },
  "scripts": {
    "server": "scripts/server.js",
    "client": "scripts/client.js",
    "serverCapabilities": ["server.world.events", "server.world.chat", "..."]
  }
}
```

详见 [`packages/README.md`](packages/README.md)。

## 技术要点

- **后端三合一**：mudb 20 协议组（`box-go/protocol.ts`）+ ScriptRuntime（执行地图脚本）
  + 服务层（createSession 会话、静态资源、CORS）。
- **握手链**：createSession → join → secret（原始帧）→ sync/unpause → terrain reset →
  fetchChunk → chunkResponse（体素盒）→ net-state（玩家/avatar）。
- **前端**：VoxWeb `?nea=` 激活 NEA smoke 路径，Rust 协议表与后端 wire 逐字节兼容。

## 数据来源与隐私

证据数据（DAO3 dump）为私有采集，含真实地图代码/素材。经授权**非净室开发**：
直接使用 dump 数据还原。原始 dump（约 4GB）不纳入 git，
由 `evidence/manifest.json` 映射原位置。

## 状态

- [x] 独立工作目录 + git 管理
- [x] 后端握手链（secret/reset/fetchChunk/net-state/avatar）
- [x] 前端握手 + 地形渲染 + 人物模型 + 加载界面
- [x] parkour 项目包（技术验证和回归地图，地形 + 55 方块 + 真实贴图集）
- [x] 世界 shape 通用化（前后端从 reset 帧读取，支持 256×128×256）
- [x] minecraft 项目包（第二个：voxel-sparse 地形 1.17M 体素 → 42,837 盒）
- [x] there-is-backroom 项目包（内容和脚本较完整，作为首个正式复活目标）
- [ ] Backroom 原始脚本 API 依赖清点（DAO3 API 文档 + 脚本调用 + 历史证据）
- [ ] Backroom 可检查启动闭环
- [ ] Backroom 最小完整游玩闭环
- [ ] minecraft 完整玩法脚本（原 index.js 依赖 20+ 未导出模块）
- [ ] 全图流式加载/视锥裁剪（当前 ?nea= 烟测渲染出生点周围 5×5 × 全高）

## 开发指引

详见 [`AGENTS.md`](AGENTS.md) 和
[`docs/project-revival-development-plan.md`](docs/project-revival-development-plan.md)。
