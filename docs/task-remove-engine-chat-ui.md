# 引擎系统 UI 收敛任务（已完成：移除引擎聊天 UI）

> 执行者：sub-agent。本文件是任务的唯一权威输入，不要自行扩张范围。
> 项目根：`D:/Projects/Gaming/NEA-Revive`。

状态：**已完成（2026-08-18）**。本文件保留作为实现和验收记录。

## 一、背景与决策（已和用户确认，不要改方向）

1. 引擎系统（client-runtime bundle）**不自带聊天 UI**。DAO3 的聊天面板在外层 iframe 提供。
2. voxweb 是自包含页面（`start.html`），没有外层 iframe，**本次先不做聊天 UI**。
3. 引擎系统 UI（血条 / 死亡提示 / gameplayHUD / 对话框 / 玩家 modal）**由引擎还原**，已实现并保留（见下「现状」）。

因此本任务的核心：**移除上一轮我在引擎层手写的聊天 UI**，只保留聊天消息的后端解码（不渲染）。其余引擎系统 UI 保持现状。

## 二、唯一要改的文件

`frontend/voxweb/client-script-runtime.js`

这是一个 IIFE（浏览器加载后把 `__neaClientRuntimeInstall/Receive/Drain` 挂到 window）。

## 三、要删除的聊天 UI（全部在 `client-script-runtime.js` 内）

按代码内容定位（行号会随编辑漂移，用内容搜索）：

1. **聊天输入框** —— 从 `const chatInput = createUiNode("input");` 开始，到 `chatInput.parent = engineHost;` 结束的整块（含 `placeholder`、anchor/position/size/background 等赋值）。
2. **聊天历史缓冲与追加** —— `let chatHistoryText = null;`、`const chatLines = [];`、`function appendChatLine(...)` 整段。
3. **关闭聊天** —— `function closeChat() {...}` 整段。
4. **T 键聊天监听** —— `window.addEventListener("keydown", event => {...}, true);` 里**处理聊天输入的整段**（从 `if ((event.code === "KeyT" ...` 到 `closeChat();` 结束的整个 listener）。注意：这个 listener 是聊天专用；若文件里还有别的 keydown listener（例如引擎其他快捷键），只删聊天那个。
5. **聊天面板** —— 从 `const chatBox = createUiNode("box");` 开始，到 `chatHideTimer = setTimeout(...)` 结束的整块（含 `chatHistoryText = createUiNode("text")`、`showChatPanel` 函数、`chatHideTimer` 声明）。注释「引擎级聊天面板…显示 canonical game-chat.log」一并删。
6. **chat 事件渲染分支** —— 在 `receive(json)` 里：
   ```js
   else if (event?.type === "nea-revive:chat") {
     if (event.valid === false) return;
     appendChatLine(event.message ?? "", ...);
   }
   ```
   把它改成**只保留解码、不渲染**：
   ```js
   else if (event?.type === "nea-revive:chat") {
     // 引擎不自带聊天 UI：仅保留解码，不渲染。后续由外层页面接管。
     if (event.valid === false) return;
     // intentionally not rendered
   }
   ```

## 四、必须保留（不要动）

- 引擎系统 UI 节点，均挂在 `engineHost`（`{ element: engineUiRoot }`）上，用 `createUiNode` 创建：
  - `damageLayer`（`#nea-damage-feedback`）
  - `healthBar`（`#health_bar`）/ `extraHpBar`（`#extra_hp_bar`）
  - `deathOverlay`（`#nea-death-overlay`）/ `deathTip`
  - `gameplayHud`（`#nea-gameplay-hud`）/ `gameplayHudText`
  - `dialogLayer`（`#nea-historical-dialog`）/ `dialogPanel` / `openHistoricalDialog` / `closeHistoricalDialog` / `createUiButton`
  - `playerModal`（`#nea-player-modal`）/ `applyPlayerUi`
- `particleLayer`（`#nea-particle-layer`）与 `tickParticles`（粒子特效，用临时 DOM 合理）。
- `installUiState`、`installUiState` 之后地图 UI 树（`#nea-client-ui`）逻辑。
- 底层：`createUiRoot`、`createUiNode`、`createVector`、`resolvePictureUrl`、`rgb/rgba/clamp` 等工具。
- 后端解码链路：`backend/box-go/**`、`frontend/voxweb/crates/protocol/**` 一律不改。

## 五、实现路线（按顺序）

1. `git status` 确认工作区当前改动（不要提交、不要改 git 配置）。
2. 按「三」逐项删除聊天 UI 代码块（用 `edit` 精确替换，删除后注意不留下悬空引用：删 `appendChatLine` 后，确认别处没有调用它）。
3. 全文 grep 确认无残留：`chatInput`、`chatBox`、`chatLines`、`appendChatLine`、`showChatPanel`、`chatHideTimer`、`closeChat`、`nea-chat-box`、`nea-chat-input` 应只剩「receive 里的注释分支」那处（或全无）。
4. 语法自检 + 测试（见「六」）。
5. `trunk build --release` 产出新 `dist/`。

## 六、验收目标（必须全部通过）

```powershell
# 1. 语法
node --check frontend/voxweb/client-script-runtime.js
# 期望：无输出（exit 0）

# 2. box-go 后端测试（当前 `src/*.test.ts` 共 9 个测试文件）
cd backend/box-go
npx tsx --test src/*.test.ts
# 期望：tests 9, pass 9, fail 0（含 client-script-runtime-browser.test.ts 浏览器 smoke）

# 3. 前端 Rust 协议测试（应不受影响）
cd ../../frontend/voxweb
cargo test -p voxweb-protocol
# 期望：ok

# 4. 前端构建
trunk build --release
# 期望：Finished + success
```

额外验收（Playwright 冒烟，确认聊天 UI 已移除、引擎系统 UI 仍在）：

```powershell
cd backend/box-go
# 用临时脚本加载 runtime 后：
#  - document.querySelector("#nea-chat-input") 应为 null
#  - document.querySelector("#nea-chat-box") 应为 null
#  - document.querySelector("#nea-gameplay-hud")、("#nea-damage-feedback")、("#nea-historical-dialog") 应存在
#  - dispatch keydown T 后不应出现任何新 input
```

## 七、参考证据（只读，不要复制进 git）

- 历史 Player UI 树 dump：`backend/local-player/archive/client-ui-bedwars.json`（含 `health_bar`/`chat`/`inputBox` 等节点字段结构）。
- 实际运行画面：`${NEA_EVIDENCE_ROOT}/works/private/parkour/manual-cdp/play-final.png`。
- 说明：聊天面板在历史上由外层 iframe 提供，不在引擎内；本任务据此移除引擎聊天 UI。

## 八、注意事项（重要）

- **不要重启**正在运行的开发栈（18083/18084）。改动只通过 `trunk build --release` 产出 dist 生效；用户自行硬刷新（Ctrl+Shift+R）。
- **不要** git commit / push / 改 remote。
- 测试 `.test.ts` 里 `buildRoot` 用 `.build/` 前缀，不要污染 packages。
- 最小改动：只删聊天 UI，不顺手「优化」其他代码。
- 完成后在「九」回填结果。

## 九、执行结果（由 sub-agent 回填）

- [x] 聊天 UI 已移除（逐项确认「三」的 6 点）
- [x] 语法检查通过
- [x] box-go 测试 9/9 通过
- [x] protocol 测试通过（82 + 1 + 3 + 10 = 96）
- [x] `trunk build --release` 成功
- [x] 冒烟：聊天 UI 移除、引擎系统 UI 仍在
- 备注：全文 grep 确认 `chatInput/chatBox/chatLines/appendChatLine/showChatPanel/chatHideTimer/closeChat/nea-chat-box/nea-chat-input/chatHistoryText` 无残留；引擎 UI 节点（`nea-gameplay-hud`/`nea-damage-feedback`/`nea-historical-dialog`/`nea-player-modal`/`nea-particle-layer`/`nea-death-overlay`）均在。
