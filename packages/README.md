# 项目包格式（packages/<map>/）

一个「项目包」是可在 NEA-Revive 后端 + 前端本地化运行的完整地图单元。

## 目录结构

```
packages/<map>/
├── nea.map.json        # 项目包清单（格式版本、世界、脚本、能力）
├── world/
│   ├── terrain.json    # 地形（boxes 盒式 + voxels 点式，导入时展开）
│   ├── entities.json   # 实体（存档点、触发器等）
│   └── physics.json    # 物理（材质、碰撞体、触发器）
├── scripts/
│   ├── server.js       # 权威逻辑（服务端执行，ScriptRuntime）
│   └── client.js       # 客户端表现
└── assets/             # 素材清单（可选；缺省用 archive 共享素材）
    └── manifest.json   # { blockCatalog, avatar, audio } 引用
```

## nea.map.json 字段

| 字段 | 说明 |
|------|------|
| `formatVersion` | `nea-map/v1` |
| `id` | 地图唯一 id |
| `display.name` / `display.description` | 展示名/描述 |
| `runtime.tickRate` | 逻辑 tick（Hz，通常 20） |
| `runtime.serverContract` | 服务端运行时契约（`nea-server-runtime/v1`） |
| `world.shape` | [x, y, z] 体素尺寸 |
| `world.spawn` | 出生点 [x, y, z] |
| `world.terrain` / `world.entities` / `world.physics` | 相对路径 |
| `scripts.server` / `scripts.client` | 脚本入口 |
| `scripts.serverCapabilities` | 服务端能力门禁列表 |
| `scripts.clientCapabilities` | 客户端能力列表 |

## 素材（assets/manifest.json）

地图专属素材清单。未声明的素材回退到共享 archive
（`backend/local-player/archive`：block 贴图、avatar 模型、engine 资源）。

```json
{
  "format": "nea-project-assets/v1",
  "blockCatalog": "world-bedwars.json",
  "avatar": { "skinPartHashBatches": "project/bedwars/bootstrap/bootstrap.json" },
  "audio": []
}
```

## 导入流程（后端）

1. `importMapProject(sourceRoot, buildRoot)` 读取 nea.map.json + world/scripts，
   展开 terrain（boxes → voxels），生成 dao3.project.json + capabilities manifest。
2. `ScriptRuntime.load(buildRoot, { blockCatalog, ... })` 加载并执行 server 脚本。
3. runtime-server 走 mudb 握手（createSession → join → secret → reset → fetchChunk）。

## DAO3 标准导出

`reference/<map>` 目录视为只读标准源。所有地图使用同一导入器生成
`packages/<map-id>`，运行时不为具体地图增加转换特例：

```powershell
node backend/demo-map/tools/import-standard-export.mjs `
  "D:/path/to/standard-export" `
  "D:/Projects/Gaming/NEA-Revive/packages/<map-id>"
node scripts/serve.mjs --map <map-id>
```

标准源包括 `voxel-sparse.gz`、`voxels.json`、`entitiesTree.json`、
`physics.json`、`player.json`、`environment.json`、`uiTree.json`、
`scriptAssets.json`、`scriptIndex.json`、`scripts/` 以及可选素材目录。
体素 shape 只约束稀疏体素数据；实体允许位于该包围盒之外，这是标准导出的合法坐标语义。

## 非净室说明

地形/代码直接来自 DAO3 dump（用户授权）。parkour 项目包的 `scripts/server.js`
是真实地图脚本；terrain/entities 是从 dump 还原的地图数据。
