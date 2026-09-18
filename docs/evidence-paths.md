# Evidence Path Mapping

历史证据保留在仓库外。文档和检查工具使用环境变量占位符，不把某一台机器的绝对路径写入
运行时或新文档。

~~~powershell
$env:NEA_EVIDENCE_ROOT = "D:/path/to/NEA-Evidence"
$env:NEA_PROJECT_ROOT = "D:/path/to/NEA-Project"
~~~

仓库内的 evidence/manifest.json 是项目证据映射的权威索引；其中的 source 值仍可能指向
授权工作区的绝对路径。提取工具从映射的源读取，产物落到 packages/<map>/。

运行时代码不得依赖 NEA_EVIDENCE_ROOT、NEA_PROJECT_ROOT 或 manifest；它只接收显式的
sourceRoot、assetRoot 和 buildRoot。
