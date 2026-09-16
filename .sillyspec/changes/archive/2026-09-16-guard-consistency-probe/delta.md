---
generated_at: 2026-09-16T13:03:50.662Z
sources_reconcile: 命中（ran_at=2026-09-16T13:02:38.829Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-16-guard-consistency-probe

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 34 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/probe9-guard-consistency.test.mjs、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 1 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/verify-postcheck.js | core-engine |
| src/verify-probes.js | core-engine |
| test/probe9-guard-consistency.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，2 项）：docs/sillyspec/architecture-4a.md；docs/sillyspec/doc-consistency-debt.md（疑似归因 task-05、task-06）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-16T12:56:20.700Z
- probe1：matches=0 / skippedFiles=0 / worktreeHits=1 / globEntries=0
- probe3：tasks=3 / hasTest=3
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 3 未匹配文件属 verify 探针域，archive 按 rebuild 建议定夺（对齐 cross-layer-contract-probe 先例：core-engine 最近变更行补录） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine（共 1 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/probe9-guard-consistency.test.mjs、docs/sillyspec/architecture-4a.md、docs/sillyspec/doc-consistency-debt.md

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-16-guard-consistency-probe.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
