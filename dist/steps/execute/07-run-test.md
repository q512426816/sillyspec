子代理执行任务的验证步骤：运行测试。

按 tasks.md 中当前 task 的「步骤」字段第 4 步执行：运行测试确认通过。

- 运行全部测试，确认通过
- 运行 lint，自动修复可修复的问题
- lint 通过后 git add -A

## 子代理结果处理

子代理返回后，主代理：

1. **DONE** → 勾选 tasks.md，记录精确到秒的时间戳
2. **DONE_WITH_CONCERNS** → 勾选 tasks.md，记录问题到报告
3. **BLOCKED** → 不勾选，报告给用户，AskUserQuestion 三选一：
   - 重试（重新 dispatch 同一任务）
   - 跳过（勾选并标注 SKIPPED）
   - 停止（暂停执行，用户处理后继续）

**知识库写入：** 如果子代理报告中「发现的坑」不为"无"，追加到 `.sillyspec/knowledge/uncategorized.md`：
```markdown
### [待确认] {简短标题}
> 来源：{变更名} / {task 编号} | {时间戳}

{坑的具体描述}
```
