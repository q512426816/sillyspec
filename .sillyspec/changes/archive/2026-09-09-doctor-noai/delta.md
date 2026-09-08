---
generated_at: 2026-09-08T22:04:57.376Z
sources_reconcile: 命中（ran_at=2026-09-08T22:04:42.203Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-09-doctor-noai

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 26 |
| cli-entry | active | 8 |
| runtime | active | 8 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/stages.md、docs/prompt/_extracted.json、docs/prompt/doctor.md、docs/sillyspec/file-lifecycle.md、test/doctor-noai-fold.test.mjs、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/prompt-control-debt.md、test/foreign-own-priority.test.mjs、test/quick-recommend-filter.test.mjs

### 声明域并集（decisions.md 模块域）

stages、core-engine

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/stages.md | —（未匹配） |
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/doctor.md | —（未匹配） |
| docs/sillyspec/file-lifecycle.md | —（未匹配） |
| src/constants.js | core-engine |
| src/doctor-diagnostics.js | core-engine |
| src/index.js | cli-entry |
| src/run/complete.js | runtime |
| src/run/stage.js | runtime |
| src/stages/doctor.js | stages |
| test/doctor-noai-fold.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)
- missing（声明未落盘）：无
- undeclared（落盘未声明，11 项）：.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/stages.changelog.md；docs/sillyspec/architecture-4a.md；docs/sillyspec/prompt-control-debt.md；src/foreign-declared.js；src/quick-recommend.js；src/run/command.js（疑似归因 task-02）；src/run/gates.js（疑似归因 task-01）；src/run/shared.js（疑似归因 task-03）；test/foreign-own-priority.test.mjs；test/quick-recommend-filter.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | stages、core-engine |
| D-002@v1 | core-engine |
| D-003@v1 | core-engine |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-08T22:02:56.431Z
- probe1：matches=18 / skippedFiles=1 / worktreeHits=0 / globEntries=0
- probe3：tasks=3 / hasTest=3
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无变化（未增删模块） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、cli-entry、runtime、stages（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/stages.md、docs/prompt/_extracted.json、docs/prompt/doctor.md、docs/sillyspec/file-lifecycle.md、test/doctor-noai-fold.test.mjs、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、docs/sillyspec/architecture-4a.md、docs/sillyspec/prompt-control-debt.md、test/foreign-own-priority.test.mjs、test/quick-recommend-filter.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-09-doctor-noai.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
