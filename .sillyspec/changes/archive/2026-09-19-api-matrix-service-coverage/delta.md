---
generated_at: 2026-09-19T00:07:31.133Z
sources_reconcile: 命中（ran_at=2026-09-19T00:00:25.667Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-19-api-matrix-service-coverage

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| cli-entry | active | 8 |
| core-engine | active | 38 |
| stages | active | 2 |
| runtime | active | 12 |

未匹配文件（不归属任何模块 paths，人工裁量）：templates/prompts/verify-probes.md、test/acceptance-matrix-probe.test.mjs、test/api-coverage-matrix.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、docs/sillyspec/platform-interface-map.md、test/module-match-portrace.test.mjs、test/quick-start-input-hint.test.mjs、test/verify-gate-snapshot.test.mjs、test/verify-quality-scan.test.mjs

### 声明域并集（decisions.md 模块域）

core-engine

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/index.js | cli-entry |
| src/probe7-anchor-check.js | core-engine |
| src/stage-contract.js | core-engine |
| src/stages/verify.js | stages |
| src/verify-probes.js | core-engine |
| templates/prompts/verify-probes.md | —（未匹配） |
| test/acceptance-matrix-probe.test.mjs | —（未匹配） |
| test/api-coverage-matrix.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，10 项）：.claude/CLAUDE.md；.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/runtime.changelog.md；docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/run/command.js（疑似归因 task-02、task-03、task-01）；src/verify-postcheck.js（疑似归因 task-03）；test/module-match-portrace.test.mjs；test/quick-start-input-hint.test.mjs；test/verify-gate-snapshot.test.mjs；test/verify-quality-scan.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | core-engine |
| D-002@v1 | core-engine |
| D-003@v1 | core-engine |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-18T23:47:03.044Z
- probe1：matches=33 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=4 / hasTest=4
- probe5：backendEndpoints=12 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=5 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/core-engine.md` | 模块文档「最近变更」行补录本变更 | done |
| `modules/stages.md`、`modules/cli-entry.md` | 文案级改动，模块文档无对应章节——不同步 | skipped（无 owned 章节可更新） |
| `_module-map.yaml` | templates/test 游离为存量形态，非本变更触发——不 rebuild（modules rebuild 会清空手工维护的 paths，见 _module-map.yaml 头注 ⚠️） | skipped（存量游离，另立项） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：cli-entry、core-engine、stages、runtime（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：templates/prompts/verify-probes.md、test/acceptance-matrix-probe.test.mjs、test/api-coverage-matrix.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、docs/sillyspec/platform-interface-map.md、test/module-match-portrace.test.mjs、test/quick-start-input-hint.test.mjs、test/verify-gate-snapshot.test.mjs、test/verify-quality-scan.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-19-api-matrix-service-coverage.json 不存在或不可解析——端点增删不可比（backendEndpoints=12（>0））
