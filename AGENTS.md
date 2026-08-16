# NEA-Revive — 启动与结构速查

## 目录

```
NEA-Revive/
├── backend/
│   ├── box-go/        # 协议层 + runtime-server（mudb 20 协议组）
│   ├── demo-map/      # ScriptRuntime（执行地图脚本）
│   ├── local-player/  # 服务层 + block-info + archive（方块/avatar 素材）
│   └── node_modules   # 各子项目自装
├── frontend/voxweb/   # VoxWeb（Rust/WASM/WebGPU player）
├── Shared/mudb/       # mudb 本地源码副本（local-player 依赖）
├── Middleware/        # ABI 合规证据 + 一致性测试
├── packages/          # 项目包（parkour 首个）
│   └── parkour/       #   nea.map.json + world/ + scripts/
├── evidence/          # 证据映射 manifest.json（dump 仍留原位置）
└── README.md
```

## 启动后端（本地验证）

```powershell
cd backend\box-go
npm install   # 首次

# 启动 runtime-server（跑 packages/parkour）
node --import tsx -e "
import { startRuntimeServer } from './src/runtime-server.ts'
const server = await startRuntimeServer({
  port: 18081,
  sourceRoot: 'D:/Projects/Gaming/NEA-Revive/packages/parkour',
  assetRoot: 'D:/Projects/Gaming/NEA-Revive/backend/local-player/archive',
  buildRoot: 'D:/Projects/Gaming/NEA-Revive/.build/parkour',
})
console.log('READY', server.port)
"
```

## 启动前端（本地验证）

```powershell
cd frontend\voxweb
# 静态服务器服务 dist（先 trunk build 产出 dist）
```

前端通过 `?nea=http://127.0.0.1:18081/api/createSession` 激活 NEA smoke 路径。

## 测试

```powershell
# 后端（4 个握手/协议测试）
cd backend\box-go
npx tsx --test src/runtime-server.test.ts
npx tsx --test src/runtime-server-voxweb.test.ts
npx tsx --test src/runtime-server-driver.test.ts
npx tsx --test src/runtime-server-netstate.test.ts

# 前端（Rust）
cd frontend\voxweb
cargo test -p voxweb-protocol
```

## 数据来源

证据数据（DAO3 dump）仍在 `D:\Projects\Gaming\NEA-Project\Evidence\dump`，
由 `evidence/manifest.json` 映射。parkour 项目包的地形/脚本已提取到
`packages/parkour/`。
