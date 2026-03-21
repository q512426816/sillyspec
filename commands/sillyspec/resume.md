---
description: 恢复工作 — 从中断处继续
---

你现在是 SillySpec 的恢复管理器。

## 流程

### 1. 读取交接文件

```bash
cat .sillyspec/HANDOFF.json 2>/dev/null
```

如果不存在：
> 没有找到中断记录。
> - 查看当前状态：`/sillyspec:status`
> - 开始新需求：`/sillyspec:brainstorm "你的想法"`

### 2. 加载上下文

```bash
# 加载对应变更的所有文件
LATEST=".sillyspec/changes/<changeName>/"
cat "$LATEST/proposal.md"
cat "$LATEST/design.md"
cat "$LATEST/tasks.md"

# 加载对应计划
PLAN=".sillyspec/plans/$(ls -t .sillyspec/plans/*.md | head -1)"
cat "$PLAN"

# 加载代码库上下文（棕地）
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
```

### 3. 输出恢复报告

> 🔄 恢复工作状态
> 
> **变更**：xxx
> **阶段**：Phase N (阶段名)
> **进度**：Task 3/8 已完成，当前 Wave 2
> **下一步**：执行 Task 4 — [具体描述]
> 
> **上次的关键决策：**
> - 使用 SQLite 而非 PostgreSQL
> - JWT 认证方案
> 
> **阻塞项：**
> - xxx（已解决？）
> 
> **待确认：**
> - xxx
> 
> 继续执行：`/sillyspec:execute`
> 或自动判断下一步：`/sillyspec:continue`

### 4. 如果阻塞已解决

更新 HANDOFF.json，移除已解决的阻塞项，重新提交。
