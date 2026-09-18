# 项目包格式

packages/<map>/ 是地图的可移植源包。运行时只接收一个包目录和一个独立的 build root，
不会依赖特定地图名称，也不会把生成文件写回源包。

## 源包布局

~~~text
packages/<map>/
├── nea.map.json             必需：nea-map/v1 清单
├── world/                   terrain、entities、physics、environment
├── scripts/                 server/client 入口和原始模块
├── source/                  可选的标准导出源数据
└── assets/                  可选的地图专属 mesh/audio/bootstrap
~~~

实际包可以比示例包含更多导出文件，例如 source/ui.json、source/player.json 或
assets/mesh/*.vb。它们由导入器按索引读取，不要求每个包拥有完全相同的文件集合。

## nea.map.json

当前源格式为 nea-map/v1。常用字段如下：

| 字段 | 作用 |
| --- | --- |
| formatVersion | 必须是 nea-map/v1 |
| id | 包内唯一的地图 id |
| display | 展示名和描述 |
| runtime.tickRate | 逻辑 tick 频率，通常为 20 |
| runtime.serverContract | 服务端运行时契约版本 |
| world.shape | [x, y, z] 体素空间尺寸 |
| world.spawn | [x, y, z] 出生点，使用世界坐标 |
| world.terrain / entities / physics | 相对于包根的世界文件 |
| scripts.server | 服务端入口模块 |
| scripts.client | 客户端入口模块，可选 |
| scripts.serverCapabilities | 服务端能力门禁 |
| scripts.clientCapabilities | 客户端能力门禁 |

world.shape 是体素数据边界，不会自动限制实体坐标；标准导出中实体位于边界之外是合法
情况。地形文件使用的 box/voxel 语义由导入器统一展开，前端从 terrain reset 帧获取最终
shape，不应硬编码地图尺寸。

## 导入和生成物

backend/demo-map/src/import-project.mjs 执行以下工作：

1. 校验源清单和相对路径；
2. 读取 terrain、entities、physics、UI、脚本和可声明素材；
3. 将需要展开的地形盒转换为运行时使用的体素/盒数据；
4. 在指定 build root 生成 dao3.project.json、capabilities 和 assets index。

主服务的调用方式是：

~~~powershell
node scripts\serve.mjs --map there-is-backroom
~~~

需要单独导入或校验时：

~~~powershell
cd backend\demo-map
npm run validate
npm run build
~~~

.build/ 是生成目录，测试使用 .build/<name> 前缀。生成的 dao3.project.json 是兼容运行时
输入，不是新的手工编辑格式。

## 资源解析

地图资源优先从生成包的 assets index 解析；缺失的 block/avatar/engine 资源回退到
backend/local-player/archive 提供的共享目录。项目资源路径必须是包内的安全相对路径；
runtime-server 会拒绝绝对路径、路径穿越和未声明资源。

导出的历史图片通常以 image/<name> 保存，而 UI 仍可能引用 picture/<name>。导入器和
runtime-server 对此做格式级的名称回退，不为单张地图增加映射分支。

## 当前包

- there-is-backroom：首个正式内容目标，160 x 128 x 192，脚本和大量 mesh/audio 素材。
- parkour：256 x 64 x 256，协议、渲染和 ScriptRuntime 回归地图。
- minecraft：256 x 128 x 256，稀疏大地图和性能验证。
- bedwars-s2 / bedwars-s2-main：标准导入和场景/UI/脚本恢复实验。
- api-acceptance、model-lab 等：测试或专项实验包，不是默认启动目标。

部分地图包和 reference/ 原始导出受 .gitignore 保护，只存在于授权的本地工作区；文档
记录它们的运行语义，不承诺干净 checkout 包含所有内容。
