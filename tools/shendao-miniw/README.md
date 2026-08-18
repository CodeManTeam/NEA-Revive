# 神岛地图转 MiniW

独立的浏览器工具，基于 `box3-gz-to-miniw` 的格式约定实现：

- 输入：gzip 压缩 JSON（`.gz`），内容包含 `shape: [sx, sy, sz]`、`indices`、`data`
- 输出：MiniW `.miniwvox` 二进制文件
- 附加：Lua 建造脚本、X/Z 镜像、坐标偏移、轻量体素预览

文件不会上传服务器。直接打开 `index.html` 即可使用；也可以把 `tools/shendao-miniw` 目录挂到任意静态服务器。

## 本地预览

```powershell
cd D:\Projects\Gaming\NEA-Revive
python -m http.server 18083 --directory tools\shendao-miniw
```

然后打开 `http://127.0.0.1:18083/`。
