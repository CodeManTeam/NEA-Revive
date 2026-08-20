# NEA-Revive 无人值守 AI 开发提示词

以下内容可直接作为主 agent 的任务提示词：

```text
你正在 D:\Projects\Gaming\NEA-Revive 中无人值守开发 NEA-Revive。

最终目标：在不修改 there-is-backroom 原始玩法脚本、不编写地图专属 adapter、不在
通用引擎加入地图名称或内容 ID 分支的前提下，使 packages/there-is-backroom 能从
干净构建本地启动，让玩家自主完成一段可辨认的原作流程，并继续恢复核心玩法、视觉
接近度、多项目回归和发布能力。

必须首先阅读并遵守：

1. D:\Projects\Gaming\NEA-Revive\AGENTS.md
2. D:\Projects\Gaming\NEA-Revive\docs\project-revival-development-plan.md
3. D:\Projects\Gaming\NEA-Revive\docs\ai-assisted-development-workflow.md
4. D:\Projects\Gaming\NEA-Revive\docs\dev-workflow-and-debugging.md
5. D:\Projects\Gaming\NEA-Revive\docs\backroom-m0-script-inventory.md
6. D:\Projects\Gaming\NEA-Revive\docs\backroom-visual-parity-20260819.md

DAO3 API 文档默认位于：
D:\Projects\Gaming\NEA-Project\Evidence\dao3-docs-mirror\markdown\api

核心规则：

- 自动探究并持续推进，不等待用户逐步布置任务。
- 除非缺少不可推导的产品决策、凭据或外部服务，否则不要停下来询问用户。
- 原始地图脚本原则上不可修改。脚本调用不兼容时，在通用 runtime、协议、前端或
  导入器中实现历史能力。
- 禁止 Backroom 专属 adapter、地图名/内容 ID 分支和只对单张地图成立的 hack。
- 新 API 必须核对 DAO3 API 文档、原始脚本和历史证据；冲突必须记录。
- 私有 dump 只读取，不复制进 git；生成物写入 .build/。
- 尊重工作区已有未提交改动，不撤销、覆盖或整理用户已有修改。
- 不使用 git reset --hard、git checkout -- 或其他破坏性命令。
- 不通过降低断言、吞错、伪造 capability、返回伪造成功或 no-op 来让测试通过。

主 agent 与 subagent 分工：

- 主 agent 必须负责读取仓库、选择最高优先级、证据分析、架构和接口设计、拆分任务、
  审查 diff、解决集成、运行最终测试、浏览器验收、更新计划和状态。
- 具体编码任务必须优先交给 subagent。每个 subagent 只领取一个边界清晰、可独立
  验证的任务。
- 可并行时同时使用多个 subagent，但不得修改相同文件或强耦合模块。接口尚未稳定时，
  先完成协议/契约，再分派生产端和消费端。
- 给 subagent 的任务必须自包含，写明目标、证据路径、允许修改文件、禁止内容、预期
  行为、验收命令和需要回报的风险。
- subagent 完成后，主 agent 必须亲自读取 diff 并独立重跑关键测试，不得只相信回填。
- subagent 失败时，主 agent 分析原因，发送修正任务或自己完成小型集成，不停止总目标。

启动动作：

1. 确认 cwd，读取上述文档。
2. 运行 git status --short、git diff --stat，识别并保护已有修改。
3. 检查最近提交、项目包和 .build/there-is-backroom/capabilities/manifest.json。
4. 确认测试基线：
   - backend/box-go: npx tsx --test src/*.test.ts
   - backend/demo-map: npm test；若入口失败，再运行 node --test，并把入口修复列为 P1
   - frontend/voxweb: cargo test -p voxweb-protocol
5. 用实际结果更新状态，不相信过期计划或旧任务回填。

自主任务选择算法：

1. 从 project-revival-development-plan.md 的 P0 队列选择最高优先级未关闭事项。
2. 优先选择能缩短 M2 路径、解除多个关键 blocker 或建立可靠验收的任务。
3. 修改前证明问题存在：找到脚本调用、API 文档、历史证据和当前实现。
4. 将任务切成可独立完成的最小行为闭环。
5. 把编码切片交给 subagent；主 agent 同时继续证据研究、接口检查或测试设计。
6. 集成后运行失败测试/最小 probe、针对性测试、模块回归和浏览器验收。
7. 只有满足二值完成标准才改为 verified/accepted；否则记录 partial/blocked 并继续。
8. 完成一项后立即选择下一项，不等待用户确认。

默认推进顺序：

A. 固化 Backroom M2 唯一原作流程、状态机和依赖清单。
B. 打通历史 .vb/mesh 的通用 Player 投影与 VoxWeb 渲染。
C. 修正资源逻辑路径、archive/content-address 和音频解析。
D. 完成 FPS cameraMode 和 cameraFovY 权威投影。
E. 完成交互、dialog、地图 UI、remote channel 和音频的浏览器闭环。
F. 建立自动输入和状态断言，使 M2 流程连续三次通过。
G. 扩展伤害、死亡、物品、wearable、动画、GHOST 和关卡系统。
H. 完成视觉 parity、多玩家、重连、大地图性能和发布回归。

开发循环：

现象 -> 最小假设 -> API/脚本/历史证据 -> 最低成本 probe -> 通用实现 ->
针对性测试 -> 完整回归 -> trunk release build -> 真实浏览器验收 -> 文档更新 -> 下一任务

测试要求：

- JavaScript 修改先运行 node --check。
- box-go 修改运行 npx tsx --test src/*.test.ts 和适用的 typecheck。
- demo-map 修改运行 npm test；标准入口修复前同时保留 node --test 结果。
- Rust 修改运行对应 crate 测试；协议至少 cargo test -p voxweb-protocol。
- frontend/voxweb 源码变化后必须运行 trunk build --release。
- 用户可见或渲染修改必须使用真实浏览器检查 canvas 像素、loading、console/pageerror、
  UI 重叠、输入、关键实体和新 dist。
- 修改通用 runtime 后运行 Parkour 回归；涉及世界尺寸或流式加载时运行 Minecraft 回归。
- 运行服务使用可控端口，结束时只清理自己启动的进程，不终止用户已有服务。

完成判定：

- “存在代码”不等于完成；“单元测试通过”不等于用户流程完成。
- verified 要求契约、脚本调用、实现和针对性测试一致。
- accepted 要求真实浏览器或对应端到端场景通过。
- 关键路径 blocker 清零后才能关闭里程碑；全量 capability 数量不能直接当完成百分比。
- 不因单项测试通过宣告里程碑完成，必须满足阶段全部硬门槛。

故障恢复：

- 命令失败时读取完整错误，先修复环境、入口或真实实现问题。
- 长进程必须等待完成或明确终止，不留下占用端口的孤立服务。
- 同一阻断最多重复三轮；之后记录已尝试方案、证据和解锁条件，转向不依赖它的下一
  个最高优先级任务，禁止空转。
- 上下文压缩前，将目标、改动、测试、未提交文件和下一步写入计划或 task 文档，再继续。
- 不擅自 commit、push、升级大版本依赖、删除证据或重写用户改动。

每个切片完成后记录：

目标：
证据：
subagent 任务、文件边界与结果：
实际修改：
独立验证：
当前状态：unknown / blocked / partial / verified / accepted
剩余风险：
下一任务：

不要只输出计划。立即开始调查和实现，持续推进到最终目标完成，或遇到确实需要用户
决策、凭据或外部状态才能解除的阻断。最终汇报必须说明完成行为、测试结果、真实浏览器
结果、剩余差异，以及哪些结论是已证明、推断或未验证。
```
