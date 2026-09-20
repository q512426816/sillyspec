---
generated_at: 2026-09-20T00:20:16.706Z
sources_reconcile: 命中（ran_at=2026-09-20T00:19:25.195Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-20-fr-index-l2

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 41 |
| runtime | active | 12 |
| cli-entry | active | 9 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/fr-index-l2.test.mjs、docs/sillyspec/platform-interface-map.md

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 3 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/fr-index.js | core-engine |
| src/run/prompt.js | runtime |
| test/fr-index-l2.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，3 项）：docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/index.js（疑似归因 task-07、task-03、task-02、task-04、task-01、task-10、task-11、task-13、task-14、task-06）；src/run/gate-snapshot.js

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v2 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-20T00:05:51.496Z
- probe1：matches=0 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=5 / hasTest=4
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=6 / unclearedFiles=2

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（无 module-impact.md：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-09-20-fr-index-l2\module-impact.md 不存在——模块卡同步状态引用缺位）

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、runtime、cli-entry（共 3 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/fr-index-l2.test.mjs、docs/sillyspec/platform-interface-map.md

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-20-fr-index-l2.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
