---

你现在是 SillySpec 的交接管理器。

## 流程

### 1. 扫描当前状态

```bash
# 当前变更
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1 2>/dev/null)
if [ -n "$LATEST" ]; then
  cat "$LATEST/proposal.md" 2>/dev/null
  cat "$LATEST/tasks.md" 2>/dev/null
fi

# 当前计划
PLAN=$(ls -t .sillyspec/plans/*.md | head -1 2>/dev/null)
if [ -n "$PLAN" ]; then
  cat "$PLAN"
fi

# 已有的交接文件
cat .sillyspec/HANDOFF.json 2>/dev/null
```

### 2. 判断当前阶段

通过文件存在情况推断阶段：
- 只有 proposal → Phase 2 (Propose)
- 有 tasks.md，checkbox 未全部完成 → Phase 4 (Execute)
- tasks.md 全完成 → Phase 5 (Verify)
- 其他 → Phase 1 (Brainstorm)

### 3. 确认归档

在保存之前，展示即将保存的内容：
- 变更目录名
- 当前阶段和进度
- 下一步建议

**等待用户确认后再执行保存。**

### 4. 生成交接文件

保存到 `.sillyspec/HANDOFF.json`：

```json
{
  "timestamp": "ISO-8601",
  "changeName": "当前变更名",
  "currentPhase": 4,
  "phaseName": "execute",
  "tasksCompleted": [1, 2, 3],
  "tasksTotal": 8,
  "currentWave": 2,
  "nextStep": "执行 Task 4 — [具体描述]",
  "decisions": ["已做的关键决策"],
  "blockers": ["当前阻塞项"],
  "openQuestions": ["待确认的问题"],
  "recentCommits": ["最近 3 个 commit message"]
}
```

### 5. Git 提交

```bash
git add .sillyspec/HANDOFF.json
git commit -m "chore: sillyspec handoff"
```

### 最后说：

> ✅ 工作状态已保存。
> 
> **变更**：xxx | **阶段**：Phase 4 (Execute) | **进度**：Task 3/8
> **阻塞**：xxx（如已解决请告诉我）
> 
> 恢复：`/sillyspec:resume`
