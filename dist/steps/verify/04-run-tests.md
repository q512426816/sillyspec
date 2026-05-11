运行单元测试：

```bash
pnpm test 2>/dev/null || npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null
```

报告测试结果（通过/失败数量）。
