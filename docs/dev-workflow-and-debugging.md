# NEA-Revive 前端工作经验与查错流程

> 本文记录在本项目（voxweb 前端 / box-go 后端 / client-script-runtime）里验证过的
> 工作方法与排错套路。目标是：少返工、先确认来源再动手、用最小成本定位根因。

本文是操作流程，不替代项目总计划。当前项目定位、首个内容目标和架构边界见
[`project-revival-development-plan.md`](./project-revival-development-plan.md)。

## 一、核心教训：正确性来源于证据，不是想象

### 1. 不要自造 UI/CSS —— 先找原版实现

本项目是「还原历史 Player」。任何 UI 实现前，先按这个顺序找权威来源：

1. **历史 bundle**：`backend/local-player/archive/project/<map>/client-runtime/assets/_next/static/chunks/*.js`（minified，但字符串可搜：`noticeMessage`、`placeholder`、`dialogSchema` 等）。
2. **UI 树 dump**：`backend/local-player/archive/client-ui-*.json` —— 字段与前端 UI API 一一对应（`anchor`/`position.offset`/`position.ratio`/`size.offset`/`textColor`/`textXAlignment`...）。
3. **运行时截图**：`evidence/manifest.json` → captures 下的 `*.png`。
4. **工具**：`backend/demo-map/tools/inspect-player-ui-schema.cjs` 可在 Node vm 里加载 webpack chunk 并导出 schema（`UITreeRDA.stateSchema`）。

反例（本次踩坑）：我在 `client-script-runtime.js` 里手写了一套聊天框 DOM + CSS（`#nea-chat-history`、`appendChatLine`），后来又手写了一套 UI API 调用（坐标自己拍脑袋定）。两次都不对：
- 第一错：引擎系统 UI 应该用**引擎自身的 UI API**（`createUiNode`/`UiBox`/`UiText`），不是裸 DOM。
- 第二错：更深一层 —— **历史聊天面板由外层 iframe（DAO3 站点页）提供**，引擎只负责解码 `game-chat.log`。当前自包含的 VoxWeb 页面保留这一边界：聊天消息只解码，不在引擎层重复绘制；其他引擎系统 UI 仍通过统一 UI API 管理。

**结论**：动手前先回答「这个东西在历史上的归属是哪一层？引擎自带 / 地图脚本 / 外层页面？」；
同时对照 DAO3 API 文档、原始脚本调用和历史证据。答不出来就先补证据，别猜。

### 2. 引擎层与地图层必须分离

- 地图 UI 树：`#nea-client-ui`（`installUiState` 每次 install 会**清空 `ui.children` 重建**）。
- 引擎系统 UI：独立层 `#nea-engine-ui`，挂 `{ element: engineUiRoot }`，不进入 `ui.children`，
  通过统一 UI API 创建。
- 混进去的后果（实测踩坑）：引擎控件被 `installUiState` 抹掉，且占据 `#nea-client-ui > div` 第一个子节点位置，把断言地图 HUD 的浏览器测试打挂。

### 3. 运行时边界

- 原始地图脚本原则上不修改。
- 不为单张地图编写 adapter，也不在引擎中加入地图名称分支。
- 缺失能力应按 DAO3 API 契约在通用运行时中原生实现。

## 二、遇到问题的处理思路（怎么想，先于怎么做）

本节是本次会话里真实用过的推理路径。核心原则：**报错和用户描述的字面含义就是第一线索，验证优先于猜测。**

### 1. 症状 → 先问「它真的是 bug 吗」

- 用户报「按下 T 没反应」。先不碰代码，先确认 dist 是否与源同步（`Select-String` 对比关键字）、浏览器是否硬刷新。很多「没反应」是缓存/旧产物。
- `Pointer lock cannot be acquired ...` 这类报错：先查是否为浏览器平台限制（Chrome 冷却期），是则不改代码，向用户解释清楚即可。

### 2. 报错信息按字面读，别过度解读

- `__neaClientRuntimeInstall is not a function` → 不是「没注册」，而是**脚本在加载期就抛异常中断**了。下一步是抓加载期异常，不是查注册逻辑。
- `Cannot read properties of undefined (reading 'includes')` → 某处假设了数据结构（`children` 数组）必然存在。找假设，不是找 `includes`。
- `Cannot access 'ui' before initialization` → 标准的 TDZ 顺序问题，调整声明顺序，不要改逻辑。

### 3. 最小复现隔离变量

写一个只验证**一件事**的临时 probe（见「四」模板），注入单个事件、读一个矩形、查一个节点。probe 输出和预期不符时，问题就是这一个变量；符合就排除它，看下一个。不要在一个大测试里同时验证多个猜测。

### 4. 归属层分析（本项目特有，最容易返工的点）

改任何 UI/行为前，先回答它属于哪一层：**引擎自带 / 地图脚本 / 外层页面**。聊天 UI 两轮返工的根因就是没先问这个问题：

1. 第一错：手写 DOM/CSS —— 应该用引擎统一 UI API。
2. 第二错：手写 UI API 调用 —— 历史上聊天根本不在引擎内（外层 iframe 提供），正确终态是**移除**。

判断依据按优先级：历史 bundle 代码 → UI dump → 截图 → 文档。三层归属判断错了，实现得再好也是返工。

### 5. 一次只改一件事，改完立即验

每个 edit 之后立刻跑 `node --check` + 相关测试。多个改动叠在一起再测，失败时无法归因——等于白测。

### 6. 完成的标准是「用户可见」，不是「改动落盘」

改动要依次经过：源文件 → 测试通过 → `trunk build --release` 产出 dist → 用户硬刷新可见。任何一环没走通，都不算完成；汇报时要说明当前停在哪一环。

## 三、UI API 坐标系速查（踩过的坑）

`createUiNode` 的定位公式（`refresh()`）：

```
left/top = ratio*100% + offset px
transform: translate(-anchor.x*100%, -anchor.y*100%)
```

- **顶部/左上角定位**（默认）：`ratio=0, anchor=0, offset=(x,y)` → `top: y px`。
- **底部定位**（等价于 CSS `bottom: Npx`，元素高 H）：**必须三个一起设**
  `ratio.y=1`、`anchor.y=1`、`offset.y=-(N+H)`。
  只设 `anchor.y=1` 不设 `ratio.y=1` → 元素跑到屏幕上方不可见（典型症状：**输入框已聚焦、IME 候选框出现，但画面上看不到框**）。血条/HUD/聊天输入框都踩过这一个坑。
- **居中**：`ratio=0.5,0.5` + `anchor=0.5,0.5`。
- 验证定位不要靠脑算：用 probe 里 `getBoundingClientRect()` 打实际矩形。

## 四、查错流程（按成本从低到高）

### 第 0 步：语法

```powershell
node --check frontend/voxweb/client-script-runtime.js
```

### 第 1 步：临时 Playwright probe（本项目最有用的排错工具）

浏览器测试报 `__neaClientRuntimeInstall is not a function` 这类错误时，含义是「脚本在加载期就抛异常中断了」，但测试输出看不到原因。**不要猜**，写一个一次性 probe：

```powershell
$code = @'
import { readFile } from "node:fs/promises"
import { chromium } from "playwright"
const runtimeSource = await readFile("D:/Projects/Gaming/NEA-Revive/frontend/voxweb/client-script-runtime.js","utf8")
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on("pageerror", e => errors.push(String(e)))   // 关键：捕获页面级异常
await page.setContent("<html><body><canvas id=\"game\"></canvas></body></html>")
await page.addScriptTag({ content: runtimeSource })
console.log("install fn:", await page.evaluate("typeof window.__neaClientRuntimeInstall"))
console.log("errors:", JSON.stringify(errors))
await browser.close()
'@
Set-Content -LiteralPath "src/__probe.mts" -Value $code -Encoding UTF8
node --import tsx src/__probe.mts; Remove-Item "src/__probe.mts"
```

probe 可以按需扩展：`__neaClientRuntimeReceive(JSON.stringify({...}))` 注入事件、查 DOM、读 `getBoundingClientRect()`。用完即删。

### 第 2 步：本次实测遇到的三类加载期错误 → 根因表

| 报错 | 根因 | 修法 |
|---|---|---|
| `UiBox is not defined` | `UiBox/UiText` 只暴露在 `createGlobals()`（地图脚本作用域），引擎内部代码看不到 | 引擎内部直接用 `createUiNode("box")` |
| `Cannot read properties of undefined (reading 'includes')` | `parent` setter 假设父节点必有 `children` 数组；`{ element }` 宿主没有 | setter 里 `Array.isArray(value.children)` 判空 |
| `Cannot access 'ui' before initialization` | TDZ：`createUiNode` 的 parent setter 引用 `ui`，但引擎 UI 创建在 `const ui = createUiRoot()` 之前 | 把 `const ui = createUiRoot()` 移到引擎 UI 区块之前 |

### 第 3 步：测试套件

```powershell
cd backend/box-go;  npx tsx --test src/*.test.ts      # 9 个，含浏览器 smoke
cd frontend/voxweb; cargo test -p voxweb-protocol
```

注意：浏览器 smoke 测试（`client-script-runtime-browser.test.ts`）大量断言 `#nea-client-ui` 下的地图 UI 结构 —— 引擎 UI 一旦混入 `#nea-client-ui` 就会打挂它。这是「引擎/地图分层」的强制约束。

### 第 4 步：构建与生效

```powershell
cd frontend/voxweb; trunk build --release
```

- 改动只通过 dist 生效；**不要重启**运行中的栈（18081/18082 等），用户自行硬刷新（Ctrl+Shift+R）。
- dist 与源是否同步：`Select-String` 对比关键字符串（如 `nea-engine-ui`）。

### 非 bug 的浏览器报错

`SecurityError: Pointer lock cannot be acquired immediately after the user has exited the lock.` —— Chrome 冷却期（退出 pointer lock 后 ~1.3s 内拒绝重新获取）。用户点太快触发，**不是代码 bug**，不改代码。

## 五、协作方式：沟通、委派与审查

### 1. 与用户的沟通：充分汇报，但不打断等待

- **默认自主推进**：执行细节（用哪个工具、坐标怎么算、测试怎么跑）自己定，做完汇报。不要为了确认细节反复打断用户。
- **只有方向级分叉才提问**：当选择会影响架构、归属层或用户目标时（例：「聊天 UI 该不该引擎自带」），列出选项问一次，拿到答复后不再回头确认。
- **提问要带着调查结论**：先自己查清证据（bundle、dump、截图），把「我发现什么、我倾向哪个、为什么」说清楚再让用户拍板。空手提问 = 把调研成本转嫁给用户。
- **每次汇报说清三件事**：改了什么、验证结果是什么、用户接下来需要做什么（如硬刷新）。

### 2. 委派与审查

本项目实践过的模式：主 agent 定方向，弱 sub-agent 执行，主 agent 独立验收。

1. **任务文档**（放 `docs/task-*.md`）必须自包含：背景决策、唯一要改的文件、逐块删除/新增点（用内容搜索描述，不用行号）、必须保留的清单、实现路线、验收命令、注意事项（不重启栈、不动 git、最小改动）、回填区。
2. **审查时不要信回填**：独立重跑全部验收命令 + 自己写 probe 复验冒烟，再对照回填。

## 六、关键文件速查

| 内容 | 位置 |
|---|---|
| 引擎前端 runtime（UI API、系统 UI、事件桥） | `frontend/voxweb/client-script-runtime.js` |
| 浏览器 smoke 测试（地图 UI 断言基准） | `backend/box-go/src/client-script-runtime-browser.test.ts` |
| 历史 Player UI 树 dump | `backend/local-player/archive/client-ui-bedwars.json` |
| 历史 bundle schema 提取工具 | `backend/demo-map/tools/inspect-player-ui-schema.cjs` |
| 证据映射 | `evidence/manifest.json` |
| 任务文档 | `docs/task-*.md` |
