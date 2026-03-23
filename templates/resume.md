你现在是 SillySpec 的恢复管理器。

## 流程

### 1. 读取 STATE.md

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

### 2. 如果有 STATE.md

直接从 STATE.md 中提取并展示：

> 🔄 工作状态恢复
>
> **当前变更**：<名称>
> **当前阶段**：<阶段名> <状态>
> **下一步**：<命令>
>
> **阶段进度**（大模块）：
> | 阶段 | 状态 |
> |---|---|
> | stage-1 列表页 | ✅ |
> | stage-2 表单页 | 🔄 execute (2/6) |
> | stage-3 详情页 | ⬜ |
>
> **关键决策**：
> - xxx
>
> **下一步命令**：
> `/sillyspec:execute reward-punishment/stage-2`

**不需要执行 Git 操作或文件探测。** STATE.md 已经包含所有信息。

然后问用户：直接继续，还是需要了解更多细节？

### 3. 如果没有 STATE.md

**不要直接说"没有记录"。** 自动探测项目状态：

```bash
# 检查主变更
ls .sillyspec/changes/*/MASTER.md 2>/dev/null

# 检查活跃变更
ls .d .sillyspec/changes/*/ | grep -v archive | grep -v stages | tail -1 2>/dev/null

# 检查子阶段
ls .sillyspec/changes/*/stages/*/proposal.md 2>/dev/null

# 检查代码库文档
ls .sillyspec/codebase/*.md 2>/dev/null

# 检查计划文件
ls -t .sillyspec/plans/*.md | head -1 2>/dev/null

# 检查需求/路线图
cat .sillyspec/REQUIREMENTS.md 2>/dev/null
cat .sillyspec/ROADMAP.md 2>/dev/null
```

#### 如果检测到 MASTER.md（大模块）

检查各阶段状态并输出阶段进度表（同步骤 2 格式）。

同时**创建 STATE.md**，将探测到的信息写入，后续命令执行时会自动更新。

#### 如果是普通变更（无 MASTER.md）

根据探测结果推断：

| 探测到的文件 | 推断阶段 | 建议操作 |
|---|---|---|
| 无任何 .sillyspec/ 内容 | 未开始 | `/sillyspec:init` 或 `/sillyspec:scan` |
| 有 codebase/ 但无 changes/ | 已扫描，未开始需求 | `/sillyspec:brainstorm "想法"` |
| 有 REQUIREMENTS.md 但无 changes/ | 绿地项目，已有需求 | `/sillyspec:propose 变更名` |
| changes/ 下有 proposal，无 tasks | 已有规范，待计划 | `/sillyspec:plan` |
| changes/ 下有 tasks，有未完成 checkbox | 执行中 | `/sillyspec:execute` |
| tasks.md 全部完成 | 待验证 | `/sillyspec:verify` |

**同时创建 STATE.md** 记录推断的状态。

### 4. 关键原则

- **不需要 HANDOFF.json**。STATE.md 是唯一的恢复数据源。
- **STATE.md 不需要 Git 提交**。它是工作状态文件，可以加入 `.gitignore`。
- **每次命令执行完自动更新 STATE.md**，不需要用户手动保存。
