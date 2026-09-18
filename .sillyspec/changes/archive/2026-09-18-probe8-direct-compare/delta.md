---
generated_at: 2026-09-18T05:40:51.016Z
sources_reconcile: 命中（ran_at=2026-09-18T05:39:20.679Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-18-probe8-direct-compare

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 36 |
| docs-consistency | active | 15 |
| runtime | active | 12 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/probe8-contract-pivot.test.mjs、test/probe8-direct-compare.test.mjs、test/probe8-payload-parity.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、docs/sillyspec/platform-interface-map.md、test/check-syntax.mjs、test/doctor-archive-integrity.test.mjs、test/fr-index.test.mjs、test/knowledge-fr-stats.test.mjs、test/verify-handover-structured.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 6 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/verify-probes.js | core-engine |
| test/probe8-contract-pivot.test.mjs | —（未匹配） |
| test/probe8-direct-compare.test.mjs | —（未匹配） |
| test/probe8-payload-parity.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，18 项）：.claude/CLAUDE.md；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/core-engine.md；docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/decision-distill.js；src/doctor-diagnostics.js（疑似归因 task-05）；src/fr-index.js；src/knowledge-stats.js；src/run/archive-distill.js；src/run/prompt.js（疑似归因 task-01、task-03、task-02）；src/stage-contract.js（疑似归因 task-03、task-02）；src/stages/brainstorm.js；test/check-syntax.mjs（疑似归因 task-01、task-02、task-03、task-04、task-06）；test/doctor-archive-integrity.test.mjs；test/fr-index.test.mjs；test/knowledge-fr-stats.test.mjs；test/verify-handover-structured.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |
| D-006@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-18T01:52:28.668Z
- probe1：matches=0 / skippedFiles=0 / worktreeHits=1 / globEntries=0
- probe3：tasks=6 / hasTest=6
- probe5：backendEndpoints=20 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 状态 |
|---|---|
| _module-map.yaml | skipped（无边界变更） |
| modules/core-engine.md | done（probe8 直比维度 changelog 流转） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、docs-consistency、runtime、stages（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/probe8-contract-pivot.test.mjs、test/probe8-direct-compare.test.mjs、test/probe8-payload-parity.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、docs/sillyspec/platform-interface-map.md、test/check-syntax.mjs、test/doctor-archive-integrity.test.mjs、test/fr-index.test.mjs、test/knowledge-fr-stats.test.mjs、test/verify-handover-structured.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-18-probe8-direct-compare.json 不存在或不可解析——端点增删不可比（backendEndpoints=20（>0））
