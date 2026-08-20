# NEA-Revive 项目复活开发计划

> 版本日期：2026-08-19  
> 首个正式内容目标：`packages/there-is-backroom`  
> 技术回归项目：`packages/parkour`  
> 大地图与性能验证项目：`packages/minecraft`

## 一、最终目标

NEA-Revive 是 DAO3/box3 历史项目的本地复活运行器。输入是包含地图、原始脚本、
实体、UI、模型、贴图和音频的项目包，输出是能够在本地重复启动、游玩、调试、测试
和发布的项目。

第一阶段的完成目标不是“页面能打开”或“地形能显示”，而是：

1. `there-is-backroom` 的原始 server/client 脚本不经玩法改写即可加载。
2. 玩家可以从启动页进入地图并完成一段可辨认的原作流程。
3. 流程中的地形、相机、实体、交互、UI、音频、失败和重试均由通用运行时支持。
4. 关键能力可以追溯到 DAO3 API 文档、原始脚本、历史证据和自动化测试。
5. 新能力不含地图名称分支，并通过 Parkour 回归；世界和性能能力通过 Minecraft 验证。

## 二、不可破坏的工程约束

### 2.1 原始内容边界

- 原始地图脚本原则上不修改，不把 API 兼容问题改写成地图补丁。
- 不创建 Backroom 专属 adapter，不在引擎中判断地图名称、内容 ID 或脚本文件名。
- 地图玩法继续存在于项目包脚本和数据中；引擎只实现通用历史能力。
- 私有 dump 不复制进 git；通过 `evidence/manifest.json` 和显式路径读取。
- 项目包构建产物写入 `.build/<map>/`，不得污染 `packages/<map>/`。
- 不通过降低 capability 严格度、吞错、伪造成功或 no-op 来消除 blocker。

### 2.2 证据规则

新增或修正历史能力时必须同时检查：

1. DAO3 API 文档：
   `D:/Projects/Gaming/NEA-Project/Evidence/dao3-docs-mirror/markdown/api`
2. `packages/there-is-backroom/scripts/` 中的真实调用形态和生命周期。
3. dump、历史 bundle、WebSocket 帧、UI 树、模型数据、截图或录屏。
4. 当前实现和可重复运行的测试结果。

来源冲突时必须记录文档定义、脚本依赖、历史行为、当前选择、影响和待验证项。
不得用“看起来合理”替代证据。

证据状态和运行状态分开记录：

| 维度 | 状态 |
|---|---|
| 证据 | `confirmed`、`inferred`、`missing`、`conflicting` |
| 运行 | `unknown`、`blocked`、`partial`、`verified`、`accepted` |

`verified` 表示契约、脚本、实现和针对性测试通过；`accepted` 还要求真实浏览器、多人、
视觉或对应端到端场景通过。代码存在不等于完成，单元测试通过也不等于用户流程完成。

### 2.3 UI 与运行时边界

- 地图 UI 使用 `#nea-client-ui`，由项目 client 脚本和历史 UI 树管理。
- 引擎系统 UI 使用 `#nea-engine-ui`，通过统一 UI API 管理。
- 历史上属于 DAO3 外层页面的 UI 不在游戏引擎内重复实现。
- 前端改动必须构建 `dist/` 并在真实浏览器中验证；源码测试通过但 dist 未更新不算完成。

## 三、当前基线

### 3.1 已证明能力

- `runtime-server` 已覆盖 createSession、3-WS、secret、sync/unpause、terrain reset、
  fetchChunk、chunkResponse、net-state、avatar 和 remote channel 主链路。
- VoxWeb `?nea=` 可以加载 WASM、连接本地后端、接收动态世界尺寸和渲染地形。
- `ScriptRuntime` 已具备 CommonJS 模块、世界、玩家、实体、体素、固定步物理、区域、
  raycast、GUI、dialog、sound、storage、HTTP、输入事件和生命周期事件等通用能力。
- Backroom M1 自动探针已验证项目导入、server runtime 激活、`160x128x192` reset、
  出生、非空地形 chunk 和 join 后持续运行。
- Backroom 包已包含 11 个脚本、897 个素材、10,541 个 terrain boxes，并识别约
  253 个可交互实体。
- 当前验证基线：box-go 10 项集成测试通过；demo-map 直接 `node --test` 349 项通过；
  `voxweb-protocol` 96 项通过。

### 3.2 当前真实缺口

- capability manifest 总状态仍为 `blocked`：1,068 个脚本需求中 96 ready、
  600 partial、121 blocked、251 script-owned。
- 691 个资源中 669 个 blocked；661 个实体中 655 个 blocked；另有 7 个 blocking
  diagnostics。数量会被重复资源和实体放大，不能直接换算为项目百分比。
- 最大内容瓶颈是历史 `.vb` mesh 缺少已捕获并验证的 Player 投影绑定。
- Backroom 尚无从新会话到完成一段原作流程的 M2 端到端验收。
- chat ingress、purchase-success ingress、group storage scope 和动态 eval 等仍有阻断。
- 相机/FOV、部分材质、环境、音频、地图 GUI 与历史画面仍有差异。
- 预测回滚、断线重连、多玩家收敛和大地图流式加载尚不完整。
- `backend/demo-map` 的 `npm test` 引用缺失的 `tools/build-mudb.mjs`；`node --test`
  可通过，但标准入口需修复。
- `backend/box-go` 的 TypeScript typecheck 尚未通过。

## 四、开发主线和里程碑

### M0：基线与证据闭环

**目标**：知道 Backroom 关键路径需要什么，不依赖运行时报错驱动开发。

交付物：

- API 文档索引和脚本调用清单。
- capability 可重复生成的基线快照。
- `脚本 -> API -> 历史证据 -> runtime -> test` 交叉引用表。
- blocker 优先级表和 M2 候选流程依赖表。
- 资源分类报告：文件缺失、路径未归一化、解析失败、无 Player 绑定、未视觉确认。
- 标准总验收入口。

硬门槛：

- 所有项目脚本模块均被扫描，M2 关键路径 API 没有 `unknown`。
- 每个关键 API 有文档、脚本和历史证据引用，或明确标记缺证。
- 每个 blocking diagnostic 有原因、负责模块和测试设计。
- manifest 可重复生成且摘要稳定；脚本、ABI 或 manifest 变化会使旧结论失效。
- capability 数量不作为完成百分比，关键路径 blocker 才决定里程碑。

### M1：启动与传输闭环

**目标**：项目从导入到首个脚本可观察行为全链路可重复验证。

```text
项目导入 -> package/capability 完整性检查 -> server/client script 加载
-> createSession + 3-WS -> join + secret + sync/unpause
-> reset + fetchChunk -> 玩家出生和权威状态
-> 地形/实体/素材清单加载 -> 首个世界事件、交互实体或地图 UI 行为
```

剩余工作：

- 将现有 M1 probe 扩展到 client script 安装和首个地图 UI/remote event 断言。
- 为每个启动阶段提供结构化错误和超时，不允许静默卡在 loading。
- 修复 `npm test` 标准入口和 typecheck 基线。
- 增加冷启动、重复启动、端口冲突和关闭清理测试。

硬门槛：

- 一条自动化测试覆盖完整启动链。
- Backroom M1 连续通过三次，Parkour 协议回归不退化。
- 真实浏览器从空缓存进入地图，无手工注入和未处理异常。
- 失败能定位到 import、script、protocol、asset、projection 或 render 阶段。
- 任务启动的服务全部清理，不终止用户已有进程。

### M1.5：内容投影闭环

**目标**：让 M2 路线上必要内容在正式 Player 路径中可见、可听、可控制。

工作项：

- 打通历史 `.vb`/mesh 的解析、GPU 上传、场景绑定和权威实体状态更新。
- 统一项目逻辑路径、archive/content-address、mesh、图片和音频资源解析。
- 投影 cameraMode、cameraFovY、实体 transform、mesh、材质和必要动画字段。
- 验证 interaction、dialog、地图 UI、remote channel 和音频消费端。
- 对通用目录扫描 Backroom 名称、内容 ID、专属实体 ID 和地图常量，防止实现污染。

硬门槛：

- M2 路线所需模型全部解析、上传、绑定并在截图中可辨认。
- M2 路线关键 blocked entities/resources 为 0；非关键项可以保留并记录。
- FPS/FOV、关键音频和交互进入正式播放路径。
- canvas 非空，console/pageerror 无未允许错误，UI 与输入不互相遮挡。
- 不包含地图专属 adapter 或通用引擎地图名称分支。

### M2：最小完整游玩闭环

**目标**：玩家能够自主完成一段唯一、可复现、可辨认的 Backroom 原作流程。

先根据原始脚本和历史证据确定唯一验收场景，并记录：出生状态、路线、关键实体、
输入序列、区域和交互触发器、成功状态、失败/重置状态及最长时限。

流程至少覆盖：

- 正确出生、FPS 相机和 FOV。
- 移动、跳跃、碰撞和区域触发。
- 至少一个可见 mesh 实体和一次 `onInteract`。
- 一次地图 dialog 或 client UI 更新。
- 一次音效或音乐。
- 一次可断言的状态变化，如开门、物品、传送、伤害或关卡推进。
- 一个失败、取消、死亡或重置分支。

硬门槛：

- 从新会话开始，无调试注入即可完成流程。
- 自动浏览器流程连续通过三次，成功状态由 runtime 状态或事件断言。
- 浏览器 loading 正确结束，控制台无未允许错误。
- 流程依赖 capability 全部达到 `verified` 或 `accepted`。
- Backroom 和 Parkour 全量回归通过。

### M3：核心玩法恢复

**目标**：从单段流程扩展到 Backroom 主要内容。

按脚本域分批推进：

1. 关卡、密码、按钮、钥匙、门、传送和检查点。
2. 体力、物品、伤害、死亡、复活和失败反馈。
3. GHOST、猎犬、派对客、路径/追逐、攻击和销毁。
4. 地图 HUD、提示、dialog、管理员界面和 remote channel 更新。
5. 位置音频、玩家音频、音乐、定时恐怖事件和播放控制。
6. 持久化和平台能力。购买、货币、SQL 和管理员功能必须 capability-gated，不伪造
   线上平台结果。

硬门槛：

- 每个纳入范围的系统都有正常路径和失败路径测试。
- 两名玩家的相关玩法至少经过双会话验证。
- 核心玩法 blocker 为 0；不支持的平台能力有明确本地策略和用户可见错误。
- 未恢复内容有证据、影响和后续方案，不以静默 no-op 掩盖。

### M4：视觉与稳定性

**目标**：关键场景接近历史表现，并能稳定长时间运行。

工作项：

- 固定 viewport、DPR、相机、tick、环境和状态的视觉采集 harness。
- 对照历史图验证材质、atlas、UV、面顺序、mesh、透明、阴影、环境和 UI。
- 验证 resize、资源失败、断线重连、重复启动、会话清理和长时间运行。
- 检查实体、监听器、GPU/内存和资源缓存是否持续增长。

硬门槛：

- 关键场景有历史参考或经批准的本地基线，视觉差异均有修复或批准记录。
- 自动截图确定性足以定位回归。
- 重连、重复启动和资源失败路径通过。
- 长时间运行无持续的实体、监听器或内存增长。

### M5：多项目回归与发布

**目标**：形成可复现构建、可选择项目和可发布的通用运行器。

硬门槛：

- Backroom、Parkour、Minecraft 使用同一通用运行时并通过回归。
- 通用目录中的地图专属标识扫描为 0。
- 大地图边缘 chunk、加载、卸载、视距和缓存测试通过。
- 一键启动、项目选择、错误页、诊断、README 和发布包完整。
- 从干净环境按文档可完成构建和启动。
- 最终 release gate 可用一条命令明确返回成功或失败。

## 五、优先级队列

### P0：阻止 M2 的事项

1. 固化 M2 唯一原作流程和状态机式验收步骤。
2. 打通 `.vb`/mesh 通用投影与渲染。
3. 修正资源逻辑路径和 archive/content-address 解析。
4. 完成 FPS/FOV 权威投影。
5. 完成交互、dialog、地图 UI、remote channel 和音频浏览器闭环。
6. 建立自动输入与状态断言，使流程连续三次通过。

### P1：可靠性与核心玩法

- 修复标准测试入口、typecheck、构建和浏览器 smoke。
- chat ingress、purchase ingress 和明确的 group storage 策略。
- 伤害、死亡、物品、wearable、动画、多人、重连和状态收敛。

### P2：视觉、性能和发布

- 完整环境、粒子、透明/OIT、阴影和材质 parity。
- 大地图流式加载、视锥裁剪和缓存。
- 项目选择器、错误诊断和发布包装。

## 六、任务切片规范

每个任务必须包含：

- **目标**：用户或脚本最终观察到什么。
- **范围**：允许修改的模块和文件所有权。
- **非目标**：本轮不处理的相邻问题。
- **证据**：API 文档、脚本调用和历史证据路径。
- **实现**：通用能力所属层和数据流。
- **测试**：失败测试/probe、针对性测试、模块回归和浏览器验收。
- **回滚点**：失败时如何恢复到已知通过状态。
- **完成定义**：二值判断，不使用“基本”“大概”“应该”。

跨协议、后端和前端的任务拆成协议契约、生产端、消费端和端到端验收。多个 agent 共用
工作树时必须按文件所有权拆分，不允许同时编辑相同文件或强耦合模块。

## 七、标准验证矩阵

```powershell
# JavaScript 语法
node --check frontend/voxweb/client-script-runtime.js

# 后端、协议和浏览器 runtime smoke
cd backend/box-go
npx tsx --test src/*.test.ts
npm run typecheck

# ScriptRuntime、导入器、capability 和服务层
cd ../demo-map
npm test
# 标准入口修复前额外记录：node --test

# Rust 协议和受影响 crate
cd ../../frontend/voxweb
cargo test -p voxweb-protocol
cargo test -p voxweb-physics
cargo test -p voxweb-client
cargo test -p voxweb-render

# 前端源码变化后
trunk build --release
```

浏览器验收至少检查：loading 能结束或显示可定位错误、console/pageerror、canvas 像素非空、
spawn、相机、实体、UI、音频和输入，以及实际加载的新 `dist/`。

## 八、无人值守推进规则

- 主 agent 负责探究、路线选择、证据判断、任务拆分、集成、最终验收和计划更新。
- 编码任务必须优先交给 subagent；主 agent 不把架构判断和最终验收外包。
- subagent 任务必须自包含，并声明允许修改的文件、禁止事项和验收命令。
- 主 agent 必须独立阅读 diff、重跑关键测试和检查浏览器真实状态。
- 并行 subagent 不得修改相同文件；接口不稳定时先完成契约再拆生产端和消费端。
- 遇到技术失败先调查和修复，只有缺少不可推断的产品决策、私有凭据或外部服务时
  才询问用户。
- 同一阻断最多重复三轮；之后记录尝试、证据和解锁条件，转向不依赖它的最高优先级任务。
- 不因测试耗时、上下文压缩或单项失败停止总体目标；保存状态后继续下一可执行步骤。
- 不擅自 commit、push、升级大版本依赖、删除证据或执行破坏性 git 命令。

## 九、阶段记录格式

```text
目标：本轮关闭的能力缺口
证据：API、脚本和历史材料
subagent：任务边界、修改文件和结果
修改：最终集成内容
验证：命令、浏览器和视觉结果
状态：unknown / blocked / partial / verified / accepted
剩余：风险和下一项最高优先级工作
```

项目完成的最终定义是：用户能从干净构建启动 Backroom，完成约定核心流程，关键内容
与历史证据相符，自动化和浏览器验收通过，且实现仍是可复用于其他 DAO3 项目的通用运行时。
