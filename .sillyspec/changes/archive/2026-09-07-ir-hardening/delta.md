---
generated_at: 2026-09-07T16:38:55.397Z
sources_reconcile: 命中（ran_at=2026-09-07T16:38:17.779Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-07-ir-hardening

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| docs-consistency | active | 11 |
| core-engine | active | 25 |
| cli-entry | active | 8 |
| progress | active | 2 |
| runtime | active | 7 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/sillyspec/file-lifecycle.md、test/delta-scan-feedback.test.mjs、test/design-file-list-gate.test.mjs、test/docs-fix-receipt.test.mjs、test/ir-strict-mode.test.mjs、docs/agent-liveness-derivation-design-draft.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/troubleshooting.md、test/_cli-step-harness.mjs、test/_complete-step-harness.mjs、test/design-facts.test.mjs、test/docs-check-cli.test.mjs、test/docs-check-fix.test.mjs、test/doctor-verify-feedback.test.mjs、test/noai-completion-gate.test.mjs、test/run-complete-step-brainstorm.test.mjs、test/run-complete-step-verify.test.mjs、test/verify-postcheck-known-failures.test.mjs

### 声明域并集（decisions.md 模块域）

runtime、progress、docs-consistency、cli-entry、stages

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/sillyspec/file-lifecycle.md | —（未匹配） |
| src/archive-delta.js | docs-consistency |
| src/constants.js | core-engine |
| src/design-facts.js | docs-consistency |
| src/docs-check.js | docs-consistency |
| src/index.js | cli-entry |
| src/progress.js | progress |
| src/progress/change-registry.js | progress |
| src/run/complete-handlers.js | runtime |
| src/run/complete.js | runtime |
| src/run/gates.js | runtime |
| src/run/scan-profile.js | runtime |
| src/scan-postcheck.js | core-engine |
| src/verify-postcheck.js | core-engine |
| test/delta-scan-feedback.test.mjs | —（未匹配） |
| test/design-file-list-gate.test.mjs | —（未匹配） |
| test/docs-fix-receipt.test.mjs | —（未匹配） |
| test/ir-strict-mode.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，13 项）：docs/agent-liveness-derivation-design-draft.md；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；docs/sillyspec/troubleshooting.md（疑似归因 task-04）；test/_cli-step-harness.mjs；test/_complete-step-harness.mjs；test/design-facts.test.mjs；test/docs-check-cli.test.mjs（疑似归因 task-05）；test/docs-check-fix.test.mjs（疑似归因 task-04）；test/doctor-verify-feedback.test.mjs；test/noai-completion-gate.test.mjs（疑似归因 task-10）；test/run-complete-step-brainstorm.test.mjs；test/run-complete-step-verify.test.mjs；test/verify-postcheck-known-failures.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | runtime、progress |
| D-002@v1 | runtime |
| D-003@v1 | runtime |
| D-004@v1 | docs-consistency、runtime |
| D-005@v1 | cli-entry、runtime |
| D-006@v1 | runtime、stages |
| D-007@v1 | docs-consistency、cli-entry |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-07T16:35:20.561Z
- probe1：matches=41 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=10 / hasTest=9
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 模块文档 | 更新结论 |
|---|---|
| modules/runtime.md | done——严格模式闸门/P3b/P3a/design 清单 gate/sidecar 接线（verify-postcheck/gates/complete/complete-handlers/archive-delta/scan-profile） |
| modules/progress.md | done——getChangeCreatedAt 只读访问器 + facade 透传（change-registry.js/progress.js） |
| modules/docs-consistency.md | done——validateDesignFileList 新 gate + docs check --fix 回执 + supportedFixes 可执行化（design-facts/docs-check/scan-postcheck） |
| modules/stages.md | done——executeScanResumeCheck 增量 advisory（scan-profile.js，scan 步骤 4 noAI 动作内） |
| modules/cli-entry.md | done——delta project 同口径 + sidecar 写入 + 回执接线 + --suggest 退役（index.js） |
| modules/core-engine.md | done——IR_STRICT_SINCE 常量（constants.js） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：docs-consistency、core-engine、cli-entry、progress、runtime（共 5 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/sillyspec/file-lifecycle.md、test/delta-scan-feedback.test.mjs、test/design-file-list-gate.test.mjs、test/docs-fix-receipt.test.mjs、test/ir-strict-mode.test.mjs、docs/agent-liveness-derivation-design-draft.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/troubleshooting.md、test/_cli-step-harness.mjs、test/_complete-step-harness.mjs、test/design-facts.test.mjs、test/docs-check-cli.test.mjs、test/docs-check-fix.test.mjs、test/doctor-verify-feedback.test.mjs、test/noai-completion-gate.test.mjs、test/run-complete-step-brainstorm.test.mjs、test/run-complete-step-verify.test.mjs、test/verify-postcheck-known-failures.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-07-ir-hardening.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
