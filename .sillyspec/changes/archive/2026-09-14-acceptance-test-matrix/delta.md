---
generated_at: 2026-09-14T16:54:37.211Z
sources_reconcile: 命中（ran_at=2026-09-14T16:54:13.202Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-14-acceptance-test-matrix

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| cli-entry | active | 8 |
| core-engine | active | 32 |
| stages | active | 2 |
| dispatch | active | 2 |
| runtime | active | 11 |
| worktree | active | 6 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/prompt/_extracted.json、docs/prompt/verify.md、templates/prompts/testcase-design.md、templates/prompts/verify-probes.md、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、.sillyspec/docs/sillyspec/modules/machine-interface.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/knowledge/INDEX.md、.sillyspec/knowledge/decisions/unmapped.md、SillySpec-能力亮点全景-2026-09-14.pptx、docs/prompt/README.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/execute-batch-zero-diff.test.mjs、test/stage-review.test.mjs、test/tooling-friction-fixes.test.mjs、~$SillySpec-能力亮点全景-2026-09-14.pptx

### 声明域并集（decisions.md 模块域）

core-engine、stages

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/verify.md | —（未匹配） |
| src/index.js | cli-entry |
| src/stage-contract.js | core-engine |
| src/stages/verify.js | stages |
| src/verify-probes.js | core-engine |
| templates/prompts/testcase-design.md | —（未匹配） |
| templates/prompts/verify-probes.md | —（未匹配） |
| test/acceptance-matrix-gate.test.mjs | —（未匹配） |
| test/acceptance-matrix-probe.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，22 项）：.sillyspec/docs/sillyspec/modules/machine-interface.md；.sillyspec/docs/sillyspec/modules/runtime.md（疑似归因 task-10）；.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（疑似归因 task-03）；.sillyspec/knowledge/INDEX.md；.sillyspec/knowledge/decisions/unmapped.md；SillySpec-能力亮点全景-2026-09-14.pptx；docs/prompt/README.md（疑似归因 task-03）；docs/sillyspec/architecture-4a.md；docs/sillyspec/doc-consistency-debt.md（疑似归因 task-05）；docs/sillyspec/file-lifecycle.md（疑似归因 task-10）；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；docs/sillyspec/prompt-control-debt.md；src/review-dispatch.js；src/run/complete-handlers.js（疑似归因 task-01）；src/run/complete.js（疑似归因 task-01）；src/stage-review.js（疑似归因 task-01）；src/task-review.js（疑似归因 task-01）；src/worktree-apply.js（疑似归因 task-07）；test/execute-batch-zero-diff.test.mjs（疑似归因 task-06）；test/stage-review.test.mjs；test/tooling-friction-fixes.test.mjs；~$SillySpec-能力亮点全景-2026-09-14.pptx

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine、stages |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-14T16:46:36.216Z
- probe1：matches=68 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=3 / hasTest=3
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无新增源文件（3 新文件均测试/模板/docs 产物），map 无需增改 | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：cli-entry、core-engine、stages、dispatch、runtime、worktree（共 6 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/prompt/_extracted.json、docs/prompt/verify.md、templates/prompts/testcase-design.md、templates/prompts/verify-probes.md、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、.sillyspec/docs/sillyspec/modules/machine-interface.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/knowledge/INDEX.md、.sillyspec/knowledge/decisions/unmapped.md、SillySpec-能力亮点全景-2026-09-14.pptx、docs/prompt/README.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/execute-batch-zero-diff.test.mjs、test/stage-review.test.mjs、test/tooling-friction-fixes.test.mjs、~$SillySpec-能力亮点全景-2026-09-14.pptx

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-14-acceptance-test-matrix.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
