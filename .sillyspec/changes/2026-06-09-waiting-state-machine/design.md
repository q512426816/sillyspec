---
author: qinyi
created_at: "2026-06-09T11:33:00+08:00"
status: draft
---

# Waiting State Machine

## 背景

当前 SillySpec 的 step 状态机只有 `pending → completed/skipped` 两种状态。当 prompt 要求 Agent "等待用户确认/选择"时，Agent 在 `--done` 模式下会自问自答，然后调 `--done` 推进到下一步，导致需要人类决策的步骤被跳过。全阶段共 14 个问题点，其中 brainstorm 6 个最严重。

## 设计目标

1. 增加第三种 step 状态：`waiting`，表示"已产出中间结果，需要人类输入才能推进"
2. 新增 CLI 原语 `--wait` 和 `--continue`，让等待/恢复成为 CLI 级操作而非 Agent 自行处理
3. `--done` 硬校验：如果 step 输出包含 wait marker（`[WAIT_FOR_USER]` `[NEEDS_CONFIRM]` `[NEEDS_DECISION]`），CLI 拒绝推进
4. 非交互模式保护：平台/CI 模式下不能无限 waiting，必须 fail-fast 或走安全默认

## 非目标

- 不做 GUI 等待界面
- 不做远程通知（通知机制是独立需求）
- 不改变 step 的定义格式（保持现有的 name/prompt/outputHint/optional 结构）

## 总体方案

### Phase 1: 状态机扩展

**DB Schema 变更（SQLite）**

steps 表增加字段：

- `wait_reason TEXT` — 等待原因（人类可读）
- `wait_options TEXT` — JSON 数组，可选选项（如 `["方案A", "方案B", "方案C"]`）
- `wait_answer TEXT` — 用户回答

status 字段的有效值扩展为：`pending | in-progress | completed | skipped | waiting | failed`

### Phase 2: CLI 原语

新增 `--wait` 参数：

```shell
sillyspec run brainstorm --done --wait --reason "等待用户选择方案" --options "方案A,方案B,方案C"
```

效果：将当前 step 状态设为 `waiting`，记录 reason 和 options，不推进下一步。

新增 `--continue` 参数：

```shell
sillyspec run brainstorm --continue --answer "选择方案A"
```

效果：将当前 waiting 的 step 设为 completed，记录 answer，推进到下一步。

**--done 硬校验**

在 `completeStep()` 函数中，检查 outputText 是否包含 wait marker：

```typescript
const WAIT_MARKERS = ['[WAIT_FOR_USER]', '[NEEDS_CONFIRM]', '[NEEDS_DECISION]']
```

如果包含，CLI 输出：

```
❌ Refused: step requires human input. Use --wait instead of --done.
```

不写入 DB，直接退出（exit code 1）。

**--continue 流程**

1. 读取当前 waiting 的 step
2. 验证 answer 不为空
3. 将 step 设为 completed，记录 answer 到 output 和 wait_answer
4. 推进到下一步（调用 outputStep 输出下一步 prompt）

### Phase 3: Prompt 重写

所有 prompt 中"等待用户确认"的指令改写为：

**旧写法：**

```
等待用户选择或调整
```

**新写法：**

```
如果需要用户选择，不要替用户回答。
列出选项和推荐理由，在输出末尾添加标记：
[WAIT_FOR_USER]
reason: 等待用户选择方案
options: 方案A,方案B,方案C

然后执行：
sillyspec run <stage> --done --wait --reason "等待用户选择方案" --output "你的摘要"
```

同时 outputStep 底部的"完成后执行"模板需要更新：

- 有 waiting 可能的 step：提示两种路径（`--done` 正常完成 / `--wait` 等待用户）
- 无 waiting 可能的 step：保持现有 `--done` 提示

### Phase 4: 非交互模式保护

新增 `--non-interactive` 全局标记：

```shell
sillyspec run brainstorm --non-interactive
sillyspec run scan --non-interactive
```

在 `--wait` 触发时，如果 `--non-interactive`：

```
❌ Human decision required in non-interactive mode.
Reason: <wait_reason>
Options: <wait_options>
Fix: rerun with --interactive or provide decision via --continue --answer "..."
```

exit code 2（区分于 exit code 1 的参数错误）。

平台模式自动识别：如果启动时有 `--spec-root` 或 `--runtime-root`，默认 `--non-interactive`，除非显式传 `--interactive`。

### Phase 5: 进度显示

`sillyspec progress show` 中 waiting 状态的展示：

```
    ⏸️ Step 7: 提出 2-3 种方案 [WAITING]
       原因：等待用户选择方案
       选项：方案A, 方案B, 方案C
       等待时间：5 分钟前
```

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | src/db.js | steps 表增加 wait_reason/wait_options/wait_answer 字段 |
| 修改 | src/progress.js | VALID_STATUSES 增加 'waiting'，_showChange 展示等待信息 |
| 修改 | src/run.js | 新增 --wait/--continue/--non-interactive 参数处理；--done 硬校验；completeStep 支持 waiting 逻辑 |
| 修改 | src/stages/brainstorm.js | Step 2/5/6/7/8/11 prompt 重写，注入 wait 指令 |
| 修改 | src/stages/scan.js | Step 1/2/9 prompt 重写，条件 waiting |
| 修改 | src/stages/plan.js | 审查一致性 step prompt 重写 |
| 修改 | src/stages/execute.js | 确认执行范围 step 改为 CLI 参数 `--confirm-mode` |
| 修改 | src/stages/archive.js | Step 1/3/4 prompt 重写 |
| 新增 | .sillyspec/changes/2026-06-09-waiting-state-machine/design.md | 本文档 |

## 接口定义

### 新增 CLI 参数

```typescript
--wait              // 将 step 设为 waiting（需配合 --done）
--reason <string>   // 等待原因（配合 --wait）
--options <string>  // 逗号分隔的选项（配合 --wait）
--continue         // 从 waiting 恢复
--answer <string>  // 用户回答（配合 --continue）
--non-interactive  // 非交互模式，遇到 waiting 直接 fail
--confirm-mode <mode>  // execute 确认模式：wave|task|auto（替代 Agent 询问）
```

### WAIT_MARKERS 常量

```typescript
const WAIT_MARKERS = ['[WAIT_FOR_USER]', '[NEEDS_CONFIRM]', '[NEEDS_DECISION]']
```

### DB Schema

```sql
ALTER TABLE steps ADD COLUMN wait_reason TEXT;
ALTER TABLE steps ADD COLUMN wait_options TEXT;  -- JSON array
ALTER TABLE steps ADD COLUMN wait_answer TEXT;
```

## 兼容策略

- 现有 step 的 status 字段不会有 `waiting` 值，`findIndex(s => s.status === 'pending')` 不会匹配到 waiting 步骤
- `runStage()` 中的 `findIndex` 需要同时跳过 `completed`、`skipped`、`waiting`
- 无 waiting 步骤时行为完全不变
- DB migration 幂等（ALTER TABLE IF NOT EXISTS / ADD COLUMN 幂等）

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|------|------|------|----------|
| R-01 | Agent 仍然不输出 [WAIT] 标记 | P1 | --done 硬校验是兜底；prompt 多处强调 |
| R-02 | --continue answer 为空导致逻辑错误 | P2 | CLI 校验 --answer 非空 |
| R-03 | 非交互模式无法覆盖所有 waiting 场景 | P1 | 提供 --answer 参数作为 fallback |
| R-04 | DB migration 失败 | P2 | sql.js 的 ALTER TABLE 是内存操作，幂等执行 |
