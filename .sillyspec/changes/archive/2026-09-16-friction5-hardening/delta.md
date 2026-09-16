---
generated_at: 2026-09-16T05:38:13.073Z
sources_reconcile: 命中（ran_at=2026-09-16T05:34:43.978Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-16-friction5-hardening

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| setup | active | 4 |
| core-engine | active | 34 |
| runtime | active | 12 |
| stages | active | 2 |
| worktree | active | 6 |
| cli-entry | active | 8 |
| machine-interface | active | 1 |
| change-management | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/setup.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、test/apply-docs-allowlist.test.mjs、test/cross-repo-apply.test.mjs、test/gate-snapshot-copy.test.mjs、test/probe7-anchor-testfile.test.mjs、test/receipt-multiline-parse.test.mjs、test/taskcard-duplicate-key.test.mjs、test/worktree-allow-list-violations.test.mjs、docs/sillyspec/platform-interface-map.md、test/cross-repo-verify.test.mjs、test/design-file-list-gate.test.mjs、test/plan-target-files.test.mjs、test/quicklog-commit-slice.test.mjs、test/register-repo-platform-split-brain.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 5 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/setup.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/stages.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/worktree.changelog.md | —（未匹配） |
| src/config-schema.js | setup |
| src/probe7-anchor-check.js | core-engine |
| src/run/gate-snapshot.js | runtime |
| src/run/gates.js | runtime |
| src/stages/plan-postcheck.js | stages |
| src/stages/verify.js | stages |
| src/verify-facts-schema.js | core-engine |
| src/verify-probes.js | core-engine |
| src/worktree-apply.js | worktree |
| test/apply-docs-allowlist.test.mjs | —（未匹配） |
| test/cross-repo-apply.test.mjs | —（未匹配） |
| test/gate-snapshot-copy.test.mjs | —（未匹配） |
| test/probe7-anchor-testfile.test.mjs | —（未匹配） |
| test/receipt-multiline-parse.test.mjs | —（未匹配） |
| test/taskcard-duplicate-key.test.mjs | —（未匹配） |
| test/worktree-allow-list-violations.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，13 项）：docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/index.js（疑似归因 task-07、task-03、task-02、task-04、task-01、task-10、task-11、task-13、task-14、task-06）；src/machine-interface.js（疑似归因 task-01、task-02）；src/quicklog.js；src/stages/brainstorm.js；src/stages/execute.js（疑似归因 task-03、task-04、task-07、task-01）；src/stages/plan.js（疑似归因 task-01）；src/verify-postcheck.js（疑似归因 task-03）；test/cross-repo-verify.test.mjs；test/design-file-list-gate.test.mjs；test/plan-target-files.test.mjs；test/quicklog-commit-slice.test.mjs；test/register-repo-platform-split-brain.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v2 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-16T05:30:59.661Z
- probe1：matches=43 / skippedFiles=0 / worktreeHits=5 / globEntries=0
- probe3：tasks=6 / hasTest=5
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / feKeys=0 / backendFields=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无未匹配文件（paths 归属无变化） | skipped |
| `.sillyspec/docs/sillyspec/modules/core-engine.changelog.md` | execute 后认领 verify-facts-schema 双形态/probe7 口径（sidecar changelog，主仓提交 21ef3ad） | done |
| `.sillyspec/docs/sillyspec/modules/stages.changelog.md` | execute 后认领 feasibility 重复键检测（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/worktree.changelog.md` | execute 后认领条件加白/declaredFace（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/runtime.changelog.md` | execute 后认领 gate-snapshot copy 面（sidecar changelog，同上） | done |
| `.sillyspec/docs/sillyspec/modules/setup.changelog.md` | execute 后认领 gate_snapshot.copy 键（sidecar changelog，同上） | done |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：setup、core-engine、runtime、stages、worktree、cli-entry、machine-interface、change-management（共 8 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/setup.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、test/apply-docs-allowlist.test.mjs、test/cross-repo-apply.test.mjs、test/gate-snapshot-copy.test.mjs、test/probe7-anchor-testfile.test.mjs、test/receipt-multiline-parse.test.mjs、test/taskcard-duplicate-key.test.mjs、test/worktree-allow-list-violations.test.mjs、docs/sillyspec/platform-interface-map.md、test/cross-repo-verify.test.mjs、test/design-file-list-gate.test.mjs、test/plan-target-files.test.mjs、test/quicklog-commit-slice.test.mjs、test/register-repo-platform-split-brain.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-16-friction5-hardening.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
