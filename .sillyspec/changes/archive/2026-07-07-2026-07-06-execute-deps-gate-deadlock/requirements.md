---
author: qinyi
created_at: 2026-07-07T07:36:55
change: 2026-07-06-execute-deps-gate-deadlock
---

# Requirements

## 角色表
| 角色 | 说明 |
|---|---|
| Agent（控制器） | 跑 sillyspec CLI、读 prompt、`--done` 推进 |
| Doctor（修复工具） | 显式对齐派生进度戳（基于 plan.md 声明） |
| 门控（enforceDepsGate） | execute `--done` 的 deps 验证硬门,保持 fail-closed |

## 功能需求

### FR-01: doctor --align-execute-progress 对齐 execute 戳
**Given** worktree 已 cleanup（物理目录不存在）且 plan.md 所有 task checkbox 全勾
**When** 执行 `sillyspec doctor --align-execute-progress --change X --confirm`
**Then** execute 阶段所有 status≠completed 的 step 标 completed,execute `stageData.status='completed'` + `completedAt`,`pm._write` 落盘

### FR-02: 对齐前置于 plan.md 全勾
**Given** plan.md 有任意未勾 task（checked < total）
**When** 执行 align（不论 --confirm）
**Then** 拒绝对齐,返回 `{ok:false, reason:'plan.md 有未勾选 task（X/Y）'}`,不写 progress

### FR-03: 默认 dry-run
**Given** 执行 `sillyspec doctor --align-execute-progress --change X`（无 --confirm）
**When** plan.md 全勾
**Then** 只报告将补哪些 step + 将置 stage status,不写 DB

### FR-04: 只读诊断项 execute-progress-plan-mismatch
**Given** execute status≠completed 且 plan.md 全勾
**When** `sillyspec doctor --json`
**Then** 诊断输出含该维度,safe_actions 建议 `sillyspec doctor --align-execute-progress --change <name>`;`runDoctorDiagnostics` 不写任何文件

### FR-05: 门控诊断分支（不放行）
**Given** execute --done 时 depsStatus 不在 `['linked','installed','n/a']` 且非 wave 级 opt-out
**When** `WorktreeManager.getWorktreePath(changeName)` 物理目录不存在
**Then** 拒绝（step=blocked + exit 1）不变,提示改为"worktree 不可用,跑 doctor --align-execute-progress 或 worktree create"
**When** 物理目录存在但 depsStatus 不达标
**Then** 维持原提示（`doctor --fix` 重供给）

### FR-06: fail-loud 拒绝输出
**Given** 门控拒绝
**Then** stderr 输出显眼阻断块,含"本次 --done 未完成,进度未推进"字样
**And** 不动成功侧 stdout 输出

### FR-07: 门核心标准不变
**Given** depsStatus ∈ `['linked','installed','n/a']`
**Then** 放行（与现状一致）
**And** 不引入 main commit 存在性作为放行条件

## 非功能需求
- **NFR-01 兼容**:未传 `--align-execute-progress` → doctor 行为不变。
- **NFR-02 安全**:`runDoctorDiagnostics` 保持只读（不写 db）；写操作只在 `ProgressManager.alignExecuteToPlan` 经 `--confirm` 触发。
- **NFR-03 文档**:同步 `docs/sillyspec/file-lifecycle.md` / modules 卡片 / `.claude/skills/sillyspec-doctor/`。
- **NFR-04 测试**:沿用内联 `assertEqual` 风格,`npm test` 全量通过。

## D-xxx@vN 覆盖关系
| 决策 | 覆盖 FR |
|---|---|
| D-001@v2（入口 + 诊断/写分离） | FR-01, FR-03, FR-04 |
| D-002@v1（plan.md 全勾判定） | FR-01, FR-02 |
| D-003@v2（显式置 stage status） | FR-01 |
| D-004@v1（声明优先,verify 兜底） | FR-01 |
| D-005@v1（仅改拒绝侧） | FR-06 |
