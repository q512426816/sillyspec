---
generated_at: 2026-09-16T08:37:28.900Z
sources_reconcile: 命中（ran_at=2026-09-16T08:21:38.850Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-16-cross-layer-contract-probe

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 34 |
| setup | active | 4 |
| runtime | active | 12 |
| stages | active | 2 |
| worktree | active | 6 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/probe8-contract-pivot.test.mjs、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/setup.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/apply-docs-allowlist.test.mjs、test/cross-repo-apply.test.mjs、test/gate-snapshot-copy.test.mjs、test/probe7-anchor-testfile.test.mjs、test/receipt-multiline-parse.test.mjs、test/taskcard-duplicate-key.test.mjs、test/temp-boundary-spec-dir.test.mjs、test/verify-failure-ledger-noise.test.mjs、test/worktree-allow-list-violations.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 2 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/verify-postcheck.js | core-engine |
| src/verify-probes.js | core-engine |
| test/probe8-contract-pivot.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，25 项）：.sillyspec/docs/sillyspec/modules/core-engine.changelog.md；.sillyspec/docs/sillyspec/modules/runtime.changelog.md；.sillyspec/docs/sillyspec/modules/setup.changelog.md；.sillyspec/docs/sillyspec/modules/stages.changelog.md；.sillyspec/docs/sillyspec/modules/worktree.changelog.md；docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；docs/sillyspec/prompt-control-debt.md；src/config-schema.js（疑似归因 task-03）；src/probe7-anchor-check.js；src/run/gate-snapshot.js；src/run/gates.js（疑似归因 task-01、task-04、task-03、task-02）；src/run/shared.js（疑似归因 task-03、task-01、task-02、task-10）；src/stages/plan-postcheck.js；src/stages/verify.js（疑似归因 task-05）；src/verify-facts-schema.js；src/worktree-apply.js（疑似归因 task-07、task-08、task-02、task-01、task-03、task-05）；test/apply-docs-allowlist.test.mjs；test/cross-repo-apply.test.mjs；test/gate-snapshot-copy.test.mjs；test/probe7-anchor-testfile.test.mjs；test/receipt-multiline-parse.test.mjs；test/taskcard-duplicate-key.test.mjs；test/temp-boundary-spec-dir.test.mjs；test/verify-failure-ledger-noise.test.mjs；test/worktree-allow-list-violations.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-16T08:05:48.580Z
- probe1：matches=34 / skippedFiles=0 / worktreeHits=1 / globEntries=0
- probe3：tasks=3 / hasTest=3
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / feKeys=0 / backendFields=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 3 个未匹配文件（verify-probes.js/verify-postcheck.js/test 新文件）属 verify 探针域，现有模块卡无精确前缀归属（core-engine 为 CLI 核心域不匹配）——判定：archive 阶段按 rebuild 建议处理（verify 探针域是否独立成卡或并入 core-engine 由 archive 定夺，本次不抢跑） | skipped |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、setup、runtime、stages、worktree（共 5 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/probe8-contract-pivot.test.mjs、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/setup.changelog.md、.sillyspec/docs/sillyspec/modules/stages.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、docs/sillyspec/prompt-control-debt.md、test/apply-docs-allowlist.test.mjs、test/cross-repo-apply.test.mjs、test/gate-snapshot-copy.test.mjs、test/probe7-anchor-testfile.test.mjs、test/receipt-multiline-parse.test.mjs、test/taskcard-duplicate-key.test.mjs、test/temp-boundary-spec-dir.test.mjs、test/verify-failure-ledger-noise.test.mjs、test/worktree-allow-list-violations.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-16-cross-layer-contract-probe.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
