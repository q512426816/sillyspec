---
description: 恢复工作 — 从中断处继续
---

你现在是 SillySpec 的恢复管理器。

## 流程

### 1. 读取交接文件

```bash
cat .sillyspec/HANDOFF.json 2>/dev/null
```

### 2. 如果没有交接文件，自动探测状态

**不要直接说"没有记录"。** 先探测项目当前状态：

```bash
# 检查主变更（大模块）
ls .sillyspec/changes/*/MASTER.md 2>/dev/null

# 检查活跃变更
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1 2>/dev/null)

# 检查代码库文档
ls .sillyspec/codebase/*.md 2>/dev/null

# 检查计划文件
ls -t .sillyspec/plans/*.md | head -1

# 检查需求/路线图
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
cat .sillyspec/ROADMAP.md 2>/dev/null
```

### 2.5 如果是主变更（大模块），显示阶段进度

如果检测到 MASTER.md，进入大模块恢复模式。

**读取 MASTER.md 并检查各阶段状态：**

```bash
MASTER_DIR=".sillyspec/changes/<变更名>"
cat "$MASTER_DIR/MASTER.md"

# 检查每个阶段的状态
for STAGE in "$MASTER_DIR/stages"/*/; do
  STAGE_NAME=$(basename "$STAGE")
  # proposal / plan 是否存在
  # tasks.md 完成情况
done
```

**输出恢复报告：**

> 🔄 恢复工作状态（大模块）
>
> **主变更**：reward-punishment（奖惩台账）
> **整体进度**：阶段 2/5
>
> **各阶段状态：**
>
> | 阶段 | 范围 | propose | plan | 执行 | 状态 |
> |---|---|---|---|---|---|
> | 阶段 1 | 列表页 + 搜索 | ✅ | ✅ | ✅ | ✅ 已完成 |
> | 阶段 2 | 新建/编辑表单 | ✅ | ✅ | 2/6 | 🔄 进行中 |
> | 阶段 3 | 详情页 + 审核 | ⬜ | ⬜ | ⬜ | ⬜ 待开始 |
> | 阶段 4 | 导出 | ⬜ | ⬜ | ⬜ | ⬜ 待开始 |
> | 阶段 5 | 其他 | ⬜ | ⬜ | ⬜ | ⬜ 待开始 |
>
> **下一步**：继续执行阶段 2
> `/sillyspec:execute reward-punishment/stage-2`
>
> 或查看阶段详情：
> `/sillyspec:status reward-punishment/stage-2`

**更新 MASTER.md 状态**：将各阶段的实际状态同步到 MASTER.md 的"拆分计划"表格中（⬜→🔄→✅）。

### 2.6 如果是普通变更（无 MASTER.md）

根据探测结果推断并告知用户：

| 探测到的文件 | 推断阶段 | 建议操作 |
|---|---|---|
| 无任何 .sillyspec/ 内容 | 未开始 | `/sillyspec:init` 或 `/sillyspec:scan` |
| 有 codebase/ 但无 changes/ | 已扫描，未开始需求 | `/sillyspec:brainstorm "想法"` |
| 有 REQUIREMENTS.md 但无 changes/ | 绿地项目，已有需求 | `/sillyspec:propose 变更名` |
| changes/ 下有 proposal，无 tasks | 已有规范，待计划 | `/sillyspec:plan` |
| changes/ 下有 tasks，有未完成 checkbox | 执行中 | `/sillyspec:execute` |
| tasks.md 全部完成 | 待验证 | `/sillyspec:verify` |
| 有 HANDOFF.json | 有精确交接记录 | 正常恢复流程 |

### 3. 如果有交接文件，加载上下文

**先检查交接文件是否包含主变更信息：**

```bash
# 从 HANDOFF.json 中提取 changeName 和 masterChange
# 如果是子阶段，还需要定位到 stages/ 下的具体目录
```

```bash
# 加载对应变更的所有文件
CHANGE_DIR=".sillyspec/changes/<changeName>/"
cat "$CHANGE_DIR/proposal.md"
cat "$CHANGE_DIR/design.md"
cat "$CHANGE_DIR/tasks.md"

# 如果是子阶段，加载主变更上下文
if [ -f ".sillyspec/changes/<masterChange>/MASTER.md" ]; then
  cat ".sillyspec/changes/<masterChange>/MASTER.md"
fi

# 加载对应计划
PLAN=".sillyspec/plans/$(ls -t .sillyspec/plans/*.md | head -1)"
cat "$PLAN"

# 加载代码库上下文（棕地）
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
```

### 4. 输出恢复报告

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

### 5. 如果阻塞已解决

更新 HANDOFF.json，移除已解决的阻塞项，重新提交。
