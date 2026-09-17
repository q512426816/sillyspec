---
generated_at: 2026-09-17T13:04:06.306Z
sources_reconcile: 命中（ran_at=2026-09-17T12:46:50.737Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-17-pass-cap-semantics

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 34 |
| docs-consistency | active | 15 |
| runtime | active | 12 |
| stages | active | 2 |
| worktree | active | 6 |
| sync | active | 4 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/verify.md、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/cross-repo-verify.test.mjs、test/design-facts.test.mjs、test/pass-eligibility.test.mjs、test/probe7-anchor-testfile.test.mjs、test/run-complete-step-execute-batch.test.mjs、test/stage-contract.test.mjs、test/stage-review-checklist.test.mjs、test/task-review-adopt.test.mjs、test/verify-conclusion-slot.test.mjs、test/verify-handover-structured.test.mjs、test/wave-task-complete-gate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、docs/prompt/quick.md、docs/sillyspec/platform-interface-map.md、test/write-audit.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 13 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/brainstorm.md | —（未匹配） |
| docs/prompt/verify.md | —（未匹配） |
| src/change-risk-profile.js | core-engine |
| src/design-facts.js | docs-consistency |
| src/run/complete-handlers.js | runtime |
| src/run/complete.js | runtime |
| src/run/prompt.js | runtime |
| src/stage-contract.js | core-engine |
| src/stage-review-checklist.js | core-engine |
| src/stages/archive.js | stages |
| src/stages/brainstorm.js | stages |
| src/stages/verify.js | stages |
| src/task-review.js | core-engine |
| src/verify-facts-schema.js | core-engine |
| src/verify-postcheck.js | core-engine |
| src/verify-probes.js | core-engine |
| src/worktree-apply.js | worktree |
| test/acceptance-matrix-gate.test.mjs | —（未匹配） |
| test/acceptance-matrix-probe.test.mjs | —（未匹配） |
| test/cross-repo-verify.test.mjs | —（未匹配） |
| test/design-facts.test.mjs | —（未匹配） |
| test/pass-eligibility.test.mjs | —（未匹配） |
| test/probe7-anchor-testfile.test.mjs | —（未匹配） |
| test/run-complete-step-execute-batch.test.mjs | —（未匹配） |
| test/stage-contract.test.mjs | —（未匹配） |
| test/stage-review-checklist.test.mjs | —（未匹配） |
| test/task-review-adopt.test.mjs | —（未匹配） |
| test/verify-conclusion-slot.test.mjs | —（未匹配） |
| test/verify-handover-structured.test.mjs | —（未匹配） |
| test/wave-task-complete-gate.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，9 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；.sillyspec/docs/sillyspec/modules/stages.changelog.md；.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（疑似归因 task-03）；docs/prompt/quick.md（疑似归因 task-05）；docs/sillyspec/platform-interface-map.md（疑似归因 task-04、task-10、task-07）；src/stages/quick.js（疑似归因 task-03、task-04）；src/sync.js（疑似归因 task-04、task-06、task-07、task-08、task-09、task-11、task-12、task-13、task-14、task-05）；src/write-audit.js；test/write-audit.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v2 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v2 | （未填写） |
| D-006@v1 | （未填写） |
| D-007@v1 | （未填写） |
| D-008@v1 | （未填写） |
| D-011@v1 | （未填写） |
| D-012@v1 | （未填写） |
| D-013@v1 | （未填写） |
| D-010@v1 | （未填写） |
| D-009@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-17T12:35:28.925Z
- probe1：matches=89 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=8 / hasTest=8
- probe5：backendEndpoints=20 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / feKeys=0 / backendFields=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 状态 |
|---|---|
| _module-map.yaml | skipped（无 paths/entrypoints/依赖边变更——交付文件全落在既有模块 paths 内，模块边界零变化） |
| modules/core-engine.md | done（封顶语义/severity/probe 联动契约摘要级变化——经 module-changelog 流转，锚 D-001@v2/D-005@v2/D-003；不手扩正文避免与 changelog 双写） |
| modules/runtime.md | done（complete.js/complete-handlers.js：Wave 完成度门 assertWaveTasksComplete 契约面新增——锚 D-013，changelog 流转） |
| modules/worktree.md | done（worktree-apply.js：db/*.sql 兜底声明门 checkDbScriptDeclarationGate——锚 D-007/D-012，changelog 流转） |
| modules/stages.md | skipped（stages/archive.js definition 文案行级变化无接口变化；brainstorm/verify prompt 新增由镜像与 checklist 承载） |
| modules/docs-consistency.md | skipped（design-facts.js 无段头降 warning 属校验分支级行为，无卡片注意事项级契约变更） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、docs-consistency、runtime、stages、worktree、sync（共 6 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/verify.md、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/cross-repo-verify.test.mjs、test/design-facts.test.mjs、test/pass-eligibility.test.mjs、test/probe7-anchor-testfile.test.mjs、test/run-complete-step-execute-batch.test.mjs、test/stage-contract.test.mjs、test/stage-review-checklist.test.mjs、test/task-review-adopt.test.mjs、test/verify-conclusion-slot.test.mjs、test/verify-handover-structured.test.mjs、test/wave-task-complete-gate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、docs/prompt/quick.md、docs/sillyspec/platform-interface-map.md、test/write-audit.test.mjs

### 端点基线提示

- 端点增删：无增删（基线 5 端点 × 现算 5 端点，method+归一 path 全一致）
