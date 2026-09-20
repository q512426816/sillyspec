---
generated_at: 2026-09-20T18:24:10.474Z
sources_reconcile: 命中（ran_at=2026-09-20T18:20:02.576Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-21-flow-command-cards

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| setup | active | 5 |
| machine-interface | active | 2 |
| cli-entry | active | 9 |
| docs-consistency | active | 15 |
| runtime | active | 12 |
| stages | active | 3 |
| core-engine | active | 42 |

未匹配文件（不归属任何模块 paths，人工裁量）：assets/command-cards/run-archive.md、assets/command-cards/run-brainstorm.md、assets/command-cards/run-execute.md、assets/command-cards/run-plan.md、assets/command-cards/run-quick.md、assets/command-cards/run-verify.md、assets/command-cards/status.md、test/command-cards.test.mjs、.npmignore、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/quick.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/dispatch/execute-dispatch-integration.test.mjs、test/knife-batch2.test.mjs、test/plan-execute-contract.test.mjs、test/r4-followup-fixes.test.mjs、test/test-timeout-downgrade.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 3 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| assets/command-cards/run-archive.md | —（未匹配） |
| assets/command-cards/run-brainstorm.md | —（未匹配） |
| assets/command-cards/run-execute.md | —（未匹配） |
| assets/command-cards/run-plan.md | —（未匹配） |
| assets/command-cards/run-quick.md | —（未匹配） |
| assets/command-cards/run-verify.md | —（未匹配） |
| assets/command-cards/status.md | —（未匹配） |
| src/command-cards.js | setup |
| test/command-cards.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，24 项）：.npmignore（疑似归因 task-01）；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-02、task-01、task-11）；.sillyspec/docs/sillyspec/modules/core-engine.md；docs/prompt/_extracted.json（疑似归因 task-05、task-08）；docs/prompt/execute.md（疑似归因 task-08）；docs/prompt/quick.md（疑似归因 task-05）；docs/sillyspec/architecture-4a.md；docs/sillyspec/file-lifecycle.md（疑似归因 task-10、task-06、task-05、task-04、task-07、task-03、task-09、task-08）；docs/sillyspec/platform-interface-map.md（疑似归因 task-02、task-10、task-07）；docs/sillyspec/prompt-control-debt.md；src/diagnostic-codes.js；src/index.js（疑似归因 task-07、task-03、task-02、task-04、task-01、task-10、task-11、task-13、task-14、task-06）；src/init.js（疑似归因 task-02）；src/machine-interface.js（疑似归因 task-01、task-02）；src/module-impact.js；src/run/gates.js（疑似归因 task-01、task-04、task-03、task-02）；src/run/quick-audit.js（疑似归因 task-03、task-02）；src/stages/execute.js（疑似归因 task-03、task-04、task-07、task-01）；src/verify-postcheck.js（疑似归因 task-03）；test/dispatch/execute-dispatch-integration.test.mjs（疑似归因 task-09）；test/knife-batch2.test.mjs；test/plan-execute-contract.test.mjs；test/r4-followup-fixes.test.mjs；test/test-timeout-downgrade.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-20T18:19:06.158Z
- probe1：matches=0 / skippedFiles=0 / worktreeHits=9 / globEntries=0
- probe3：tasks=2 / hasTest=2
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=3 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已补录：setup 模块 paths 增 src/command-cards.js（主仓+worktree 双侧落盘，lint module-map 覆盖全实证） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：setup、machine-interface、cli-entry、docs-consistency、runtime、stages、core-engine（共 7 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：assets/command-cards/run-archive.md、assets/command-cards/run-brainstorm.md、assets/command-cards/run-execute.md、assets/command-cards/run-plan.md、assets/command-cards/run-quick.md、assets/command-cards/run-verify.md、assets/command-cards/status.md、test/command-cards.test.mjs、.npmignore、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/core-engine.md、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/quick.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/file-lifecycle.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/dispatch/execute-dispatch-integration.test.mjs、test/knife-batch2.test.mjs、test/plan-execute-contract.test.mjs、test/r4-followup-fixes.test.mjs、test/test-timeout-downgrade.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-21-flow-command-cards.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
