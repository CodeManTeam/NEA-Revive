# there-is-backroom M1 出生区功能测试 Bug 报告

- 测试日期：2026-08-22
- 测试地图：`packages/there-is-backroom`
- 测试入口：`http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession`
- 会话：`local-efbf2ad7-ed64-4ddf-ac8b-e9195e8840e6`
- 测试范围：出生区、防护衣交互、物品拾取、实验场地入口
- 总体结论：出生区主线被阻断，暂不具备继续完整游玩 smoke 的条件。

## BUG-01：select 对话框被渲染为文本输入框

**严重程度：P1**

### 复现步骤

1. 启动 `there-is-backroom` 并进入出生区。
2. 靠近提示为“穿上防护衣”的 M.E.G. 成员。
3. 按 `E` 交互。

### 实际结果

- 角色成功显示防护服外观。
- 页面中央弹出一个空白文本输入框和“确定”按钮。
- 输入框可以输入任意文本。
- 未显示脚本声明的标题、说明和选项列表。

### 预期结果

脚本调用 `player.dialog({ type: "select" })` 后，应显示：

- 标题：“穿戴”。
- 内容：“请选择皮肤(商店中购买的)”。
- 玩家已有物品对应的选项。
- “关闭”选项。

### 关联代码

- `packages/there-is-backroom/scripts/main.js:1559`

### 初步定位

统一 UI 对 `select` 类型的映射或编码存在问题，当前疑似回退成了 input 模态框。

## BUG-02：directMessage 没有任何可见反馈

**严重程度：P1**

### 复现步骤

1. 完成一次“穿上防护衣”交互。
2. 关闭首次弹出的异常输入框。
3. 再次对同一目标按 `E`。

### 实际结果

- 第二次没有重复弹出模态框，说明已穿戴状态已经保存。
- 页面上没有显示任何消息。

### 预期结果

应显示脚本消息：“您已穿上防护衣”。首次交互时也应显示“已为您穿上防护衣”。

### 关联代码

- `packages/there-is-backroom/scripts/main.js:1608`

### 影响

所有依赖 `player.directMessage()` 的拾取结果、背包已满、门禁拒绝和任务提示均缺少用户反馈。

## BUG-03：杏仁水交互后未拾取、未销毁

**严重程度：P1**

### 复现步骤

1. 在出生区靠近提示为“杏仁水-1”的物品。
2. 确认距离小于交互半径。
3. 连续按 `E` 十余次。

### 实际结果

- 控制台持续记录交互目标，例如：

  ```text
  [nea] interact id=66069 distance=0.67 hint='杏仁水-1'
  [nea] interact id=66070 distance=0.58 hint='杏仁水-1'
  [nea] interact id=66066 distance=1.61 hint='杏仁水-1'
  ```

- 杏仁水实体没有消失。
- 没有出现拾取成功或背包已满消息。
- 新玩家背包脚本初始值为 9 个“空”槽位，因此首次拾取不应因背包已满而失败。

### 预期结果

- 单次交互后，对应杏仁水进入背包。
- 对应世界实体被销毁并从前端画面移除。
- 显示“获取到：杏仁水……”提示。

### 关联代码

- `packages/there-is-backroom/scripts/main.js:1053`
- `packages/there-is-backroom/scripts/main.js:1064`

### 初步定位

前端目标检测和交互发送已经生效。失败发生在脚本回调、`directMessage()`、背包写入或 `targetEntity.destroy()` 链路中。由于拾取代码在销毁实体前调用 `directMessage()`，需要重点确认该调用是否抛错并中断后续逻辑。

## BUG-04：穿戴防护服后仍无法进入实验场地

**严重程度：P0（主线阻断）**

### 复现步骤

1. 对“穿上防护衣”目标按 `E`，确认角色外观已经换装。
2. 前往出生区出口/空气门。
3. 尝试直接行走通过。
4. 尝试靠近后按 `E`。

### 实际结果

- 直接行走无法通过。
- 按 `E` 也无法通过。
- 没有任何可见门禁反馈。
- 玩家无法进入实验场地，后续主线无法测试。

### 预期结果

- 已穿防护服的玩家应能通过入口并进入实验场地。
- 未穿防护服的玩家应被阻止，并收到“你还没有穿上防护服，不可进入实验场地！”提示。

### 关联代码

- `packages/there-is-backroom/scripts/index.js:6`
- 空气门实体：`packages/there-is-backroom/world/entities.json`，ID 为 `空气门`

### 初步定位

当前空气门脚本只注册了接触提示，没有发现根据 `weared` 或 `wear` 状态解除碰撞/放行的逻辑。还需核对历史 DAO3 中该门是否依赖引擎原生碰撞过滤、实体标签过滤或其他未导入能力。

## 已通过或部分通过的能力

- 3 WebSocket 建连和握手成功。
- 前端可检测交互目标、距离和 `interactHint`。
- `E` 可以触发“穿上防护衣”回调。
- `skinInvisible` / `addWearable` 至少部分生效，防护服可见。
- 已穿戴状态能够阻止第二次重复打开穿戴对话框。

## 与本次问题无关的控制台信息

以下 Chromium 提示暂不归入地图功能 Bug：

- preload 目标不支持 SRI。
- Windows 上 `requestAdapter()` 忽略 `powerPreference`。
- `requestAnimationFrame` handler 耗时警告。
- `CookieCloud Content Script Loaded`。

## 建议修复顺序

1. 修复或补齐空气门放行能力，解除 M1 主线阻断。
2. 验证 `directMessage()` 是否抛错，并恢复统一消息 UI。
3. 修复 `select` 对话框的协议映射和前端控件。
4. 在消息能力修复后复测杏仁水拾取；若仍失败，再分别检查背包属性写入和实体销毁桥。
5. 增加覆盖“交互 -> 消息 -> 背包写入 -> 实体销毁”的自动化回归测试。

## 本轮修复记录（2026-08-22）

- `select` 对话框消费端兼容 Rust tagged enum（`Select`/`Input`/`Text`），并增加浏览器断言，选项不再退化为文本输入框。
- `directMessage()` 继续走 `game-chat.log`，同时在 VoxWeb 引擎层显示短暂提示条；未恢复历史聊天记录面板。
- `GameEntity.destroy()` 通过 `nea-revive:entity-destroyed` 广播到客户端，客户端同步移除实体和碰撞体；杏仁水拾取链路增加 Rust 回归覆盖。
- 出生区空气门接触逻辑补齐：已穿防护服的玩家临时解除门碰撞，未穿戴玩家保留门禁提示。

验证：`client-script-runtime-browser.test.ts`、`runtime-server-voxweb.test.ts`、`runtime-server-driver.test.ts`、`demo-map runtime.test.mjs`（52 项）、`voxweb-client nea_smoke`（25 项）及 `runtime-server-backroom.test.ts` 均通过；前端 `trunk build --release` 已产出新的 `dist/`。
