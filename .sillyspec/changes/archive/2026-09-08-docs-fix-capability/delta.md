---
generated_at: 2026-09-08T03:56:23.558Z
sources_reconcile: 命中（ran_at=2026-09-08T03:53:40.837Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-08-docs-fix-capability

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| docs-consistency | active | 12 |
| cli-entry | active | 8 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/docs-consistency.md、test/docs-check-fix.test.mjs、test/docs-fix-capability.test.mjs、test/docs-migrate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/docs/sillyspec/scan/TESTING.md、docs/agent-liveness-derivation-design-draft.md、docs/sillyspec/archify-reference-analysis-2026-09-04.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/multi-agent-review-2026-08-08.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/review-2026-08-09.md、docs/sillyspec/self-audit-2026-08-16.md、test/verify-postcheck-known-failures.test.mjs

### 声明域并集（decisions.md 模块域）

docs-consistency

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/docs-consistency.md | —（未匹配） |
| src/docs-check.js | docs-consistency |
| src/docs-migrate.js | docs-consistency |
| src/index.js | cli-entry |
| test/docs-check-fix.test.mjs | —（未匹配） |
| test/docs-fix-capability.test.mjs | —（未匹配） |
| test/docs-migrate.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，12 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-05）；.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（疑似归因 task-05）；.sillyspec/docs/sillyspec/scan/TESTING.md（疑似归因 task-05）；docs/agent-liveness-derivation-design-draft.md；docs/sillyspec/archify-reference-analysis-2026-09-04.md（疑似归因 task-04）；docs/sillyspec/architecture-4a.md（疑似归因 task-04）；docs/sillyspec/multi-agent-review-2026-08-08.md（疑似归因 task-04）；docs/sillyspec/platform-interface-map.md（疑似归因 task-04）；docs/sillyspec/prompt-control-debt.md（疑似归因 task-04）；docs/sillyspec/review-2026-08-09.md（疑似归因 task-04）；docs/sillyspec/self-audit-2026-08-16.md（疑似归因 task-04）；test/verify-postcheck-known-failures.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | docs-consistency |
| D-002@v1 | docs-consistency |
| D-003@v1 | docs-consistency |
| D-004@v1 | docs-consistency |
| D-005@v1 | docs-consistency |
| D-006@v1 | docs-consistency |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-08T03:52:38.439Z
- probe1：matches=10 / skippedFiles=3 / worktreeHits=0 / globEntries=0
- probe3：tasks=5 / hasTest=5
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（module-impact.md 存在但无「## 更新结果」小节——模块卡同步状态引用缺位）

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：docs-consistency、cli-entry（共 2 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/docs-consistency.md、test/docs-check-fix.test.mjs、test/docs-fix-capability.test.mjs、test/docs-migrate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/scan/ARCHITECTURE.md、.sillyspec/docs/sillyspec/scan/TESTING.md、docs/agent-liveness-derivation-design-draft.md、docs/sillyspec/archify-reference-analysis-2026-09-04.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/multi-agent-review-2026-08-08.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/review-2026-08-09.md、docs/sillyspec/self-audit-2026-08-16.md、test/verify-postcheck-known-failures.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-08-docs-fix-capability.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
