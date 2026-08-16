# NEA-Revive

**类似 DAO3 的开发者社区本地化运行器。** 给定一个「项目包」（地图 + 代码 + 素材 + 音乐），
后端 + 前端能在本地完整运行它。首个还原目标：**跑酷（parkour）**地图。

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

# 2. 启动后端 + 前端静态
cd ..\..\
node scripts\serve.mjs

# 3. 打开（浏览器需 WebGPU，Edge/Chrome ≥113）
# http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession
```

后端（18081）加载 `packages/parkour` 项目包；前端（18082）走完整握手链
（createSession → 3 WS → join → secret → 地形 → 人物模型）。

## 项目包格式

每个地图一个目录，核心是 `nea.map.json`：

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
- [x] parkour 项目包（首个，地形为简化版）
- [ ] parkour 完整地形提取（从 dump websocket 帧）
- [ ] 更多项目包（通用化验证）

## 开发指引

详见 [`AGENTS.md`](AGENTS.md)。
