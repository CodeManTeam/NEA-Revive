# NEA-Revive 架构

## 目标

NEA-Revive 在本地重建 DAO3/box3 地图会话：项目包提供地图和脚本，通用后端提供历史兼容
协议与运行时，VoxWeb 提供浏览器 player。项目不是单张地图的重写器；可复用能力应落在
导入器、ScriptRuntime、协议层或 player 中。

## 启动链

```text
scripts/serve.mjs
  ├─ backend/box-go/src/runtime-server.ts
  │    ├─ importMapProject(packages/<map>, .build/<map>)
  │    ├─ ScriptRuntime.load(generated project)
  │    ├─ block-info + archive asset resolver
  │    └─ MuDB HTTP/WebSocket server
  └─ frontend/voxweb/dist static server
       └─ start.html?nea=http://127.0.0.1:18081/api/createSession
```

`serve.mjs` 默认监听后端 `18081`、前端 `18082`。地图导航可以声明其他本地地图，脚本会
为它们启动额外的后端端口，并把本地链接改写为对应的 `createSession` URL。

## 后端边界

### Box-GO

`protocol.ts` 定义 MuDB 兼容协议。 `runtime-server.ts` 负责 HTTP 会话、三路 WebSocket、
握手状态、terrain、net-state、avatar、模型/脚本资源和 ScriptRuntime 事件桥。握手主线是：

```text
createSession -> socket setup -> join -> secret -> sync/unpause
-> terrain reset -> fetchChunk -> chunkResponse -> net-state/avatar
```

### Demo-map

`import-project.mjs` 把 `nea-map/v1` 源包转换为运行时可消费的 `dao3-project/v1` 生成包。
`src/runtime/` 提供 server/client 脚本所需的通用对象、事件、world、GUI、storage、voxel、
raycast 和 physics 能力。能力清单是门禁，不是能力实现本身。

### Local-player

`block-info.mjs` 和 archive resolver 为运行时提供 block/avatar/engine 资源。早期恢复 Player
的 `backend/` 和 `src/server.mjs` 是遗留工具，不是新栈的调用入口。

## 前端边界

VoxWeb 各 crate 按协议、网络、物理、渲染和客户端整合分层。 `nea_smoke.rs` 只负责 NEA
会话启动和协议消费；渲染器从 reset/frame 数据读取 shape 和实体，而不是为 parkour、
Minecraft 或 Backroom 写地图分支。客户端脚本 UI 使用 `#nea-client-ui`，引擎系统 UI 使用
`#nea-engine-ui`。

## 数据和生成物

```text
源包 packages/<map>
  -> .build/<map>/dao3.project.json
  -> runtime-server 内存状态
  -> wire frames
  -> VoxWeb world/render state
```

`.build/`、`frontend/voxweb/dist` 和 Rust `target/` 都是生成物。 `packages/` 中的原始脚本、
world 数据和专属素材是源数据；生成的 project 不应反向覆盖它们。

## 证据和兼容性

历史 API 的实现判断依次使用 API 文档、原始脚本、历史 bundle/wire/UI 证据和当前测试。ABI
分析由 `Middleware/runtime-compat` 生成；状态词汇区分 declared、confirmed、native、
bridged、emulated 和 missing。没有证据的行为必须记录为 gap 或 evidence-deferred。

`evidence/manifest.json` 只映射本地私有证据位置。运行时代码不读取该 manifest，也不应依赖
某一台机器的绝对路径。

## 地图角色

| 地图 | 角色 | 当前用途 |
| --- | --- | --- |
| `there-is-backroom` | 正式内容目标 | 脚本/API 清点、启动闭环、玩法恢复 |
| `parkour` | 回归地图 | 协议、地形、实体、输入和脚本 runtime 回归 |
| `minecraft` | 大地图验证 | `256 x 128 x 256` shape、稀疏体素和性能 |
| `bedwars-s2*` | 导入/历史 Player 验证 | UI、实体、素材和脚本恢复实验 |

地图角色不会改变通用 runtime 的实现边界。
