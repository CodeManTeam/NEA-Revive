# AI 协作开发流程

这份流程约束 AI 在 NEA-Revive 中如何调查、修改和验收，重点是保留历史证据边界并避免把
地图专属行为硬编码进通用运行时。

## 开始前

明确五件事：目标、允许修改的范围、非目标、依据和验收标准。先读取相关源码和文档，再检查：

~~~powershell
git status --short
git diff --stat
rg -n "目标符号|事件名|协议名" .
~~~

不要假定旧任务文档仍代表当前架构；确认入口是否已迁移到 scripts/serve.mjs、
backend/box-go/src/runtime-server.ts 或 VoxWeb NEA smoke。

## 硬约束

- 原始地图脚本原则上不修改；
- 不为单张地图写 adapter；
- 不在引擎加入地图名称或 content id 分支；
- 能力必须同时有 API、脚本调用和历史证据支持；
- client/server 是分离 runtime，一侧的 capability 不授予另一侧；
- 地图 UI 与引擎系统 UI 分层；
- 私有 dump、凭据、抓包和生成产物不提交。

## 工作循环

~~~text
目标和边界
  -> 读取源码/证据
  -> 最小可验证假设
  -> 最小修改
  -> 相关测试
  -> 构建和浏览器 smoke
  -> 独立检查 diff
  -> 更新长期有效文档
~~~

临时 probe 只验证一个问题，用完删除；如果同一行为需要反复验证，再沉淀为正式测试。

## 分层验收

1. node --check 或 TypeScript typecheck；
2. 受影响的 Node/Rust 测试；
3. trunk build --release（前端源码变化时）；
4. 运行 node scripts/serve.mjs --map <map>；
5. 浏览器检查 loading、pageerror、canvas、spawn、实体、UI、输入和网络握手；
6. 回读源码、diff、测试输出和文档，区分 verified、partial、blocked 和 unknown。

## 汇报格式

~~~text
目标：
证据：
修改：
验证：
状态：
剩余：
~~~

不要把“代码看起来正确”写成通过；没有运行的命令必须明确标注。
