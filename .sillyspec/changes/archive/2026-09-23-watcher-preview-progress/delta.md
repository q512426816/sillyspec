---
generated_at: 2026-09-23T11:12:37.602Z
sources_reconcile: 命中（ran_at=2026-09-23T11:09:04.043Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-23-watcher-preview-progress

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 46 |
| cli-entry | active | 11 |
| runtime | active | 13 |
| progress | active | 2 |
| sync | active | 7 |
| setup | active | 5 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/preview-gate-isolation.test.mjs、test/preview-gc.test.mjs、test/preview-migration.test.mjs、test/preview-outlet.test.mjs、test/preview-progress.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/progress.md、.sillyspec/docs/sillyspec/modules/sync.md、.sillyspec/local.yaml.example、package.json、test/change-ownership-guards.test.mjs、test/gate-files-merge.test.mjs、test/platform-sync-schema.test.mjs、test/platform-sync-serialization.test.mjs、test/test-timeout-config.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 8 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/db.js | core-engine、bin |
| src/doctor-diagnostics.js | core-engine |
| src/handoff.js | cli-entry |
| src/index.js | cli-entry |
| src/preview-progress.js | runtime |
| src/progress.js | progress |
| src/progress/change-registry.js | progress、bin |
| src/watcher.js | sync |
| test/preview-gate-isolation.test.mjs | —（未匹配） |
| test/preview-gc.test.mjs | —（未匹配） |
| test/preview-migration.test.mjs | —（未匹配） |
| test/preview-outlet.test.mjs | —（未匹配） |
| test/preview-progress.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，16 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；.sillyspec/docs/sillyspec/modules/cli-entry.md（疑似归因 task-10、task-04、task-06）；.sillyspec/docs/sillyspec/modules/core-engine.md；.sillyspec/docs/sillyspec/modules/progress.md（疑似归因 task-10、task-01）；.sillyspec/docs/sillyspec/modules/sync.md；.sillyspec/local.yaml.example；package.json（疑似归因 task-05、task-07、task-10）；src/config-schema.js（疑似归因 task-03）；src/progress/shared.js（疑似归因 task-01）；src/run/quick-audit.js（疑似归因 task-03、task-02）；src/verify-postcheck.js（疑似归因 task-03）；test/change-ownership-guards.test.mjs；test/gate-files-merge.test.mjs；test/platform-sync-schema.test.mjs（疑似归因 task-08、task-01）；test/platform-sync-serialization.test.mjs（疑似归因 task-02）；test/test-timeout-config.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |
| D-006@v1 | （未填写） |
| D-007@v1 | （未填写） |
| D-008@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-23T11:04:55.774Z
- probe1：matches=25 / skippedFiles=0 / worktreeHits=6 / globEntries=0
- probe3：tasks=5 / hasTest=3
- probe5：backendEndpoints=4 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=6 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | 补 --preview flag 与 handoff 预览段登记 | done |
| `modules/core-engine.md` | 补 v7 authority/preview_evidence 列登记 | done |
| `modules/progress.md` | 补保险丝/归章/权威视图渲染/readPreviewProgress 登记（worktree 内实际卡片名见 sync/progress 卡） | done |
| `modules/sync.md` | 补 watcher 预览投影接线与 preview-progress 模块登记 | done |
| `_module-map.yaml` | runtime 模块 paths 补录 src/preview-progress.js（worktree 已改，apply 随合并） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、cli-entry、runtime、progress、sync、setup（共 6 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/preview-gate-isolation.test.mjs、test/preview-gc.test.mjs、test/preview-migration.test.mjs、test/preview-outlet.test.mjs、test/preview-progress.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/progress.md、.sillyspec/docs/sillyspec/modules/sync.md、.sillyspec/local.yaml.example、package.json、test/change-ownership-guards.test.mjs、test/gate-files-merge.test.mjs、test/platform-sync-schema.test.mjs、test/platform-sync-serialization.test.mjs、test/test-timeout-config.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-23-watcher-preview-progress.json 不存在或不可解析——端点增删不可比（backendEndpoints=4（>0））
