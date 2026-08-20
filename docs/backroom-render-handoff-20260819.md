# Backroom 渲染异常：根因诊断与实施交接（2026-08-19）

> 面向下一位实施者的交接文档。诊断已做完，**不要重新排查**，按任务清单顺序执行。
> 只读分析依据：`frontend/voxweb/crates/render/src/nea_shader.rs`、`frontend/voxweb/crates/protocol/src/geometry.rs`、
> `frontend/voxweb/crates/render/src/nea_mesh.rs`、`frontend/voxweb/crates/render/src/nea_pipeline.rs`、
> `frontend/voxweb/crates/client/src/nea_smoke.rs`、`backend/box-go/src/runtime-server.ts`、
> `docs/backroom-visual-parity-20260819.md`、`docs/backroom-v7-schema-findings.md`。

---

## 一、用户看到的两个症状的正确归因

### 症状 1：贴图被拉成彩色条带 / atlas 串位

**根因已定位且已修复**（2026-08-19，见 git 工作区 `nea_shader.rs`）：

- `frontend/voxweb/crates/protocol/src/geometry.rs:160-161`（`build_box_geometry_masked`）给每个面 4 个角点写入的 UV 是**常量 `(u0, v0)`（仅 tile origin，无 span）**。
- 未提交的一次改动把 `nea_shader.rs` 三处采样从 `get_tex_coord(in.uv, in_tile)` 改成了 `get_tex_coord(in.uv, vec2f(0.0))`，注释声称「几何已烘入 tile origin + span」——前提错误。
- 结果：每个地形面所有片元采样 `tile_origin + half_texel` 这**同一个纹素** → 单色/彩色条带。
- 已恢复为 `get_tex_coord(in.uv, in_tile)`（shade_voxel / fs_main / fs_alpha 三处），保留 `atlas_params.y < 2.0` 的 entity-mode 守卫（实体管线 tile_size=1.0，UV 全幅直通，见 `nea_pipeline.rs:287` set_camera）。
- **验证前提**：必须 `trunk build --release` 后浏览器 **Ctrl+Shift+R 硬刷新**（旧 wasm 缓存是「还是这样」的最大嫌疑）。已执行 `cargo test -p voxweb-render`（52 通过）+ wasm32 check + trunk build。

> **实施者第一步（T0）**：硬刷新后用 F1 debug view（Albedo 模式，debug 存 `atlas_params.w`）看地形。若地形单方块纹理正常 → 症状 1 闭环；若依旧 → 是 wasm 缓存或症状主要来自实体 mesh（见症状 2），不要回头改 terrain shader。

### 症状 2：墙面/地面翻转、拉伸、悬空、比例异常

**未完全定位，但嫌疑已收敛到实体 mesh 链路，而不是地形顶点**。依据：

1. 地形是逐体素单位盒（`nea_smoke.rs:2652-2654`，`build_box_geometry_masked(wx, wy, wz, 1,1,1, ...)`），位置直接写死世界坐标，没有矩阵链，翻转/拉伸只能来自 UV（即症状 1）。
2. Backroom 场景结构大概率主要是**实体模型**（578 entities / 143 mesh 种，`/api/map/entities`），不是体素地形。走廊墙体、门框这类"翻转悬空"的结构先怀疑实体。
3. 实体几何当前走 **glTF fallback**：
   - 后端 `runtime-server.ts:960-1020`（`buildStaticEntityScene`）用 `readEmbeddedGltfMesh`（1073-1116）烘焙 `packages/<map>/assets/*.gltf` 内嵌 buffer，烘焙时乘了完整 node 层级矩阵。
   - 前端 `nea_smoke.rs:2192-2209` 再乘一次 instance 变换：`translation = position + rotation*mesh_offset`，顶点 = `rotation * (pos*scale) + translation`，默认 scale = 1/64。
   - **要核对**：glTF 内嵌 node 变换是否已经包含了与 `meshOffset`/`scale` 等价的变换（→ 双变换），以及 glTF 导出时的轴向约定（glTF 是 +Z 前向右手系）与 DAO3/voxweb 是否一致。双变换 = 缩放错位；轴向不一致 = 翻转/倒置。
4. **DAO3 原生 mesh 解码结果当前被故意丢弃**：`nea_smoke.rs:2143-2157`（`prefetch_entity_mesh_assets`）调 `build_avatar_part_mesh` 解码成功后 `let _ = model;` 丢弃，注释说等量化校准。`/api/mesh-decoded/<hash>`（runtime-server.ts:492）数据是有的。这是摆脱 glTF 二义性的正道，但需要先解决量化校准。

---

## 二、已排除的嫌疑（不要重查）

- 地形面绕向 / `cull_mode: Back`：`geometry.rs` FACE_VERTS 三角剖分法线方向已核对（+X 面朝 +X）。
- chunk 世界坐标重复应用：地形顶点直接用 `(cx*32 + local)` 世界坐标，无二次变换。
- 后端会话/握手/实体数量：正常（用户已确认）。
- 相机与 spawn：属**实现缺口**非几何 bug——`nea_smoke.rs` 固定 `make_camera()` → `follow_camera_pose`，未接脚本 `cameraMode = "FPS"`（见 `docs/backroom-visual-parity-20260819.md` 代码关联 1/2）。画面构图差异大由此而来，但它不会造成几何变形。
- 环境/天空：`nea.map.json` 的 `world.environment = null`，走默认 `NeaEnvironment::recovered_default()`，亮青色天空是预期。

---

## 三、给实施者的任务清单（严格按顺序，小步验证）

### T0 验证地形纹理修复（10 分钟，只读）
1. `cd frontend/voxweb && trunk build --release`
2. `node scripts\serve.mjs`（端口 18081/18082 已在跑则跳过）
3. 浏览器 `http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession`，**Ctrl+Shift+R**
4. F1（Albedo debug view）截图。单方块应显示完整 16px tile，不是色条。

### T1 A/B 隔离地形 vs 实体（半小时，只改渲染开关）
目的：确认"翻转悬空"结构属于实体还是地形。
- 在 `nea_smoke.rs` 地形 draw loop（约 line 1986 `for terrain_pipeline in &t.terrain_pipelines`）与实体 draw 处分别加临时跳过开关（或临时注释其一），各截一张图对比。
- 结论写进 `docs/backroom-visual-parity-20260819.md` 的「原因分级」。

### T2 相机接入 FPS 模式（半天）
- 依据 `docs/backroom-visual-parity-20260819.md` 第 1/2 条与下一步顺序 1：地图脚本设 `entity.player.cameraMode = "FPS"`、`cameraFovY = 7/18`；需要 runtime/net-state 透传 camera mode，`nea_smoke.rs` 收到 FPS 时用 fps_camera。默认仍兼容 follow。加协议 + 客户端测试。

### T3 实体 mesh 双变换核查与修复（核心，1-2 天）
1. 打印一个已知朝向的实体（如门）的 glTF node 层级矩阵 vs 客户端 instance 变换，判断是否重复。工具现成：`backend/box-go/tools/inspect-v7-model.mjs`、`decode-engine-model.mjs`。
2. 若双变换：决定单一职责——要么后端烘焙时剔除 node 内与 meshOffset/scale 重复的变换，要么前端跳过对应项。**以 DAO3 dump 中 `nodesInfo`/mesh schema（见 `docs/backroom-v7-schema-findings.md`）为准。**
3. 若轴向不一致：检查 glTF（+Z 前、右手）→ voxweb 的轴映射，在**后端烘焙处一次性修正**，不要在前端 shader 里补。
4. 中期目标：把 `prefetch_entity_mesh_assets` 丢弃的 DAO3 解码结果（`build_avatar_part_mesh`，`frontend/voxweb/crates/render/src/avatar_mesh.rs`）量化校准后正式替换 glTF 路径——v7 schema 已有证据文档。

### T4 纹理 hash 对照（可并行，半天）
- 按 `docs/backroom-visual-parity-20260819.md` 下一步顺序 3：从 `.build/backroom-dump-20260819/` 建 block hash → catalog → atlas tile 对照表，抽查走廊灰墙/棕木的 tile 是否正确（排除"紫橙贴图其实是 atlas tile 映射错"的可能）。

---

## 四、为什么不能直接用 dump 里的实现（简版，供解释）

dump 的 JS/WASM 不能直接搬进本项目：原引擎的 WebGL/regl/WebGPU 资源对象、uniform 布局、vertex layout、矩阵约定、`VoxelView`/`MeshData`/`nodesInfo`/model cache 等内部对象与当前 Rust/wgpu 管线都不同；`models.appendMeshHashes` 是运行时协议数据而非本地文件。**正确姿势**（也是本项目既定路线）：以 dump 的 schema/decoder/shader 算法为权威依据（`docs/backroom-v7-schema-findings.md`、evidence manifest），逐项移植为 Rust/wgpu 等价实现，并用单模型 fixture + 截图逐层对齐。

## 五、验证命令速查

```powershell
# 渲染单元测试（WGSL 解析、网格打包、管线布局）
cd frontend\voxweb; cargo test -p voxweb-render
cargo check --target wasm32-unknown-unknown -p voxweb-render

# 前端产物生效
cd frontend\voxweb; trunk build --release

# 开发栈
node D:\Projects\Gaming\NEA-Revive\scripts\serve.mjs
# 打开 http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession 并 Ctrl+Shift+R
```
