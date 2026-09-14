---
generated_at: 2026-09-14T05:44:32.478Z
sources_reconcile: 命中（ran_at=2026-09-14T05:42:05.004Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-14-scan-incremental-refresh

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| hooks | active | 1 |
| cli-entry | active | 8 |
| runtime | active | 11 |
| core-engine | active | 29 |
| docs-consistency | active | 15 |
| setup | active | 4 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、test/scan-diff.test.mjs、test/scan-refresh.test.mjs、test/scan-staleness.test.mjs、test/worktree-guard.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/knowledge/decisions/cli-entry.md、.sillyspec/knowledge/decisions/core-engine.md、.sillyspec/knowledge/decisions/runtime.md、.sillyspec/knowledge/decisions/setup.md、.sillyspec/local.yaml.example、AGENTS.md、SillySpec-能力亮点全景-2026-09-14.pptx、docs/sillyspec/design-d7-scan-lifecycle.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/troubleshooting.md、templates/agents-instruction.md、test/audit-quick-completion.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs

### 声明域并集（decisions.md 模块域）

core-engine、docs-consistency、cli-entry、hooks

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/sillyspec/file-lifecycle.md | —（未匹配） |
| docs/sillyspec/platform-interface-map.md | —（未匹配） |
| src/hooks/worktree-guard.js | hooks |
| src/index.js | cli-entry |
| src/scan-diff.js | runtime |
| src/scan-postcheck.js | core-engine |
| src/scan-refresh.js | runtime |
| src/scan-staleness.js | docs-consistency |
| test/scan-diff.test.mjs | —（未匹配） |
| test/scan-refresh.test.mjs | —（未匹配） |
| test/scan-staleness.test.mjs | —（未匹配） |
| test/worktree-guard.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，27 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01）；.sillyspec/docs/sillyspec/modules/cli-entry.md（疑似归因 task-10）；.sillyspec/docs/sillyspec/modules/core-engine.md；.sillyspec/docs/sillyspec/modules/runtime.md（疑似归因 task-10）；.sillyspec/knowledge/decisions/cli-entry.md；.sillyspec/knowledge/decisions/core-engine.md；.sillyspec/knowledge/decisions/runtime.md；.sillyspec/knowledge/decisions/setup.md；.sillyspec/local.yaml.example；AGENTS.md；SillySpec-能力亮点全景-2026-09-14.pptx；docs/sillyspec/design-d7-scan-lifecycle.md（疑似归因 task-04）；docs/sillyspec/prompt-control-debt.md；docs/sillyspec/troubleshooting.md（疑似归因 task-04）；src/change-risk-profile.js；src/config-schema.js（疑似归因 task-03）；src/quick-gate-profile.js；src/run/command.js（疑似归因 task-02）；src/run/complete-handlers.js（疑似归因 task-01）；src/run/complete.js（疑似归因 task-01）；src/run/quick-audit.js（疑似归因 task-03）；src/run/shared.js（疑似归因 task-03）；src/scope-audit.js；templates/agents-instruction.md；test/audit-quick-completion.test.mjs（疑似归因 task-05）；test/quick-gate-profile.test.mjs；test/scope-audit.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine、docs-consistency |
| D-002@v1 | cli-entry、core-engine |
| D-003@v2 | core-engine、docs-consistency |
| D-007@v1 | hooks、core-engine |
| D-008@v1 | core-engine |
| D-009@v1 | core-engine、docs-consistency |
| D-004@v1 | core-engine |
| D-005@v1 | core-engine |
| D-006@v1 | docs-consistency |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-14T05:39:49.203Z
- probe1：matches=23 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=8 / hasTest=8
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已增改：src/scan-refresh.js 登记 core-engine paths（task-06 执行期 lint 驱动补录，commit 9e97b3e） | done |
| `modules/core-engine.md` `modules/docs-consistency.md` `modules/hooks.md` `modules/cli-entry.md` | module-docs-sync sidecar 变更索引行 + updated_at 戳（幂等） | done |
| 并行变更产物裁决 | diff 多出的 5 文件（knowledge/decisions/*.md ×4 + design-d7-scan-lifecycle.md）属并行会话 quick-exit-tiered-gates 归档期的 decision-distill/文档写入，非本变更范围——不列入本表；module-impact 列出的 13 文件已在交付 commit（4613c0e 前身，见 git log scan-refresh 交付提交）落地 | skipped（归属裁决记录） |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：hooks、cli-entry、runtime、core-engine、docs-consistency、setup（共 6 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、test/scan-diff.test.mjs、test/scan-refresh.test.mjs、test/scan-staleness.test.mjs、test/worktree-guard.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/knowledge/decisions/cli-entry.md、.sillyspec/knowledge/decisions/core-engine.md、.sillyspec/knowledge/decisions/runtime.md、.sillyspec/knowledge/decisions/setup.md、.sillyspec/local.yaml.example、AGENTS.md、SillySpec-能力亮点全景-2026-09-14.pptx、docs/sillyspec/design-d7-scan-lifecycle.md、docs/sillyspec/prompt-control-debt.md、docs/sillyspec/troubleshooting.md、templates/agents-instruction.md、test/audit-quick-completion.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-14-scan-incremental-refresh.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
