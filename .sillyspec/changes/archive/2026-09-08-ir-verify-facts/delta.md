---
generated_at: 2026-09-08T16:19:57.621Z
sources_reconcile: 命中（ran_at=2026-09-08T16:19:15.388Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-08-ir-verify-facts

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 26 |
| cli-entry | active | 8 |
| progress | active | 2 |
| runtime | active | 7 |
| stages | active | 2 |
| docs-consistency | active | 12 |
| change-management | active | 2 |
| sync | active | 2 |
| workflow | active | 1 |
| worktree | active | 5 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/progress.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/modules/stages.md、docs/prompt/_extracted.json、docs/prompt/verify.md、docs/sillyspec/file-lifecycle/stage-artifacts.md、test/verify-evidence-triple.test.mjs、test/verify-facts-v2.test.mjs、test/verify-probes-facts.test.mjs、test/verify-receipt-rerun.test.mjs、.claude/skills/sillyspec-auto/SKILL.md、.claude/skills/sillyspec-brainstorm/SKILL.md、.claude/skills/sillyspec-continue/SKILL.md、.claude/skills/sillyspec-execute/SKILL.md、.claude/skills/sillyspec-knowledge/SKILL.md、.claude/skills/sillyspec-plan/SKILL.md、.claude/skills/sillyspec-propose/SKILL.md、.claude/skills/sillyspec-resume/SKILL.md、.claude/skills/sillyspec-state/SKILL.md、.claude/skills/sillyspec-workspace/SKILL.md、.sillyspec/docs/sillyspec/modules/change-management.md、.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/progress.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/sync.md、.sillyspec/docs/sillyspec/modules/workflow.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/local.yaml.example、AGENTS.md、CLAUDE.md、INSTRUCTIONS.md、docs/prompt/archive.md、docs/prompt/brainstorm.md、docs/prompt/plan.md、docs/prompt/quick.md、docs/prompt/scan.md、docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/file-lifecycle/storage-and-state.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/review-2026-08-20-full-audit.md、docs/sillyspec/round-trip-economics-2026-09-08.md、src/runtime-hygiene.js、src/sync-noise.js、test/archive-runtime-prune.test.mjs、test/doctor-gc-unstamped-runs.test.mjs、test/feedback-batch2-hardening.test.mjs、test/plan-module-impact-autogen.test.mjs、test/plan-module-impact-sections.test.mjs、test/platform-temp-residue-heal.test.mjs、test/preimport-bak-rotation.test.mjs、test/quick-feedback-fileline-title.test.mjs、test/quick-step1-injection.test.mjs、test/runtime-hygiene.test.mjs、test/sync-noise.test.mjs、test/verify-conclusion-slot.test.mjs

### 声明域并集（decisions.md 模块域）

core-engine、stages、runtime、NEW:verify-facts-schema（新模块）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/_module-map.yaml | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/progress.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/stages.md | —（未匹配） |
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/verify.md | —（未匹配） |
| docs/sillyspec/file-lifecycle/stage-artifacts.md | —（未匹配） |
| src/change-risk-profile.js | core-engine |
| src/index.js | cli-entry |
| src/progress.js | progress |
| src/progress/change-registry.js | progress |
| src/run/gates.js | runtime |
| src/stage-contract.js | core-engine |
| src/stages/verify.js | stages |
| src/verify-facts-schema.js | core-engine |
| src/verify-postcheck.js | core-engine |
| src/verify-probes.js | core-engine |
| test/verify-evidence-triple.test.mjs | —（未匹配） |
| test/verify-facts-v2.test.mjs | —（未匹配） |
| test/verify-probes-facts.test.mjs | —（未匹配） |
| test/verify-receipt-rerun.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)
- missing（声明未落盘）：无
- undeclared（落盘未声明，77 项）：.claude/skills/sillyspec-auto/SKILL.md；.claude/skills/sillyspec-brainstorm/SKILL.md；.claude/skills/sillyspec-continue/SKILL.md；.claude/skills/sillyspec-execute/SKILL.md（疑似归因 task-10）；.claude/skills/sillyspec-knowledge/SKILL.md；.claude/skills/sillyspec-plan/SKILL.md（疑似归因 task-10）；.claude/skills/sillyspec-propose/SKILL.md；.claude/skills/sillyspec-resume/SKILL.md；.claude/skills/sillyspec-state/SKILL.md；.claude/skills/sillyspec-workspace/SKILL.md；.sillyspec/docs/sillyspec/modules/change-management.md；.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md；.sillyspec/docs/sillyspec/modules/cli-entry.md（疑似归因 task-10）；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md；.sillyspec/docs/sillyspec/modules/docs-consistency.md（疑似归因 task-06）；.sillyspec/docs/sillyspec/modules/progress.changelog.md；.sillyspec/docs/sillyspec/modules/runtime.changelog.md；.sillyspec/docs/sillyspec/modules/stages.changelog.md；.sillyspec/docs/sillyspec/modules/sync.md；.sillyspec/docs/sillyspec/modules/workflow.md；.sillyspec/docs/sillyspec/modules/worktree.changelog.md；.sillyspec/docs/sillyspec/modules/worktree.md（疑似归因 task-10）；.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（疑似归因 task-03）；.sillyspec/local.yaml.example；AGENTS.md；CLAUDE.md；INSTRUCTIONS.md；docs/prompt/archive.md（疑似归因 task-08）；docs/prompt/brainstorm.md；docs/prompt/plan.md（疑似归因 task-08）；docs/prompt/quick.md（疑似归因 task-05）；docs/prompt/scan.md（疑似归因 task-04）；docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md；docs/sillyspec/architecture-4a.md；docs/sillyspec/doc-consistency-debt.md（疑似归因 task-05）；docs/sillyspec/file-lifecycle.md（疑似归因 task-10）；docs/sillyspec/file-lifecycle/storage-and-state.md（疑似归因 task-09）；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；docs/sillyspec/prompt-control-debt.md；docs/sillyspec/review-2026-08-20-full-audit.md；docs/sillyspec/round-trip-economics-2026-09-08.md；src/change-delete.js；src/docs-check.js（疑似归因 task-01）；src/doctor-diagnostics.js（疑似归因 task-05）；src/module-impact.js；src/quicklog.js；src/run/command.js（疑似归因 task-02）；src/run/complete-handlers.js（疑似归因 task-01）；src/run/complete.js（疑似归因 task-01）；src/run/prompt.js（疑似归因 task-01）；src/run/shared.js（疑似归因 task-03）；src/run/stage.js（疑似归因 task-01）；src/runtime-hygiene.js；src/spec-sync.js；src/stage-review.js（疑似归因 task-01）；src/stages/plan-postcheck.js（疑似归因 task-02）；src/stages/plan.js（疑似归因 task-01）；src/stages/quick.js（疑似归因 task-03）；src/sync-noise.js；src/sync.js（疑似归因 task-04）；src/task-review.js（疑似归因 task-01）；src/workflow.js；src/worktree-apply.js（疑似归因 task-07）；src/worktree.js（疑似归因 task-01）；test/archive-runtime-prune.test.mjs；test/doctor-gc-unstamped-runs.test.mjs；test/feedback-batch2-hardening.test.mjs；test/plan-module-impact-autogen.test.mjs；test/plan-module-impact-sections.test.mjs；test/platform-temp-residue-heal.test.mjs；test/preimport-bak-rotation.test.mjs；test/quick-feedback-fileline-title.test.mjs；test/quick-step1-injection.test.mjs；test/runtime-hygiene.test.mjs；test/sync-noise.test.mjs；test/verify-conclusion-slot.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v2 | core-engine |
| D-002@v1 | core-engine、stages、runtime |
| D-003@v1 | core-engine |
| D-004@v1 | core-engine |
| D-005@v2 | core-engine、NEW:verify-facts-schema |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-08T16:15:48.421Z
- probe1：matches=55 / skippedFiles=4 / worktreeHits=0 / globEntries=0
- probe3：tasks=6 / hasTest=4
- probe5：backendEndpoints=2 / frontendCalls=1
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已增 verify-facts-schema.js 归 core-engine paths（task-06） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、cli-entry、progress、runtime、stages、docs-consistency、change-management、sync、workflow、worktree（共 10 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/progress.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/modules/stages.md、docs/prompt/_extracted.json、docs/prompt/verify.md、docs/sillyspec/file-lifecycle/stage-artifacts.md、test/verify-evidence-triple.test.mjs、test/verify-facts-v2.test.mjs、test/verify-probes-facts.test.mjs、test/verify-receipt-rerun.test.mjs、.claude/skills/sillyspec-auto/SKILL.md、.claude/skills/sillyspec-brainstorm/SKILL.md、.claude/skills/sillyspec-continue/SKILL.md、.claude/skills/sillyspec-execute/SKILL.md、.claude/skills/sillyspec-knowledge/SKILL.md、.claude/skills/sillyspec-plan/SKILL.md、.claude/skills/sillyspec-propose/SKILL.md、.claude/skills/sillyspec-resume/SKILL.md、.claude/skills/sillyspec-state/SKILL.md、.claude/skills/sillyspec-workspace/SKILL.md、.sillyspec/docs/sillyspec/modules/change-management.md、.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/progress.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/sync.md、.sillyspec/docs/sillyspec/modules/workflow.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/local.yaml.example、AGENTS.md、CLAUDE.md、INSTRUCTIONS.md、docs/prompt/archive.md、docs/prompt/brainstorm.md、docs/prompt/plan.md、docs/prompt/quick.md、docs/prompt/scan.md、docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/file-lifecycle/storage-and-state.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/review-2026-08-20-full-audit.md、docs/sillyspec/round-trip-economics-2026-09-08.md、src/runtime-hygiene.js、src/sync-noise.js、test/archive-runtime-prune.test.mjs、test/doctor-gc-unstamped-runs.test.mjs、test/feedback-batch2-hardening.test.mjs、test/plan-module-impact-autogen.test.mjs、test/plan-module-impact-sections.test.mjs、test/platform-temp-residue-heal.test.mjs、test/preimport-bak-rotation.test.mjs、test/quick-feedback-fileline-title.test.mjs、test/quick-step1-injection.test.mjs、test/runtime-hygiene.test.mjs、test/sync-noise.test.mjs、test/verify-conclusion-slot.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-08-ir-verify-facts.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
