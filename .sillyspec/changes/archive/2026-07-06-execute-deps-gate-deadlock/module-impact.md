---
author: qinyi
created_at: 2026-07-07T08:44:06
change: 2026-07-06-execute-deps-gate-deadlock
stage: archive
---

# Module Impact — execute deps 门控 worktree cleanup 终态死锁修复

## 变更范围（三重交叉验证）

- **声明范围**（design.md 文件变更清单）：4 源文件 + 2 测试 + 4 文档
- **任务范围**（plan.md task-01~07）：覆盖相同文件
- **真实变更**（`git diff --name-only HEAD`）：10 文件一致，无超范围

以 git diff 为准（真实 > 声明），三者一致。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|---|---|---|---|---|
| runtime | 逻辑变更 + 接口变更（新增方法） | src/progress.js | ProgressManager 新增 `alignExecuteToPlan`（plan.md 全勾 → 补 execute step 戳 + 显式置 stage status，D-003@v2）+ `readPlanCheckboxStatus` | false |
| runtime | 逻辑变更 | src/run.js | `enforceDepsGate` 诊断分支（worktreeGone 终态判定基于 `!existsSync(getWorktreePath)`，分支提示）+ fail-loud stderr 块；附带修复 skipStep `platformOpts` 透传（task-07） | false |
| cli-entry | 逻辑变更 | src/index.js | doctor 命令新增 `--align-execute-progress` flag 分支（仿 `--cleanup-remnant`，dry-run/--confirm/--change，调 alignExecuteToPlan） | false |
| worktree | 逻辑变更 | src/doctor-diagnostics.js | 新增只读诊断项 `execute-progress-plan-mismatch`（advisory，safe_action 建议对齐；严守只读硬约束 D-001@v2） | false |

## 文档同步（配套，非模块逻辑变更）

| 文件 | 更新 |
|---|---|
| docs/sillyspec/file-lifecycle.md | 补 doctor `--align-execute-progress` + 诊断项（updated_at 2026-07-07） |
| .sillyspec/docs/sillyspec/modules/runtime.md | ProgressManager alignExecuteToPlan 方法（契约摘要 + 数据流） |
| .sillyspec/docs/sillyspec/modules/worktree.md | enforceDepsGate 诊断分支 + fail-loud 说明（D-005@v1） |
| .claude/skills/sillyspec-doctor/SKILL.md | `--align-execute-progress` flag 同步 |

## 未匹配文件

| 文件 | 原因 | 建议 |
|---|---|---|
| test/doctor-align-execute-progress.test.mjs | 新增测试文件，非模块代码 | — |
| test/enforce-deps-gate-diagnostic.test.mjs | 新增测试文件，非模块代码 | — |

## 备注

- `src/doctor-diagnostics.js` 在 `_module-map.yaml` 未显式注册（语义属 worktree 诊断，worktree.md 卡片已覆盖 doctor 诊断），本次按语义归 worktree 模块。建议下次 scan 把 doctor-diagnostics.js 显式注册到模块映射。
- 本次**未改** sillyspec.db schema、**未改** worktree isolation 核心机制（create/cleanup/apply 不变）。
- 门控核心放行标准 `['linked','installed','n/a']` 不变（FR-07）。
- needs_review 全 false：影响明确（纯新增方法 + 拒绝侧诊断分支 + 文档同步），无不确定影响。
