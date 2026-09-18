# Runtime Compatibility

本目录是 ABI 目录、历史证据生成器、能力矩阵和一致性测试的分析层。它不直接启动地图，
也不替代 backend/box-go 的 runtime-server。

## 目录

- tools/：从文档、历史 bundle、协议和本地实现提取/组合数据；
- abi/：client/server runtime、MuDB protocol、contract 和 compatibility matrix；
- generated/：生成的 gap report、audit 和 JSON/Markdown 分析；
- conformance/、test/：可执行一致性 fixture；
- evidence/：经过筛选的证据摘要；
- docs/architecture.md：本分析层内部架构。

## 命令

~~~powershell
cd Middleware\runtime-compat
npm install
npm test
npm run build
~~~

npm run build 会从本机证据和文档镜像重新生成 abi/、generated/ 报告。生成文件不可手工
编辑；要改变报告，修改 tools/ 中的生成器或输入证据后重新构建。需要私有证据时，路径由
本地环境/映射提供，仓库不复制 dump。

## 状态词汇

- declared：只有文档声明；
- confirmed：在 Player、origin、协议或本地实现中直接找到；
- native：历史 runtime 原生执行；
- bridged：跨本地传输或后端边界翻译；
- emulated：本地实现，但尚未证明历史等价；
- missing：没有注册兼容实现。

声明不等于实现。每个新增能力结论都应有 conformance fixture；证据缺失时记录 gap，不能
凭 API 名称推导行为。

## 与主运行时的关系

runtime-compat 的输出供开发和审查使用；地图启动仍由：

~~~text
packages/<map>
  -> backend/demo-map/src/import-project.mjs
  -> backend/box-go/src/runtime-server.ts
  -> frontend/voxweb
~~~

该目录不应引入地图名称分支，也不应把一侧确认的 capability 自动授予另一侧 runtime。
