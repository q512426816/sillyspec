---
generated_at: 2026-09-17T22:41:58.059Z
sources_reconcile: 命中（ran_at=2026-09-17T16:35:34.781Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-17-api-coverage-smoke

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 34 |
| setup | active | 4 |
| runtime | active | 12 |
| stages | active | 2 |
| machine-interface | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/prompt/_extracted.json、docs/prompt/verify.md、test/acceptance-matrix-gate.test.mjs、test/api-coverage-matrix.test.mjs、test/pass-eligibility.test.mjs、test/smoke-gate.test.mjs、test/stage-review-checklist.test.mjs、test/verify-conclusion-slot.test.mjs、test/verify-probes-facts.test.mjs、.claude/CLAUDE.md、.husky/pre-push、.sillyspec/archive-integrity-exempt.yaml、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/machine-interface.md、docs/sillyspec/interface-contract.md、test/check-syntax.mjs、test/diagnostic-codes-parity.test.mjs、test/doctor-archive-integrity.test.mjs、test/machine-interface.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 10 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/verify.md | —（未匹配） |
| src/change-risk-profile.js | core-engine |
| src/config-schema.js | setup |
| src/run/verify-quality-scan.js | runtime |
| src/stage-contract.js | core-engine |
| src/stage-review-checklist.js | core-engine |
| src/stages/verify.js | stages |
| src/verify-facts-schema.js | core-engine |
| src/verify-postcheck.js | core-engine |
| src/verify-probes.js | core-engine |
| test/acceptance-matrix-gate.test.mjs | —（未匹配） |
| test/api-coverage-matrix.test.mjs | —（未匹配） |
| test/pass-eligibility.test.mjs | —（未匹配） |
| test/smoke-gate.test.mjs | —（未匹配） |
| test/stage-review-checklist.test.mjs | —（未匹配） |
| test/verify-conclusion-slot.test.mjs | —（未匹配） |
| test/verify-probes-facts.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，15 项）：.claude/CLAUDE.md；.husky/pre-push；.sillyspec/archive-integrity-exempt.yaml；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/core-engine.md；.sillyspec/docs/sillyspec/modules/machine-interface.md；docs/sillyspec/interface-contract.md（疑似归因 task-06、task-04）；src/diagnostic-codes.js；src/doctor-diagnostics.js（疑似归因 task-05）；src/machine-interface.js（疑似归因 task-01、task-02）；test/check-syntax.mjs（疑似归因 task-05、task-02）；test/diagnostic-codes-parity.test.mjs；test/doctor-archive-integrity.test.mjs；test/machine-interface.test.mjs（疑似归因 task-08、task-07）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |
| D-006@v1 | （未填写） |
| D-007@v1 | （未填写） |
| D-008@v1 | （未填写） |
| D-010@v1 | （未填写） |
| D-009@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-17T16:31:08.610Z
- probe1：matches=33 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=7 / hasTest=7
- probe5：backendEndpoints=4 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 状态 |
|---|---|
| _module-map.yaml | skipped（无 paths/entrypoints/依赖边变更） |
| modules/core-engine.md | done（矩阵记账语义与第五条件经 module-changelog 流转） |
| modules/runtime.md | done（smoke 执行段+Wave 完成度门 changelog 流转） |
| modules/setup.md | skipped（config-smoke 纯数据登记） |
| modules/stages.md | skipped（verify prompt 文案级变化由镜像与 checklist 承载） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、setup、runtime、stages、machine-interface（共 5 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/prompt/_extracted.json、docs/prompt/verify.md、test/acceptance-matrix-gate.test.mjs、test/api-coverage-matrix.test.mjs、test/pass-eligibility.test.mjs、test/smoke-gate.test.mjs、test/stage-review-checklist.test.mjs、test/verify-conclusion-slot.test.mjs、test/verify-probes-facts.test.mjs、.claude/CLAUDE.md、.husky/pre-push、.sillyspec/archive-integrity-exempt.yaml、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/machine-interface.md、docs/sillyspec/interface-contract.md、test/check-syntax.mjs、test/diagnostic-codes-parity.test.mjs、test/doctor-archive-integrity.test.mjs、test/machine-interface.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-17-api-coverage-smoke.json 不存在或不可解析——端点增删不可比（backendEndpoints=4（>0））
