---
generated_at: 2026-09-21T16:35:25.907Z
sources_reconcile: 命中（ran_at=2026-09-21T16:27:57.794Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-21-r5-efficiency-batch3

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| cli-entry | active | 9 |
| machine-interface | active | 2 |
| runtime | active | 12 |
| worktree | active | 6 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/machine-interface.changelog.md、.sillyspec/docs/sillyspec/modules/machine-interface.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.md、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/plan.md、docs/sillyspec/platform-interface-map.md、test/archive-readiness.test.mjs、test/cli-top-level-aliases.test.mjs、test/gate-full-preflight.test.mjs、test/preflight-slimming.test.mjs、test/semantic-guard-prompt-inject.test.mjs、test/step-guide-default-on.test.mjs、test/step-guide-fingerprint.test.mjs、test/test-ledger.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 4 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/machine-interface.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/machine-interface.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.md | —（未匹配） |
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/execute.md | —（未匹配） |
| docs/prompt/plan.md | —（未匹配） |
| docs/sillyspec/platform-interface-map.md | —（未匹配） |
| src/index.js | cli-entry |
| src/machine-interface.js | machine-interface |
| src/run/gates.js | runtime、bin |
| src/run/prompt.js | runtime |
| src/run/quick-audit.js | runtime |
| src/run/test-ledger.js | runtime |
| test/archive-readiness.test.mjs | —（未匹配） |
| test/cli-top-level-aliases.test.mjs | —（未匹配） |
| test/gate-full-preflight.test.mjs | —（未匹配） |
| test/preflight-slimming.test.mjs | —（未匹配） |
| test/semantic-guard-prompt-inject.test.mjs | —（未匹配） |
| test/step-guide-default-on.test.mjs | —（未匹配） |
| test/step-guide-fingerprint.test.mjs | —（未匹配） |
| test/test-ledger.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，1 项）：src/worktree-apply.js（疑似归因 task-07、task-08、task-02、task-01、task-03、task-05）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-21T16:11:40.769Z
- probe1：matches=46 / skippedFiles=0 / worktreeHits=5 / globEntries=0
- probe3：tasks=5 / hasTest=4
- probe5：backendEndpoints=4 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=6 / unclearedFiles=5

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无需增改——未匹配文件为共位测试/镜像/卡尾教学 token（已去引用化），非模块索引缺口（task-05 核实） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：cli-entry、machine-interface、runtime、worktree（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/machine-interface.changelog.md、.sillyspec/docs/sillyspec/modules/machine-interface.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.md、docs/prompt/_extracted.json、docs/prompt/execute.md、docs/prompt/plan.md、docs/sillyspec/platform-interface-map.md、test/archive-readiness.test.mjs、test/cli-top-level-aliases.test.mjs、test/gate-full-preflight.test.mjs、test/preflight-slimming.test.mjs、test/semantic-guard-prompt-inject.test.mjs、test/step-guide-default-on.test.mjs、test/step-guide-fingerprint.test.mjs、test/test-ledger.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-21-r5-efficiency-batch3.json 不存在或不可解析——端点增删不可比（backendEndpoints=4（>0））
