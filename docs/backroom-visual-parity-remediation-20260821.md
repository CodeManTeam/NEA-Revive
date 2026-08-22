# There is Backroom 视觉与性能问题解决方案单

日期：2026-08-21  
适用版本：`origin/pr-1`（`c51b9e5`）及其父线 `b8c3cee`  
目标：严格恢复 dumps 原生显示效果，解决模型错位/变形、黑底与模型过亮、首次进入卡顿等叠加问题。

## 一、当前结论

本问题不是单个 shader 参数错误，而是两条并行开发线在 `b8c3cee` 汇合后产生了契约不一致：

1. 原生 DAO3 v7 模型 decoder 仍是 scaffold，读取真实 `engine/m` 数据会 `out of bounds`。
2. 后端因此不给实体返回 `meshAssetHash`，前端没有进入原生 `.vb` 解码路径，所有模型回退到 glTF。
3. glTF fallback 的 anchor/scale/axis 变换尚未证明与 dumps 原生模型一致，导致模型视觉差异。
4. 地图环境接入后，Backroom 使用黑天空、零太阳、`globalLight=0`；实体管线却固定写入 `light=[1,1,1,1]`，shader 再乘以 `100`，造成模型和地形使用两套光照契约。
5. 启动时请求全图 120 个区块，并在出生区和全图完成时各重建一次完整 terrain，叠加 578 个实体的 CPU/GPU 初始化，造成明显卡顿。

## 二、证据位置

- 模型 decoder：`backend/box-go/tools/decode-engine-model.mjs`
- v7 schema 证据：`docs/backroom-v7-schema-findings.md`
- 实体 API：`backend/box-go/src/runtime-server.ts`
- 实体解码与构建：`frontend/voxweb/crates/client/src/nea_smoke.rs`
- 实体 shader：`frontend/voxweb/crates/render/src/nea_entity.rs`
- 环境与曝光：`frontend/voxweb/crates/render/src/nea_environment.rs`
- 地形加载/重建：`frontend/voxweb/crates/client/src/nea_smoke.rs`
- 地图环境原始数据：`packages/there-is-backroom/world/environment.json`
- 地图实体原始数据：`packages/there-is-backroom/world/entities.json`

## 三、执行原则

1. 先修数据契约，再修渲染表现，最后做性能优化。
2. 原生 `.vb`/v7 路径验证通过前，不得通过修改 glTF offset、scale 或视角来掩盖问题。
3. 光照修复必须同时覆盖 terrain、entity、avatar、fluid；禁止任何管线私自固定亮度。
4. 每个子任务必须独立提交，提交信息必须标明 `MODEL`、`LIGHT`、`LOAD` 或 `VERIFY` 前缀。
5. 不修改 `packages/there-is-backroom/scripts/` 原始地图脚本，不添加地图名称分支。
6. 所有视觉结论必须基于同一 spawn、同一相机、同一时间和同一资产输入比较。

## 四、实施顺序

### MODEL-01：修复并验证 v7 模型 decoder

负责人：模型/API方向

任务：

1. 按 `docs/backroom-v7-schema-findings.md` 和 dump bundle 中的 authoritative schema 重写 v7 root 解码。
2. 明确区分三类格式：
   - `dao3-model/v7`：`version + nodes dictionary + voxels dictionary + palette + animations`
   - `dao3-mesh/v1-v3`：`bounds + nodes + texture + meshes`
   - legacy `-11` voxel mesh
3. `resolveMeshAssetHash()` 不得把“decoder 失败”静默当成“没有原生模型”；必须返回带原因的诊断结果。
4. 为以下真实资产增加 fixture 测试：
   - `mesh/卷闸门.vb`
   - `mesh/鲤鱼的桌子.vb`
   - `mesh/单元方块-白.vb`
5. 测试必须验证：版本、bounds、节点数、voxel/face 数、palette 数、完整 bytes 消耗和 trailing bytes。

验收：

- 至少 95% 的 Backroom 实体能返回有效 native asset binding。
- `/api/map/entities` 中 `meshAssetHash` 不再为 0。
- 浏览器日志出现 `decoded mesh ready`，且不出现 `mesh decode failed`。
- decoder 失败时页面仍可运行，但必须在 `/api/status` 或日志中暴露失败计数。

### MODEL-02：建立 native mesh 到渲染顶点的单元验证

负责人：模型/API方向 + 渲染方向

任务：

1. 对一个模型只保留一条 authoritative geometry 来源：native mesh 成功时禁止偷偷回退 glTF。
2. 明确 native mesh 的：
   - 轴向约定
   - pivot/anchor
   - bounds 原点
   - scale 单位
   - face winding
   - UV 与 palette/texture 的对应关系
3. 生成固定测试输出：模型 bounds、world AABB、顶点数量、首个三角形法线、UV 范围。
4. 对照同一实体的 dump 原始位置和截图，验证不存在二次 `bounds/2` 平移。
5. 在 native 路径通过前保留 glTF fallback，但 fallback 必须有明确日志和计数。

验收：

- `卷闸门`、`木板半砖`、`单元方块-白` 三个模型的 world AABB 与 dump 误差不超过 1/32 方块。
- 模型不再出现整体翻转、沿单轴拉伸、悬空或偏移半个 bounds 的现象。

### LIGHT-01：统一实体与地形的光照契约

负责人：光照/渲染方向

当前禁止状态：

- `nea_smoke.rs` 固定 `light: [1.0; 4]`
- `nea_entity.rs` 使用 `local = 100.0 * input.light.rgb`

修复要求：

1. 实体实例必须从同一份 `StaticVoxelLight` 或等价的原生 light 数据采样，不得固定全亮。
2. Backroom 的黑天空/零太阳/`globalLight=0` 必须同时影响 terrain 和 entity。
3. entity shader 必须与 terrain shader 使用同一套：
   - sun direction/color
   - global light
   - exposure
   - gamma/display transform
   - fog
4. `material.emissive` 只能由实体材质数据驱动，不能把普通模型当作 emissive。
5. `light=[1;4]` 只能保留在测试 fixture，不得存在于生产路径。

验收：

- Backroom 室内固定截图中，地形与静态模型的相对亮度关系与 dumps 一致。
- 黑环境下普通模型不会再获得固定 100 倍局部光。
- 光照单测覆盖：`globalLight=0`、有太阳室外图、发光模型、水下环境。

### LIGHT-02：恢复严格环境参数，不做可读性调参

负责人：光照/渲染方向

任务：

1. 区分 `historical_exact` 与可选 debug/readability 模式。
2. 默认 parity 模式严格使用 `environment.json` 的 fog、sky、sun、gamma、globalLight。
3. 禁止在 shader 中保留未验证的常数替换，例如额外的水下雾下限、固定 sky phase 或额外曝光增益。
4. 对 Backroom 使用黑环境时，确认黑色来自原生环境，而不是资源缺失、深度错误或 shader 未写入。

验收：

- F1 Albedo、F2 Direct、F3 Ambient、F4 Shadow、F5 Fog、F6 Final 六个 debug view 能分别证明黑色来源。
- 同一帧下 terrain/entity/avatar 的 gamma 与 exposure 输入一致。

### LOAD-01：修复启动阶段的重复全图构建

负责人：加载/性能方向

任务：

1. 先增加分段计时，不要直接降低视距：
   - chunkResponse 传输
   - boxes→cells
   - voxel light
   - terrain mesh build
   - entity mesh/pipeline build
   - GPU buffer upload
2. 把 `chunk_cells` 从线性查重改为 `(cx,cy,cz) -> ChunkState` 索引。
3. 出生区和全图不能各自重建完整 terrain；改为 chunk 级资源和 dirty chunk 更新。
4. 全图请求改为有界并发、可重试、可取消；空 chunk 也必须记录为完成。
5. 后端 warmup 必须可观测，确认是否与首个浏览器连接争抢 CPU。

验收：

- 首帧可见区域只构建一次。
- 全图补齐不会再次创建全部 terrain pipelines/textures。
- 固定机器上首次进入卡顿时间和主线程长任务都可量化记录。

### LOAD-02：实体按可见性和资源复用加载

负责人：加载/性能方向 + 模型方向

任务：

1. mesh geometry、texture、pipeline 按 mesh 类型复用，instance 只上传变换和材质。
2. 未进入视锥或超出 draw distance 的实体不参与首帧 pipeline 初始化。
3. 578 个实体不得在每次 terrain rebuild 时重新解码和上传。
4. 模型 API 请求使用 bounded concurrency，并记录成功/失败/耗时。

验收：

- 首次进入不再因 578 个实体全部同步初始化而阻塞主线程。
- 第二次进入同一地图能命中资源缓存。

## 五、验证矩阵

### 协议/数据

- `npx tsx --test backend/box-go/src/runtime-server-assets.test.ts`
- `npx tsx --test backend/box-go/src/runtime-server-backroom.test.ts`
- reset shape、spawn、chunkId、chunk boxes 与原始 terrain 对照。
- `/api/map/entities` 检查 native binding 成功率。

### Rust/WASM

- `cargo test -p voxweb-protocol`
- `cargo test -p voxweb-render`
- `cargo test -p voxweb-client`
- `trunk build --release`

### 浏览器固定场景

每次比较必须固定：

- 浏览器 viewport 和 DPR
- spawn `[98,11,158]`
- 相机模式 `FPS`
- `fovY = 7/18`
- 同一 chunk 完成状态
- 同一环境 JSON
- 同一时间/随机种子

必须采集：

- 首帧截图
- F1-F6 debug 截图
- console 日志
- Network 中 `/api/map/entities`、`/api/mesh-decoded/*`、chunk RPC 统计
- Performance 长任务和 WASM/GPU 时间

## 六、禁止事项

- 不得先把 render distance 降低来伪造“不卡”。
- 不得先修改 spawn 或地图 terrain 来避开空 spawn chunk。
- 不得用固定全亮实体掩盖环境光问题。
- 不得把 decoder 失败静默回退并宣称 native parity 已完成。
- 不得把 glTF offset/scale 的经验值直接写成地图专属 adapter。

## 七、完成定义

只有同时满足以下条件才算完成：

1. native model decode 成功率达到验收阈值，fallback 原因可观测。
2. 模型位置、比例、朝向、材质与 dumps 固定帧一致。
3. entity/terrain/avatar 使用统一环境和曝光契约。
4. 黑环境、普通模型、发光模型和透明模型均有独立验证截图。
5. 启动阶段不再重复构建全图资源，性能数据可复现。
6. 全部相关测试、release build 和硬刷新后的浏览器 smoke 通过。

