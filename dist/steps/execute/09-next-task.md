当前任务完成后，推进到下一个任务。

1. 检查当前 Wave 是否还有未完成任务 → 继续分配
2. 当前 Wave 完成 → 根据确认频率决定是否暂停
3. 所有 Wave 完成 → 执行以下收尾

## 任务勾选自检（必须执行）

```bash
cat .sillyspec/changes/*/tasks.md 2>/dev/null
```

逐条验证：
1. 所有返回 DONE/DONE_WITH_CONCERNS 的任务是否已勾选 `- [x]`？
2. 勾选的任务是否都记录了精确到秒的时间戳 `[YYYY-MM-DD HH:MM:SS]`？
3. tasks.md 中是否还有未勾选 `- [ ]` 的已完成任务？

发现遗漏 → 立即补勾选 + 补时间戳。

## 知识库审阅

```bash
grep -c '^\### \[待确认\]' .sillyspec/knowledge/uncategorized.md 2>/dev/null
```

如果有待确认条目，提示用户审阅 `.sillyspec/knowledge/uncategorized.md`。

## 下一步

用 AskUserQuestion 询问用户：
1. **验证** — 执行 verify 全面验证
2. **归档** — 跳过 verify，执行 archive
3. **继续开发** — 不结束当前阶段
