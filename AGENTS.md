# NEA-Revive — Agent 开发指引

> 类似 DAO3 的开发者社区本地化运行器。给定一个「项目包」（地图 + 代码 + 素材 + 音乐），
> 后端 + 前端能在本地完整运行它。parkour（跑酷）是首个还原的项目包。

## 一、目录布局

```
NEA-Revive/
├── backend/
│   ├── box-go/          # 协议层 + runtime-server（mudb 20 协议组、握手、地形、net-state、avatar）
│   ├── demo-map/        # ScriptRuntime（执行地图 server/client 脚本）+ 地图导入
│   └── local-player/    # 服务层 + block-info（方块目录）+ archive（共享素材）
├── frontend/voxweb/     # VoxWeb（Rust/WASM/WebGPU player，7 crate）
├── Shared/mudb/         # mudb 本地源码副本（local-player 的 block-info 依赖）
├── Middleware/          # ABI 合规证据 + 一致性测试（demo-map 的 capability 依赖）
├── packages/            # 项目包（每个地图一个目录）
│   └── parkour/         # 首个项目包
├── evidence/            # 证据数据映射（dump 仍留原位置，manifest.json 登记路径）
├── scripts/serve.mjs    # 本地开发栈启动（后端 + 前端静态）
└── .build/              # 构建产物（gitignored）
```

## 二、启动 / 验证

### 后端（runtime-server，18081）
```powershell
cd backend\box-go
npm install          # 首次
node --import tsx -e "import('./src/runtime-server.ts').then(async m => {
  const s = await m.startRuntimeServer({
    port: 18081,
    sourceRoot: 'D:/Projects/Gaming/NEA-Revive/packages/parkour',
    assetRoot: 'D:/Projects/Gaming/NEA-Revive/backend/local-player/archive',
    buildRoot: 'D:/Projects/Gaming/NEA-Revive/.build/parkour',
  })
  console.log('READY', s.port)
})"
```

### 前端（VoxWeb，先 trunk build 出 dist）
```powershell
cd frontend\voxweb
trunk build --release      # 产出 dist/
```
前端通过 `?nea=<createSessionUrl>` 激活 NEA smoke 路径：
`http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession`

### 一键开发栈
```powershell
node scripts\serve.mjs     # 同时起后端(18081) + 前端静态(18082)
```

### 测试
```powershell
# 后端（4 个握手/协议测试，需先起一个 runtime-server 或测试内自起）
cd backend\box-go
npx tsx --test src/runtime-server.test.ts          # 会话/聊天/时钟
npx tsx --test src/runtime-server-voxweb.test.ts   # secret/reset/fetchChunk wire
npx tsx --test src/runtime-server-driver.test.ts   # voxweb SessionDriver 状态机
npx tsx --test src/runtime-server-netstate.test.ts # net-state 帧 + avatar skin part

# 前端（Rust）
cd frontend\voxweb
cargo test -p voxweb-protocol
```

## 三、核心架构约定

### 1. 后端三合一
- **box-go**：mudb 3-WS + 20 协议组（`protocol.ts`）。握手链：
  createSession → join → secret → sync/unpause → terrain reset → fetchChunk → chunkResponse；
  另含 net-state 帧（avatar_skin）+ models.appendSkinPartHashes（人物模型）。
- **demo-map**：`ScriptRuntime.load()` 加载导入后的项目，执行地图 server 脚本；
  `importMapProject()` 读 nea.map.json，展开 terrain boxes → voxels。
- **local-player**：`block-info.mjs` 加载方块目录（blockId → 名称/贴图）。

### 2. 项目包格式（packages/<map>/）
`nea.map.json` 声明世界/脚本/能力；`world/` 地形实体物理；`scripts/` server+client；
`assets/`（可选）声明专属素材，缺省回退 archive 共享素材。
详见 `packages/README.md`。

### 3. 前端握手（voxweb）
`?nea=` 触发 `nea_smoke::run()`：createSession → 3 WS（首帧 reliable）→ jsonStr 验证 →
pong 协商 → join → secret → sync/unpause → reset → fetchChunk → 渲染 + avatar + 加载界面。

### 4. 证据数据不复制、只映射
`evidence/manifest.json` 登记 dump 原位置。提取某地图时按路径读源，产物落
`packages/<map>/`。

## 四、关键实现位置

| 功能 | 文件 |
|------|------|
| 协议 schema（20 组） | `backend/box-go/protocol.ts` |
| runtime-server 整合 | `backend/box-go/src/runtime-server.ts` |
| net-state 帧编码 | `backend/box-go/src/netstate.ts` |
| 空 avatar 部件 | `backend/box-go/src/empty-avatar.ts` |
| 地图导入 | `backend/demo-map/src/import-project.mjs` |
| ScriptRuntime | `backend/demo-map/src/runtime/script-runtime.mjs` |
| 方块目录 | `backend/local-player/src/block-info.mjs` |
| 前端握手/渲染 | `frontend/voxweb/crates/client/src/nea_smoke.rs` |
| 协议表（voxweb） | `frontend/voxweb/crates/protocol/src/` |
| 加载界面 | `frontend/voxweb/crates/client/src/nea_loading.rs` |
| 阴影（空部件跳过） | `frontend/voxweb/crates/render/src/{nea_shadow,avatar_shadow,avatar_pipeline}.rs` |

## 五、数据与隐私

证据数据（DAO3 dump）为私有采集，含真实地图代码/素材，用户已授权**非净室开发**
（直接使用 dump 数据还原）。原始 dump 不纳入 git；`evidence/manifest.json` 只做映射。

## 六、注意事项

- **不要**在 box-go 里硬编码 `NEA-Project` 路径——一律用新目录相对路径。
- 测试文件里 buildRoot 用 `.build/` 前缀，避免污染 packages。
- 前端改动后必须 `trunk build --release` 才在 dist 生效；浏览器需硬刷新（Ctrl+Shift+R）
  绕过旧 wasm 缓存。
- parkour 项目包的 terrain.json 是**简化版**（8 个 box）；完整地形（32902 voxels）
  需从 dump 的 websocket 帧提取，属后续工作。
