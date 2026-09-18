# Box-GO / runtime-server

box-go 是 NEA-Revive 的协议和服务层。当前主入口是 src/runtime-server.ts，它把 MuDB
WebSocket、地图导入器、ScriptRuntime、共享方块目录和 HTTP 资源服务组合成一个可运行的
本地地图会话。

## 安装和检查

~~~powershell
cd backend\box-go
npm install
npm run typecheck
~~~

运行全套本目录测试：

~~~powershell
npx tsx --test src\*.test.ts
~~~

测试和 build root 使用 .build/ 下的临时目录，不会污染 packages/。

## 启动

推荐从仓库根目录启动前后端：

~~~powershell
cd ..\..
node scripts\serve.mjs --map there-is-backroom
~~~

只启动后端时：

~~~powershell
cd backend\box-go
node --import tsx -e "import('./src/runtime-server.ts').then(async ({startRuntimeServer}) => { const s = await startRuntimeServer({ port: 18081, sourceRoot: '../../packages/there-is-backroom', assetRoot: '../local-player/archive', buildRoot: '../../.build/there-is-backroom' }); console.log('READY', s.port) })"
~~~

服务提供：

- POST /api/createSession：创建地图会话；
- /ws：MuDB 三路 WebSocket 端点；
- 地图项目资源和生成的兼容数据；
- 本地开发所需的 loopback/CORS 行为。

## 握手链

VoxWeb 的 ?nea= 路径会按以下顺序建立会话：

~~~text
createSession
  -> 3 WebSocket 首帧可靠连接
  -> jsonStr / pong 协商
  -> gameNet.join
  -> secret
  -> sync / unpause
  -> gameTerrain.reset
  -> fetchChunk / chunkResponse
  -> net-state、avatar skin、模型和脚本资源
~~~

terrain reset 是世界 shape 的权威来源；客户端不得假定固定的 256 x 64 x 256 或其他地图
尺寸。

## 兼容实验入口

npm run compat 和 src/compat-server.ts 是早期抓包/协议实验入口，默认监听 8080。它用于
MuDB 协议重放和兼容性检查，不是当前 scripts/serve.mjs 的默认服务。抓包、token、session
id 和解出的运行时素材都属于本地证据，不能提交。

## 主要实现位置

| 内容 | 文件 |
| --- | --- |
| 协议定义 | protocol.ts |
| 服务整合 | src/runtime-server.ts |
| net-state 编码 | src/netstate.ts |
| 空 avatar 部件 | src/empty-avatar.ts |
| 协议/服务测试 | src/*.test.ts |

协议行为应同时由 wire 测试和端到端 smoke 覆盖。新增历史能力时，先记录 API 文档、地图脚本
调用和历史证据，再在通用层实现，不为地图名称增加分支。
