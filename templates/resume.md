## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 直接说"没有记录"（无 STATE.md 时应自动探测）
- ❌ 修改任何文件（只读展示，但探测后可创建 STATE.md）

---

## 流程

### Step 1: 读取 STATE.md

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

**有 STATE.md：** 提取并展示当前变更、阶段、进度、下一步命令、阶段进度表、关键决策。AskUserQuestion：直接继续 / 查看更多细节。

**无 STATE.md：** 自动探测：

```bash
ls .sillyspec/changes/*/MASTER.md 2>/dev/null
ls -d .sillyspec/changes/*/ | grep -v archive | grep -v stages | tail -1 2>/dev/null
ls .sillyspec/changes/*/stages/*/proposal.md 2>/dev/null
ls .sillyspec/codebase/*.md .sillyspec/plans/*.md .sillyspec/{REQUIREMENTS,ROADMAP}.md 2>/dev/null
```

**探测结果推断：**

| 探测到的文件 | 推断阶段 | 建议操作 |
|---|---|---|
| 无 .sillyspec/ 内容 | 未开始 | `/sillyspec:init` 或 `/sillyspec:scan` |
| 有 SCAN-RAW.md 或 codebase 文档不全 | 扫描中断 | `/sillyspec:scan`（断点续扫） |
| codebase 7 份齐全无 changes/ | 已扫描未开始需求 | `/sillyspec:brainstorm` |
| 有 REQUIREMENTS.md 无 changes/ | 绿地有需求 | `/sillyspec:propose` |
| changes/ 有 proposal 无 tasks | 待计划 | `/sillyspec:plan` |
| tasks.md 有未完成 checkbox | 执行中 | `/sillyspec:execute` |
| tasks.md 全完成 | 待验证 | `/sillyspec:verify` |

**同时创建 STATE.md 记录推断状态。**

### 关键原则

- STATE.md 是唯一恢复数据源（不需要 HANDOFF.json）
- STATE.md 不需要 Git 提交（可加入 `.gitignore`）
- 每次命令执行完自动更新
