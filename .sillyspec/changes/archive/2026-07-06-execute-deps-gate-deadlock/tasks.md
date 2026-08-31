---
author: qinyi
created_at: 2026-07-07T07:36:55
change: 2026-07-06-execute-deps-gate-deadlock
---

# Tasks

> 仅列任务名称、主要文件、覆盖的 FR/D;依赖关系与 Wave 分组在 plan 阶段展开。

| task | 名称 | 主要文件 | 覆盖 FR | 覆盖 D |
|---|---|---|---|---|
| task-01 | `ProgressManager.alignExecuteToPlan` + `readPlanCheckboxStatus` | `src/progress.js` | FR-01, FR-02, FR-03 | D-002@v1, D-003@v2, D-004@v1 |
| task-02 | doctor-diagnostics 诊断项 `execute-progress-plan-mismatch`（只读） | `src/doctor-diagnostics.js` | FR-04 | D-001@v2 |
| task-03 | `index.js` doctor `--align-execute-progress` flag 分支 | `src/index.js` | FR-01, FR-03 | D-001@v2 |
| task-04 | `enforceDepsGate` 诊断分支 + fail-loud | `src/run.js` | FR-05, FR-06, FR-07 | D-005@v1 |
| task-05 | 测试（对齐逻辑 + 门控诊断分支 + fail-loud） | `test/doctor-align-execute-progress.test.mjs`、`test/enforce-deps-gate-diagnostic.test.mjs` | FR-01~FR-07 | — |
| task-06 | 文档同步（file-lifecycle + modules + skills） | `docs/sillyspec/file-lifecycle.md`、`modules/runtime.md`、`modules/worktree.md`、`.claude/skills/sillyspec-doctor/SKILL.md` | NFR-03 | — |

## 附带候选（plan 阶段决定是否纳入）
- task-07（候选）:修 `run.js:3328` `skipStep` 的 `platformOpts` 未定义 bug（本流程被它挡过,成本极低）。与本变更核心无关,可纳入或单开。
