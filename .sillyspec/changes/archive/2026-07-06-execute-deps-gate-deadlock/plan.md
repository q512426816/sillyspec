---
author: qinyi
created_at: 2026-07-07T07:42:38
plan_level: light
---

# 轻量计划：execute deps 门控 worktree cleanup 终态死锁修复

## 来源
直接引用 brainstorm 四件套（design.md / proposal.md / requirements.md / tasks.md / decisions.md）。方案 2+1′+3，fail-closed，门核心放行标准不动。

## 范围
- `src/progress.js`（runtime 模块）：新增 `alignExecuteToPlan` + `readPlanCheckboxStatus`
- `src/doctor-diagnostics.js`（worktree 诊断）：新增只读诊断项 `execute-progress-plan-mismatch`
- `src/index.js`（cli-entry）：doctor 命令 `--align-execute-progress` flag 分支
- `src/run.js`（runtime）：`enforceDepsGate` 诊断分支 + fail-loud
- `test/doctor-align-execute-progress.test.mjs`（新）
- `test/enforce-deps-gate-diagnostic.test.mjs`（新）
- `docs/sillyspec/file-lifecycle.md` + `modules/runtime.md` + `modules/worktree.md` + `.claude/skills/sillyspec-doctor/SKILL.md`（文档同步）

## Tasks
- [x] task-01: `src/progress.js` 新增 `alignExecuteToPlan` + `readPlanCheckboxStatus`（plan.md 全勾判定 + 补 execute 未完成 step 戳 + 显式置 stage status + dry-run/--confirm）（覆盖：FR-01, FR-02, FR-03, D-002@v1, D-003@v2, D-004@v1）
- [x] task-02: `src/doctor-diagnostics.js` 新增只读诊断项 `execute-progress-plan-mismatch` + safe_action 建议（不写 db）（覆盖：FR-04, D-001@v2）
- [x] task-03: `src/index.js` doctor 命令 `--align-execute-progress` flag 分支（仿 `--cleanup-remnant`，dry-run + `--confirm` + `--change` 解析，调 ProgressManager.alignExecuteToPlan）【依赖 task-01】（覆盖：FR-01, FR-03, D-001@v2）
- [x] task-04: `src/run.js` `enforceDepsGate` 诊断分支（worktreeGone 基于 `!existsSync(getWorktreePath(...))`，终态指向 doctor 对齐/重建 worktree，不放行）+ fail-loud stderr 块（覆盖：FR-05, FR-06, FR-07, D-005@v1）
- [x] task-05: 新增测试 `test/doctor-align-execute-progress.test.mjs`（全勾→补戳、未全勾→拒绝、dry-run vs --confirm）+ `test/enforce-deps-gate-diagnostic.test.mjs`（门控诊断分支 + fail-loud）（覆盖：FR-01~FR-07）
- [x] task-06: 文档同步 `docs/sillyspec/file-lifecycle.md`（doctor 新 flag + 诊断项）+ `modules/runtime.md`（progress.js 新方法）+ `modules/worktree.md`（enforceDepsGate 诊断分支）+ `.claude/skills/sillyspec-doctor/SKILL.md`（覆盖：NFR-03）
- [x] task-07:（附带候选，非核心）修 `src/run.js:3328` `skipStep` 的 `platformOpts` 未定义 bug（透传参数到 skipStep 签名），消除本流程被挡过的 `ReferenceError`

## 验收
- **AC-01**:worktree 已 cleanup + plan.md 全勾 → `sillyspec doctor --align-execute-progress --change X --confirm` 后 execute `stageData.status='completed'` + step 全 completed，`checkTransition(execute→verify)` 放行
- **AC-02**:plan.md 有未勾 task → `alignExecuteToPlan` 返回 `{ok:false, reason}`，不写 progress
- **AC-03**:默认无 `--align-execute-progress` → doctor 行为不变（`--cleanup-remnant`/`--fix`/`--json` 不受影响）
- **AC-04**:`doctor --json` 在 execute≠completed 且 plan 全勾时报告 `execute-progress-plan-mismatch` + safe_action，`runDoctorDiagnostics` 不写任何文件
- **AC-05**:`enforceDepsGate` 在 worktree 物理目录不存在时输出"worktree 不可用"分支提示（指向 align/create）+ stderr 含"本次 --done 未完成"块
- **AC-06**:门核心放行标准 `['linked','installed','n/a']` 不变；三者仍放行，其他仍拒
- **AC-07**:`npm test` 全量通过（含 2 个新测试文件）
- **AC-08**:文档同步完成（file-lifecycle / modules / skills）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v2 | task-02, task-03 | AC-03, AC-04（诊断/写分离 + 显式 flag） |
| D-002@v1 | task-01 | AC-01, AC-02（plan.md 全勾判定） |
| D-003@v2 | task-01 | AC-01（显式置 stage status） |
| D-004@v1 | task-01 | AC-01（声明优先，verify 兜底） |
| D-005@v1 | task-04 | AC-05（仅改拒绝侧 fail-loud） |
