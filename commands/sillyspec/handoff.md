---
description: 保存工作状态 — GSD Phase Context 模式
---

你现在是 SillySpec 的交接管理器。

## 流程

### 1. 扫描当前状态

```bash
# 当前变更
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1 2>/dev/null)

# 检测是否是主变更（大模块）
if ls .sillyspec/changes/*/MASTER.md 1>/dev/null 2>&1; then
  MASTER_DIR=$(ls -d .sillyspec/changes/*/MASTER.md | tail -1 | xargs dirname)
  MASTER_NAME=$(basename "$MASTER_DIR")
  echo "MASTER_CHANGE=$MASTER_NAME"
  # 检查当前进度最前的未完成阶段
  for STAGE in "$MASTER_DIR/stages"/*/; do
    STAGE_NAME=$(basename "$STAGE")
    if [ -f "$STAGE/tasks.md" ]; then
      # 检查是否有未完成的 checkbox
      if grep -q "\- \[ \]" "$STAGE/tasks.md" 2>/dev/null; then
        echo "CURRENT_STAGE=$STAGE_NAME"
        break
      fi
    elif [ -f "$STAGE/proposal.md" ] && [ ! -f "$STAGE/tasks.md" ]; then
      echo "CURRENT_STAGE=$STAGE_NAME"
      break
    elif [ ! -f "$STAGE/proposal.md" ]; then
      echo "NEXT_STAGE=$STAGE_NAME"
      break
    fi
  done
fi

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

**如果是主变更，额外记录：** 当前所在的阶段名和整体进度。

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
  "masterChange": "主变更名（如果是子阶段）",
  "currentStage": "stage-2（当前阶段名，如果是子阶段）",
  "stagesTotal": 5,
  "stagesCompleted": 1,
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

**新增字段说明：**
- `masterChange`：如果是子阶段变更，记录主变更名
- `currentStage`：当前所在阶段（如 stage-2）
- `stagesTotal` / `stagesCompleted`：大模块的整体进度

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
