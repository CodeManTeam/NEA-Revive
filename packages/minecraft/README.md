# packages/minecraft — [Minecraft] 我的世界正式版

从 DAO3 项目导出（`reference/[Minecraft]我的世界正式版-master-export`，map id **100471484**）
导入的 NEA 项目包。

## 还原状态

| 内容 | 状态 | 说明 |
| --- | --- | --- |
| 地形 | ✅ 完整 | `build/voxel-sparse.gz` → `world/terrain.json`：256×128×256，1,167,963 体素 → 42,837 个 RLE 地形盒 |
| 方块目录 | ✅ | 32 种方块，全部命中全局 block-info 目录（stone=129 / dirt=125 / dark_red=107 / medium_yellow=389 / barrier=650 / water=364 …） |
| 出生点 | ✅ | `[64, 3, 48]`（地面 dirt y=2，由地形自动计算） |
| 物理 | ✅ 部分 | 4 种流体（water/coffee/strawberry_juice/grape_juice）+ 基础方块摩擦 |
| 实体 | ⚠️ 空 | 原项目实体（村民/末影龙/掉落物等）依赖脚本运行时动态生成，未导出 |
| 脚本 | ✅ 可加载 | 原 `code/index.js` 作为入口，20+ 缺失子模块提供本地 stub，顶层逻辑（onTick/addZone/玩家出生探测）本地运行；玩法模块（背包/合成/末影龙等）仍为占位 |
| 素材 | ✅ 已复制 | 149 gltf 模型 + 290 图片 + 20 音频（`assets/`，不入 git） |

## 目录

```
packages/minecraft/
├── nea.map.json          # NEA 项目包清单（shape 256×128×256, spawn）
├── world/
│   ├── terrain.json      # 42,837 个地形盒（nea-terrain/v1）
│   ├── physics.json      # 流体 + 方块摩擦
│   └── entities.json     # 空（实体待还原）
├── scripts/
│   ├── index.js          # 原地图真实入口脚本（DAO3 API）
│   └── *.js              # 20+ 缺失子模块的本地 stub（使 index.js 可加载）
├── reference/            # 原导出（提交：code/ 清单；大二进制 gitignore）
│   └── code/             # 原始 5 个脚本（index.js / clientIndex.js / …）
└── assets/               # models/images/audio（gitignore，源在 reference/）
```

## 运行

```bash
# 后端(18081) + 前端(18082)
node scripts/serve.mjs --map minecraft
# 浏览器（需 WebGPU，硬刷新 Ctrl+Shift+R）
# http://127.0.0.1:18082/start.html?nea=http://127.0.0.1:18081/api/createSession
```

## 已知缺口

1. **脚本模块为 stub**：`index.js` 顶层已本地运行（onTick/addZone/出生点探测），
   但 water/world/bag/player/crafting/sql/末影龙 等子模块是占位实现，
   生存/合成/背包/末影龙玩法尚未复现。
2. **实体未还原**：村民/动物/掉落物/红石装置等由脚本动态创建，依赖缺失模块。
3. **地形渲染为烟测路径**：`?nea=` 烟测渲染在出生点周围 5×5 区块 × 全高拉取并渲染，
   已验证后端 chunk 服务与前端全高渲染打通；全图流式加载/视锥裁剪是后续里程碑。
