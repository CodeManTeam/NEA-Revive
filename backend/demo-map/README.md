# Demo-map ScriptRuntime

本目录提供地图导入器、能力门禁和 ScriptRuntime。它既支持仓库当前的
packages/<map> -> runtime-server 主路径，也保留一个独立的本地 Player control bridge
demo，用于验证脚本 API 和后端投影。

## 当前主路径

真实地图由仓库根目录启动：

~~~powershell
cd D:\Projects\Gaming\NEA-Revive
node scripts\serve.mjs --map there-is-backroom
~~~

主路径使用 backend/box-go/src/runtime-server.ts，导入 packages/<map> 到 .build/<map>，
不经过本目录的历史 Player 启动器。

## 本目录命令

~~~powershell
cd backend\demo-map
npm test
npm run validate
npm run build
npm run test:control-bridge
~~~

- npm test：运行 Node 内置测试；首次运行会按需编译 Shared/mudb 的 schema 和 stream；
- npm run validate：检查示例项目导入；
- npm run build：生成示例的兼容项目；
- npm run test:control-bridge：验证 loopback-only control bridge 的认证、必填参数和错误契约。

## ScriptRuntime 边界

输入是 nea-map/v1 项目，输出是运行时消费的 dao3-project/v1 生成包。server/client 是
分离的 runtime realm；一侧的 capability 不会授予另一侧。能力门禁必须有 API 文档、原始
脚本调用或历史证据支持，不能由名称推断为已实现。

server-side player 模型按 20 Hz 固定步进运行。姿态策略是：完整的权威
bodyHalfExtents/bodyShapeHalfExtents 更新替换碰撞体；明确的未知 null 姿态保留当前碰撞体；
部分更新拒绝。

## 历史 Player demo

~~~powershell
npm run probe:remote
npm start
~~~

该 demo 启动遗留 Player 和 control bridge，默认 Player 端口为 4322、control bridge 为
4323，随机 token 且只监听 loopback。它用于脚本运行时的独立验证，不是当前前端 NEA smoke
入口。多实例运行时为每个实例设置独立的 NEA_DEMO_BUILD_ROOT、NEA_DEMO_PLAYER_PORT 和
NEA_DEMO_CONTROL_PORT。

示例地图在 project/，showcase/ 是能力画廊，生成输出是 build/ 或指定的临时 build root；
生成物不要手工编辑。

完整的导入字段和脚本 API 限制见 docs/map-import-format.md 与 docs/script-runtime.md。
