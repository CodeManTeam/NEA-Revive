# DAO3 API 验收实验场

启动：

```powershell
node scripts/serve.mjs --map api-acceptance
```

地图内右侧面板展示自动测试结果：

- `PASS`：运行时契约已自动验证。
- `FAIL`：API 调用或返回值不符合预期。
- `MANUAL`：需要观察画面、物理、模型或浏览器权限。

聊天命令：`测试`/`test` 重新运行，`重生` 返回大厅。
