# 开发、验证与排错

本文描述当前 NEA-Revive 的实际工作路径。历史视觉报告和 bug 记录保留在 docs/，但其中
的端口、提交或截图结论只代表各自记录时点；遇到冲突时以源码、测试和当前启动命令为准。

## 先确认边界

修改前回答：

1. 行为属于协议、runtime-server、ScriptRuntime、VoxWeb 还是地图脚本？
2. 能否由 API 文档、原始脚本、wire/frame 或截图证据支持？
3. 修改是否会把地图特例带入通用引擎？
4. 最小可观察验收是什么？

原始地图脚本原则上不改；缺失能力进入通用 runtime。#nea-client-ui 是地图 UI，
#nea-engine-ui 是引擎系统 UI，不能互相清空或污染。

## 标准循环

~~~text
git status / diff
  -> rg 找到真实调用点
  -> 语法或最小 fixture
  -> 针对性测试
  -> 后端/前端构建
  -> 浏览器 smoke
  -> 独立复查 diff 和文档
~~~

每轮只验证一个主要假设。浏览器问题优先检查真实状态：

~~~js
document.querySelector(selector)
document.activeElement
getComputedStyle(element)
element.getBoundingClientRect()
~~~

## 验证矩阵

### JavaScript 和后端

~~~powershell
cd backend\box-go
npm run typecheck
npx tsx --test src\*.test.ts

cd ..\demo-map
npm test
npm run validate
~~~

demo-map 的 npm test 会按需编译 Shared/mudb 的 schema 和 stream 层。

### Rust 和 WASM

~~~powershell
cd frontend\voxweb
cargo fmt --all -- --check
cargo test -p voxweb-protocol
cargo test -p voxweb-client
cargo test -p voxweb-render
cargo check --workspace --target wasm32-unknown-unknown
trunk build --release
~~~

### 浏览器 smoke

~~~powershell
cd D:\Projects\Gaming\NEA-Revive
node scripts\serve.mjs --map there-is-backroom
~~~

至少记录：loading 是否结束、pageerror/console、canvas 像素是否非空、spawn/camera、静态
实体、avatar、地图 UI、输入和新 dist/ 是否实际被加载。前端源码变更必须经过 Trunk 构建；
开发服务器正在运行时也应硬刷新浏览器。

## 常见误区

- 把 .build/<map>/dao3.project.json 当作源文件编辑；它是导入器生成物。
- 把固定地图 shape 写进前端；shape 由 terrain reset 帧提供。
- 把 Backend/、Docs/ 大写路径复制到新文档；当前仓库目录是 backend/、docs/。
- 只看 Rust 编译成功就认为浏览器已生效；还要检查静态服务器实际返回的 dist/。
- 用裸 DOM 重建历史系统 UI；先确认它属于引擎、地图脚本还是外层页面。
- 看到 pointer-lock 冷却错误就改代码；浏览器退出锁定后的短暂拒绝通常是平台行为。

## 证据优先级

1. DAO3 API 文档镜像；
2. 原始地图脚本的实际调用；
3. 历史 bundle、dump、wire 帧、UI 树和截图；
4. 当前测试和运行结果。

来源冲突时记录“历史定义、当前选择、验证结果和未解决差异”，不要把推断写成已证明。

## 完成定义

一项修改只有在源代码、相关测试、构建产物和用户可观察行为都符合目标时才算完成。提交前
检查 git diff --check，使用一个表达完整逻辑的 Conventional Commit，并说明未运行的验证。
