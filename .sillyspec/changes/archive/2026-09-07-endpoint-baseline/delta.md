---
generated_at: 2026-09-07T00:21:12.725Z
sources_reconcile: 命中（ran_at=2026-09-07T00:20:58.168Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-07-endpoint-baseline

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| docs-consistency | active | 7 |
| cli-entry | active | 5 |
| stages | active | 1 |
| progress | active | 2 |
| change-management | active | 2 |
| runtime | active | 5 |
| core-engine | active | 21 |

未匹配文件（不归属任何模块 paths，人工裁量）：src/endpoint-baseline.js、test/archive-delta.test.mjs、test/endpoint-baseline.test.mjs、.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.md、docs/sillyspec/platform-interface-map.md、test/plan-target-files.test.mjs、test/quick-session-guard-cleanup.test.mjs、test/verify-probes-facts.test.mjs

### 声明域并集（decisions.md 模块域）

core-engine、runtime、cli-entry

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/archive-delta.js | docs-consistency |
| src/endpoint-baseline.js | —（未匹配） |
| src/index.js | cli-entry |
| src/stages/execute.js | stages |
| test/archive-delta.test.mjs | —（未匹配） |
| test/endpoint-baseline.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，14 项）：.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md；.sillyspec/docs/sillyspec/modules/runtime.md（疑似归因 task-10）；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；src/progress.js（疑似归因 task-02）；src/progress/change-registry.js（疑似归因 task-04）；src/quicklog.js；src/run/complete-handlers.js（疑似归因 task-01）；src/stages/plan-postcheck.js（疑似归因 task-02）；src/verify-postcheck.js（疑似归因 task-06）；test/plan-target-files.test.mjs；test/quick-session-guard-cleanup.test.mjs（疑似归因 task-01）；test/verify-probes-facts.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine、runtime、cli-entry |
| D-002@v1 | core-engine、cli-entry |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-07T00:19:56.452Z
- probe1：matches=12 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=4 / hasTest=4
- probe5：backendEndpoints=2 / frontendCalls=1
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 更新模块卡（endpoint-baseline） | done |
| `modules/cli-entry.md` | 更新模块卡（baseline 子命令） | done |
| `modules/stages.md` | 更新模块卡（Step3 指引） | done |
| `modules/docs-consistency.md` | 更新模块卡（delta 第五源） | done |
| `_module-map.yaml` | endpoint-baseline.js 后续批量补录 | skipped |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：docs-consistency、cli-entry、stages、progress、change-management、runtime、core-engine（共 7 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：src/endpoint-baseline.js、test/archive-delta.test.mjs、test/endpoint-baseline.test.mjs、.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.md、docs/sillyspec/platform-interface-map.md、test/plan-target-files.test.mjs、test/quick-session-guard-cleanup.test.mjs、test/verify-probes-facts.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-07-endpoint-baseline.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
