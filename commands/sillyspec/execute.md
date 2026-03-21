---
description: 波次执行 — 子代理并行 + 强制 TDD + 两阶段审查
---

你现在是 SillySpec 的执行器。

## 执行范围
$ARGUMENTS

## 加载上下文

```bash
# 检查工作区模式
cat .sillyspec/config.yaml 2>/dev/null
```

**如果是工作区模式：**
1. 根据计划中的 Task 标注（如 `[frontend]`），确定每个任务应在哪个子项目目录执行
2. 额外加载共享规范：
   ```bash
   cat .sillyspec/shared/*.md 2>/dev/null
   cat .sillyspec/workspace/CODEBASE-OVERVIEW.md 2>/dev/null
   ```
3. **执行任务前先 cd 到对应子项目目录**
4. 文件路径需相对于子项目目录解析

**如果不是工作区模式：** 原有流程不变。

```bash
# 计划文件
PLAN=$(ls -t .sillyspec/plans/*.md | head -1)
cat "$PLAN"

# 当前变更的规范
LATEST=$(ls -d .sillyspec/changes/*/ | grep -v archive | tail -1)
cat "$LATEST/tasks.md"
cat "$LATEST/design.md"

# 代码库约定
cat .sillyspec/codebase/CONVENTIONS.md 2>/dev/null
```

### 1.5 锚定确认（必须完成）

读取相关规范文件。对于存在的文件，确认理解；对于不存在的文件，标注跳过：

```
已读取并理解：
- [x] plan — 实现计划和执行顺序（如果存在）
- [x] tasks.md — 实现清单
- [x] design.md — 技术方案和文件变更（如果存在）

所有可用上下文已加载，开始执行。
```

**文件不存在不是错误**。只确认实际存在的文件。不准跳过此步骤。

如果 `$ARGUMENTS` 指定范围（如 `wave-1`、`task-3`），只执行对应部分。

## 执行策略

### 有 subagent 能力时（推荐）

**检查：** 尝试使用子代理（如 `/agent` 或 Claude Code 的 subagent）。

1. 按计划的 Wave 分组
2. 每个 Task 启动独立子代理执行
3. **子代理不继承主 session 历史**
4. 提供给子代理的上下文：
   - 任务描述（从计划中精确复制）
   - TDD 纪律（见下方）
   - 精确文件路径和代码示例
   - 代码库约定（从 CONVENTIONS.md 中提取相关部分）

### 无 subagent 时

在当前会话中逐任务串行执行。每完成一个任务，简要总结后继续下一个。

## 每个任务的 TDD 铁律

```
🔴 RED    → 先写测试，运行确认失败
🟢 GREEN  → 写最少代码让测试通过
🔵 REFACTOR → 清理，保持测试通过
✅ COMMIT  → git 提交（见下方规则）
```

**Git 提交规则：**
- 检查当前目录是否为 Git 仓库：`git rev-parse --is-inside-work-tree`
- 如果是 Git 仓库 → `git add -A && git commit`
- 如果不是 Git 仓库（工作区模式下子项目在父目录外）：
  1. 尝试 `cd` 到正在修改的子项目目录
  2. 检查该子项目是否为 Git 仓库
  3. 如果是 → 在子项目目录执行 `git add -A && git commit`
  4. 如果不是 → 跳过提交，但记录在任务完成报告中
- **不要跳过可以提交的 Git 仓库。**

**绝对禁止：**
- ❌ 先写代码后补测试
- ❌ "先写草稿回头再测"
- ❌ 跳过测试因为"太简单"
- ❌ 测试意外通过时不重写

**违反规则 → 删掉代码，从测试重新开始。** 不能保留为"参考"。

**例外（需人工确认）：** 抛弃型原型、生成代码、配置文件。

## 两阶段审查

每个任务完成后：

**阶段 A — 规范合规：**
- tasks.md 中对应 checkbox 完成了？
- design.md 技术方案一致？
- 测试有意义？覆盖边界？

**阶段 B — 代码质量：**
- DRY — 重复代码？
- YAGNI — 不需要的抽象？
- 死代码？
- 错误处理充分？
- 符合 CONVENTIONS.md？

**3 轮审查不通过 → 提交人工处理。**

## 偏差处理

遇到问题时的规则：
1. **停** — 不要自作主张
2. **报告** — 列出问题和解决方案
3. **等** — 人工确认后再继续
4. 代码缺关键部分 → 报告缺失，不自行补充

## 模型建议

| 任务类型 | 推荐模型 |
|---|---|
| 复杂架构 | 最强模型 |
| 常规实现 | 中等模型 |
| 简单修改 | 快速模型 |

> 有详细计划时，大部分实现是机械性的，便宜模型够用。

### 5. 自检门控（Hard Gate）

- [ ] 完成的 task 是否与 plan 一致？
- [ ] 是否意外修改了 plan 外的文件？（对比 plan 的文件变更清单）
- [ ] 每个 task 是否有 git commit？
- [ ] 测试是否全部通过？

**发现意外修改 → 报告给用户，不要自行决定。**

## 完成后

> 执行完成。共 N 个 Wave，M 个 Task。
> X 个审查通过，Y 个需修复。
> 请运行 `/sillyspec:verify` 做最终验证。
