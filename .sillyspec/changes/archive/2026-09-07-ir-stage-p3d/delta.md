---
generated_at: 2026-09-06T23:47:43.338Z
sources_reconcile: 命中（ran_at=2026-09-06T23:07:15.449Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-07-ir-stage-p3d

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| docs-consistency | active | 7 |
| cli-entry | active | 5 |
| runtime | active | 5 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/archive-delta.test.mjs、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/runtime.md

### 声明域并集（decisions.md 模块域）

core-engine、runtime、cli-entry

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/archive-delta.js | docs-consistency |
| src/design-facts.js | docs-consistency |
| src/index.js | cli-entry |
| src/run/complete-handlers.js | runtime |
| test/archive-delta.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，2 项）：.sillyspec/docs/sillyspec/modules/docs-consistency.md（疑似归因 task-06）；.sillyspec/docs/sillyspec/modules/runtime.md（疑似归因 task-10）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine、runtime、cli-entry |
| D-002@v1 | core-engine、cli-entry |
| D-003@v1 | core-engine、cli-entry |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-06T23:06:18.827Z
- probe1：matches=22 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=3 / hasTest=3
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/docs-consistency.md` | 更新模块卡（archive-delta + design-facts export） | done |
| `modules/cli-entry.md` | 更新模块卡（delta case） | done |
| `modules/runtime.md` | 更新模块卡（归档自动生成） | done |
| `_module-map.yaml` | 新文件 paths 后续批量补录 | skipped |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：docs-consistency、cli-entry、runtime（共 3 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/archive-delta.test.mjs、.sillyspec/docs/sillyspec/modules/docs-consistency.md、.sillyspec/docs/sillyspec/modules/runtime.md

### 端点基线提示

- backendEndpoints=2（>0）——端点 before/after 基线属独立立项（D-001@v1：contract-matrix 无 before 数据），本 delta 不含端点增删段
