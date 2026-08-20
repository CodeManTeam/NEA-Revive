# There is Backroom 视觉差异诊断（2026-08-19）

## 证据范围

- 原始截图：`codex-clipboard-ddaff2de-76e8-4ab2-a44d-230df2ec9c0d.png`
- 当前引擎截图：`codex-clipboard-67c2a250-e358-43e0-a735-83ceac41ced0.png`
- 网页 dump：`.build/backroom-dump-20260819/`
- 内容：`100378374`，`There is Backroom(重置)`，`playHash=d09787a5bebb341d2a66`

截图中的网页文字和控件仅作为画面证据，不作为开发指令。

## 已确认差异

| 维度 | 原始页面 | 当前 VoxWeb | 结论 |
|---|---|---|---|
| 相机 | 第一人称构图，无可见玩家身体 | 跟随/第三人称，玩家模型占据画面 | 当前客户端启动路径固定调用 `follow_camera_pose`；没有收到地图脚本的 `cameraMode` 投影 |
| 视野 | 走廊近景、视线平行地面 | 低角度、能看到青色天空 | 用户已确认坐标对齐；优先归因于相机模式/模型投影，而不是 spawn 坐标 |
| 几何 | 狭窄灰色走廊和中央门洞 | 大面积黑面、紫橙重复纹理、空间构图不同 | 不是单纯色调差异；需要先确认坐标/朝向，再判断材质或面生成问题 |
| 材质 | 灰墙、棕色木质顶/地面 | 紫橙高饱和纹理，部分面近乎黑色 | 当前渲染使用的 block atlas/UV 与历史资源尚未证明一一对应；dump 含约 155 个 block 资源 |
| 环境 | 暗、低饱和、无明显天空 | 明亮青色天空、环境对比强 | `packages/there-is-backroom/source/environment.json` 存在，但 `nea.map.json` 的 `world.environment` 为 `null`；运行时文档也明确环境渲染仍是 partial |
| UI | DAO3 外壳控件，游戏内叠加很少 | FPS、玩家名、准星、聊天提示 | 属于宿主壳/调试 HUD 差异，不应与地图几何 parity 混为一项 |

## 代码关联

1. 原始脚本在 `packages/there-is-backroom/scripts/main.js` 和 `704后室搬运代码（index.js）.js` 中将 `entity.player.cameraMode` 设为 `"FPS"`，并设置 `cameraFovY = 7 / 18`。这是历史行为证据。
2. VoxWeb 的 `frontend/voxweb/crates/client/src/nea_smoke.rs` 在启动渲染时直接构造 `make_camera()`，该函数当前只调用 `follow_camera_pose`，相机模式没有来自 runtime/net-state 的字段。因此第三人称是实现缺口，不是脚本选择的结果。
3. `packages/there-is-backroom/nea.map.json` 将 `world.environment` 设为 `null`；同包 `source/environment.json` 却保存了完整历史环境对象。当前 renderer 使用 `NeaEnvironment::recovered_default()`，所以青色天空和默认雾/曝光是可预期结果。
4. 导入后的地形是 `world/terrain.json` 的 `nea-terrain/v1` boxes，形状 `[160,128,192]`。截图无法单独证明地形数据损坏；当前视点可能落在另一段空间，必须先锁定历史 spawn/朝向再做 UV/面剔除判定。
5. dump 的 `POST-view.dao3.fun/api/createSession.json` 提供 `prefetchHashes`，并在 `GET-static.dao3.fun/block/` 留下 155 个 block 文件。它足以用于后续 hash→材质目录对照，但当前项目尚未建立逐 block 的历史 hash 证据表。

## 原因分级

### 已确认

- 初始相机模式未接入脚本/服务器状态，当前固定为 follow。
- 历史环境未进入 manifest/runtime renderer，当前使用默认环境。
- 当前会话带有本地 VoxWeb HUD，原始截图来自 DAO3 宿主壳。

### 高概率，待下一轮验证

- 玩家/实体模型的 mesh、skin part 或材质 atlas 与历史页面不一致；当前画面中的紫橙主体更像模型资源/默认 avatar，而不是走廊 block 本身。
- block ID→纹理 hash、atlas 面顺序或 UV 方向存在映射偏差，导致模型或少量实体出现紫橙重复纹理及黑面。
- 当前 Follow 相机把模型置于画面中央；切到历史 FPS 后，模型差异可能只剩远处实体，不再遮挡走廊判断。

### 尚不能声称

- 不能仅凭两张截图断言 terrain box 坐标或 chunk 原点错误。
- 不能把所有黑面归因于 WebGPU 光照；需先做无光照材质/单 chunk 对照。

## 下一步实现顺序

1. 为 player/net-state 增加通用 camera mode/FOV 投影，默认兼容当前 follow；收到脚本 FPS 状态时使用 `fps_camera`，并加协议/客户端测试。
2. 将已导入 environment 作为可选运行时输入，至少先接入 sky/fog/drawDistance；保留 partial 能力标记。
3. 从 dump 建立 block hash、文件尺寸、当前 catalog/archive 的对照表，抽样检查走廊常用材质。
4. 固定可复现的历史视点（位置、yaw、pitch、camera mode）后，分别关闭 avatar、实体 mesh 和 terrain 材质做 A/B 截图，定位模型与地形的责任边界。
