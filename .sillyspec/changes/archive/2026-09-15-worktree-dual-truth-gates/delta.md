---
generated_at: 2026-09-15T16:20:15.466Z
sources_reconcile: 命中（ran_at=2026-09-15T16:10:33.386Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-15-worktree-dual-truth-gates

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| setup | active | 4 |
| runtime | active | 12 |
| core-engine | active | 34 |
| worktree | active | 6 |
| change-management | active | 2 |
| sync | active | 3 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/sillyspec/troubleshooting.md、test/worktree-dual-truth-gates.test.mjs、.claude/full.json、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、test/change-list-operation.test.mjs、test/cross-repo-probe7-anchor.test.mjs、test/retro-verify-friction-fixes.test.mjs、test/scope-audit.test.mjs、test/worktree-apply-meta-exclude.test.mjs

### 声明域并集（decisions.md 模块域）

worktree、setup、core-engine、runtime

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/sillyspec/troubleshooting.md | —（未匹配） |
| src/config-schema.js | setup |
| src/run/complete.js | runtime |
| src/task-review.js | core-engine |
| src/verify-postcheck.js | core-engine |
| src/worktree-apply.js | worktree |
| src/worktree.js | worktree |
| test/worktree-dual-truth-gates.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，20 项）：.claude/full.json；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01）；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/worktree.changelog.md；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；src/change-list.js；src/contract-matrix.js；src/cross-repo-reconcile.js；src/probe7-anchor-check.js；src/run/gates.js（疑似归因 task-01）；src/run/prompt.js（疑似归因 task-01）；src/scope-audit.js；src/sync-noise.js；src/sync.js（疑似归因 task-04）；src/verify-probes.js；test/change-list-operation.test.mjs；test/cross-repo-probe7-anchor.test.mjs；test/retro-verify-friction-fixes.test.mjs；test/scope-audit.test.mjs；test/worktree-apply-meta-exclude.test.mjs（疑似归因 task-03）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | worktree |
| D-002@v1 | worktree |
| D-003@v1 | worktree、setup |
| D-004@v1 | core-engine、runtime |
| D-005@v1 | core-engine |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-15T15:53:20.861Z
- probe1：matches=5 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=6 / hasTest=6
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无未匹配的本变更文件（未匹配项均为并行会话在途，非索引过期） | skipped |
| `docs/sillyspec/modules/worktree.md` | execute 后认领 overlay/供给/no-op 段行为契约更新 | done（sidecar worktree.changelog.md 追加 2026-09-15 条目：三道 foreign 剔除/detectNoOpFiles/supplyFiles 供给） |
| `docs/sillyspec/modules/core-engine.md` | execute 后认领 helper/多归属/双根行为契约更新（如模块文档含相关章节） | done（sidecar core-engine.changelog.md 追加 2026-09-15 条目：collectWorktreeChangedFiles/多归属/V2 双根） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：setup、runtime、core-engine、worktree、change-management、sync（共 6 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/sillyspec/troubleshooting.md、test/worktree-dual-truth-gates.test.mjs、.claude/full.json、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、test/change-list-operation.test.mjs、test/cross-repo-probe7-anchor.test.mjs、test/retro-verify-friction-fixes.test.mjs、test/scope-audit.test.mjs、test/worktree-apply-meta-exclude.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-15-worktree-dual-truth-gates.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
