# NEA-Revive

类似 DAO3 的开发者社区本地化运行器。目标：给定一个**项目包**（地图 + 代码 + 素材 + 音乐），
后端 + 前端能将它在本地完整运行起来。

## 目录结构

```
NEA-Revive/
├── README.md           # 本文档
├── evidence/           # 证据数据（从 DAO3 dump 采集的原始资料，只读）
│   └── manifest.json   # 文件映射：证据数据仍留在原位置，这里只登记路径
├── backend/            # 自写后端（协议层 + 运行时层 + 服务层）
│   ├── box-go/         # mudb 协议层（20 协议组）+ runtime-server 整合
│   └── demo-map/       # ScriptRuntime（执行地图 server/client 脚本）
├── frontend/           # VoxWeb 前端（Rust/WASM/WebGPU player）
│   └── voxweb/         # crates/ tools/ 构建配置
└── packages/           # 项目包（每个地图一个目录）
    └── parkour/        # 首个项目包示例
        ├── project.json          # 项目包清单（地图/代码/素材/音乐清单）
        ├── world/                # 地形、实体、物理
        └── scripts/              # server/client 脚本
```

## 核心约定

### 1. 证据数据不复制、只映射
`evidence/` 下的 `manifest.json` 登记原始 dump 的绝对路径。4GB+ 的采集数据
（浏览器 profile、476MB websocket 帧、IPFS block 文件）仍留在
`D:\Projects\Gaming\NEA-Project\Evidence\dump`，不重复占用磁盘。
需要还原某个地图时，按 manifest 的路径读取源数据，提取结果落到
`packages/<map>/`。

### 2. 项目包格式（packages/<map>/）
`project.json` 描述一个可本地化运行的完整地图：
- `world`：地形（terrain）、实体（entities）、物理（physics）、spawn、shape
- `scripts`：server 脚本（权威逻辑）+ client 脚本（客户端表现）
- `assets`：方块贴图、avatar 模型、音频等素材清单（hash → 文件）
- 后端据此启动 ScriptRuntime 并走 mudb 协议；前端按 createSession 契约连接。

### 3. 后端三合一
- `box-go`：mudb 3-WS + 20 协议组（protocol.ts）+ createSession/join/secret/
  terrain reset/fetchChunk/net-state 握手（runtime-server.ts）
- `demo-map`：ScriptRuntime + GameVoxels + 事件信号（执行地图 server 脚本）
- 服务层（createSession 会话、静态资源 /avatar/m/、CORS）

### 4. 前端
VoxWeb（Rust/WASM/WebGPU）：`?nea=<createSessionUrl>` 激活 NEA smoke 路径，
走完整握手链（jsonStr 验证 → join → secret → sync/unpause → terrain reset →
fetchChunk → 渲染 + avatar + 加载界面）。

## 状态

- [x] 后端协议层 + runtime-server 整合（secret/reset/fetchChunk/net-state/avatar）
- [x] voxweb 前端握手 + 地形渲染 + 人物模型 + 加载界面
- [ ] 通用项目包格式固化（parkour 作为首个包）
- [ ] 项目包本地化端到端验证

## 数据来源与隐私

证据数据（DAO3 dump）是私有采集，包含真实地图代码/素材。本项目将其视为
还原素材直接使用（非净室开发）。不对外公开原始 dump；只提取还原所需的
匿名化/本地化产物。
