---
generated_at: 2026-09-19T10:27:59.765Z
sources_reconcile: 命中（ran_at=2026-09-19T10:18:50.379Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-19-span-risk-pattern-migration

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 41 |
| setup | active | 4 |
| runtime | active | 12 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/modules/setup.md、test/audit-quick-completion.test.mjs、test/ceremony-tier.test.mjs、test/modules-rebuild-preserve.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs、test/span-risk-surface.test.mjs、docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/verify.md、test/review-material-pack.test.mjs

### 声明域并集（decisions.md 模块域）

core-engine、runtime、docs-consistency、setup

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/_module-map.yaml | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/docs-consistency.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/setup.md | —（未匹配） |
| src/ceremony-tier.js | core-engine |
| src/change-risk-profile.js | core-engine |
| src/config-schema.js | setup |
| src/quick-gate-profile.js | core-engine |
| src/review-tier.js | core-engine |
| src/run/gates.js | runtime |
| src/run/shared.js | runtime |
| src/scope-audit.js | core-engine |
| src/span-risk-surface.js | core-engine |
| src/verify-postcheck.js | core-engine |
| test/audit-quick-completion.test.mjs | —（未匹配） |
| test/ceremony-tier.test.mjs | —（未匹配） |
| test/modules-rebuild-preserve.test.mjs | —（未匹配） |
| test/quick-gate-profile.test.mjs | —（未匹配） |
| test/scope-audit.test.mjs | —（未匹配） |
| test/span-risk-surface.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，9 项）：docs/prompt/_extracted.json（疑似归因 task-05、task-08）；docs/prompt/brainstorm.md；docs/prompt/verify.md（疑似归因 task-08）；src/review-material-pack.js；src/run/prompt.js（疑似归因 task-01、task-03、task-02）；src/stages/brainstorm.js；src/stages/execute.js（疑似归因 task-03、task-04、task-07、task-01）；src/stages/plan.js（疑似归因 task-01）；test/review-material-pack.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine、runtime、docs-consistency |
| D-003@v1 | core-engine、runtime、docs-consistency、setup |
| D-002@v1 | docs-consistency |
| D-004@v1 | docs-consistency |
| D-005@v1 | core-engine |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-19T10:13:39.797Z
- probe1：matches=12 / skippedFiles=0 / worktreeHits=2 / globEntries=0
- probe3：tasks=4 / hasTest=3
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | span-risk-surface 登记+QUICK 表退役收口+riskTable/spanRiskPatterns 口径（task-04 完成） | done |
| `modules/runtime.md` | gates/shared 两装载接线条目（task-04 完成） | done |
| `modules/setup.md` | config-schema note 条目（task-04 完成） | done |
| `modules/docs-consistency.md` | span_risk 段维护纪律+knowledge 登记职责（task-04 完成） | done |
| `_module-map.yaml` | core-engine paths 补 src/span-risk-surface.js + 顶层 span_risk 段（task-03 完成；回插钉在盘） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、setup、runtime、stages（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/docs/sillyspec/modules/setup.md、test/audit-quick-completion.test.mjs、test/ceremony-tier.test.mjs、test/modules-rebuild-preserve.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs、test/span-risk-surface.test.mjs、docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/verify.md、test/review-material-pack.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-19-span-risk-pattern-migration.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
