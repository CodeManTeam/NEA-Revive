# Local Player 支持层

本目录保存共享方块目录、归档素材、历史 Player 的本地服务工具，以及供
box-go/demo-map 使用的资源解析模块。它不是当前 VoxWeb 开发栈的主 HTTP 入口；主入口是
仓库根目录的 scripts/serve.mjs。

## 目录职责

- src/block-info.mjs：加载 block id、名称和贴图信息；
- archive/：共享的 content-addressed block/avatar/engine 资源，可能被 .gitignore 排除；
- backend/：早期恢复 Player 的本地启动器和兼容 backend；
- src/server.mjs：早期 HTTP/WebSocket inspection harness；
- tools/：归档提取、ABI 扫描和兼容补丁工具；
- reports/：ABI 扫描生成的报告。

## 当前推荐路径

运行地图复活栈：

~~~powershell
cd D:\Projects\Gaming\NEA-Revive
node scripts\serve.mjs --map there-is-backroom
~~~

runtime-server 会把 backend/local-player/archive 作为共享 asset root。没有授权归档数据的
干净 checkout 可以进行协议、导入器和部分 VoxWeb 测试，但不能声称完成真实素材渲染。

## 早期恢复 Player

需要检查旧的恢复 Player 时：

~~~powershell
cd backend\local-player
npm run build
npm start
npm run start:recovery
~~~

npm start 使用 backend/start.cjs 和历史 Player backend，默认端口为 4317；这是遗留验证
路径，不应与 scripts/serve.mjs 混用同一端口。恢复的 runtime、bundle、抓包和 token 只允许
在本地授权环境使用。

## 边界

归档文件视为只读证据；兼容改动应放在显式的工具/补丁文件或通用 runtime 中。不要在这里
开启地图脚本、战斗、完整物理、持久化或多人房间，这些能力属于 demo-map、box-go 和
VoxWeb 的主开发路径。
