---
generated_at: 2026-09-17T02:37:44.134Z
sources_reconcile: 命中（ran_at=2026-09-17T02:29:33.300Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-17-docs-bracket-reanchor

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| docs-consistency | active | 15 |
| setup | active | 4 |
| core-engine | active | 34 |
| runtime | active | 12 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/sillyspec/interface-contract.md、test/docs-fix-capability.test.mjs、test/docs-gate.test.mjs、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/quick.md、docs/prompt/verify.md、docs/sillyspec/troubleshooting.md、test/gate-snapshot-commands.test.mjs、test/plan-execute-contract.test.mjs、test/plan-optimization.test.mjs、test/plan-postcheck-cross-repo.test.mjs、test/probe7-anchor-testfile.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 3 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/sillyspec/interface-contract.md | —（未匹配） |
| src/docs-check.js | docs-consistency |
| src/docs-gate.js | docs-consistency |
| test/docs-fix-capability.test.mjs | —（未匹配） |
| test/docs-gate.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，19 项）：docs/prompt/_extracted.json（疑似归因 task-05、task-08）；docs/prompt/execute.md（疑似归因 task-08）；docs/prompt/quick.md（疑似归因 task-05）；docs/prompt/verify.md（疑似归因 task-08）；docs/sillyspec/troubleshooting.md（疑似归因 task-04）；src/config-schema.js（疑似归因 task-03）；src/probe7-anchor-check.js；src/run/gate-snapshot.js；src/run/gates.js（疑似归因 task-01、task-04、task-03、task-02）；src/stages/execute.js（疑似归因 task-03、task-04、task-07、task-01）；src/stages/plan-postcheck.js；src/stages/quick.js（疑似归因 task-03、task-04）；src/stages/verify.js（疑似归因 task-05）；src/verify-probes.js；test/gate-snapshot-commands.test.mjs；test/plan-execute-contract.test.mjs；test/plan-optimization.test.mjs；test/plan-postcheck-cross-repo.test.mjs；test/probe7-anchor-testfile.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-17T02:22:04.045Z
- probe1：matches=0 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=5 / hasTest=4
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| modules/docs-consistency.md | 契约摘要 docs-check/docs-gate 两行补方括号段与自动重锚能力面 + 变更索引追加本变更行 + updated_at 刷新（verify 收尾已同步） | done |
| _module-map.yaml | 无需增改（文件归属未变，非索引过期） | skipped |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：docs-consistency、setup、core-engine、runtime、stages（共 5 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/sillyspec/interface-contract.md、test/docs-fix-capability.test.mjs、test/docs-gate.test.mjs、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/quick.md、docs/prompt/verify.md、docs/sillyspec/troubleshooting.md、test/gate-snapshot-commands.test.mjs、test/plan-execute-contract.test.mjs、test/plan-optimization.test.mjs、test/plan-postcheck-cross-repo.test.mjs、test/probe7-anchor-testfile.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-17-docs-bracket-reanchor.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
