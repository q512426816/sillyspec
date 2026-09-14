---
author: qinyi
created_at: 2026-09-14 12:45:00
generated_at: 2026-09-14T04:34:45.476Z
sources_reconcile: 命中（ran_at=2026-09-14T04:28:48.094Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-14-quick-exit-tiered-gates

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 29 |
| setup | active | 4 |
| cli-entry | active | 8 |
| runtime | active | 10 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/local.yaml.example、AGENTS.md、templates/agents-instruction.md、test/audit-quick-completion.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/sillyspec/platform-interface-map.md、test/quick-single-change-auto-link.test.mjs

### 声明域并集（decisions.md 模块域）

setup、core-engine、runtime、cli-entry

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/cli-entry.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/runtime.md | —（未匹配） |
| .sillyspec/local.yaml.example | —（未匹配） |
| AGENTS.md | —（未匹配） |
| src/change-risk-profile.js | core-engine |
| src/config-schema.js | setup |
| src/index.js | cli-entry |
| src/quick-gate-profile.js | core-engine |
| src/run/command.js | runtime |
| src/run/complete-handlers.js | runtime |
| src/run/complete.js | runtime |
| src/run/quick-audit.js | runtime |
| src/run/shared.js | runtime |
| src/scope-audit.js | core-engine |
| templates/agents-instruction.md | —（未匹配） |
| test/audit-quick-completion.test.mjs | —（未匹配） |
| test/quick-gate-profile.test.mjs | —（未匹配） |
| test/scope-audit.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，4 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-06）；docs/sillyspec/platform-interface-map.md（疑似归因 task-10）；src/run/stage.js（疑似归因 task-01）；test/quick-single-change-auto-link.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | setup |
| D-002@v1 | core-engine、runtime |
| D-003@v1 | core-engine |
| D-004@v2 | core-engine |
| D-005@v1 | runtime |
| D-006@v1 | core-engine |
| D-007@v1 | core-engine |
| D-008@v1 | core-engine、cli-entry |
| D-009@v1 | core-engine、setup |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-14T04:27:47.171Z
- probe1：matches=22 / skippedFiles=0 / worktreeHits=2 / globEntries=0
- probe3：tasks=6 / hasTest=5
- probe5：backendEndpoints=2 / frontendCalls=0
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | core-engine paths 追加 src/quick-gate-profile.js（Wave1 主代理两侧落盘，task-06 核对在位） | done |
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | task-06：quick-gate-profile 接口小节+QUICK_RISK_PATH_PATTERNS+scope-audit gateProfile/pickModuleMapProject+THRESHOLDS 定稿值 | done |
| `.sillyspec/docs/sillyspec/modules/runtime.md` | task-06：run/ 四接线点条目（挂载/落账/打印/flag 链，D-005/D-009 要点） | done |
| `.sillyspec/docs/sillyspec/modules/cli-entry.md` | task-06：scope-audit 命令双出口条目 | done |
| `.sillyspec/docs/sillyspec/modules/setup.md` | AGENTS.md/templates 选道规则改写未登记 setup 卡 | skipped（setup 卡 paths 仅源文件，规则面文档按惯例不逐条入卡；AGENTS.md 本身即规则载体） |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、setup、cli-entry、runtime（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/cli-entry.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/runtime.md、.sillyspec/local.yaml.example、AGENTS.md、templates/agents-instruction.md、test/audit-quick-completion.test.mjs、test/quick-gate-profile.test.mjs、test/scope-audit.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/sillyspec/platform-interface-map.md、test/quick-single-change-auto-link.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-14-quick-exit-tiered-gates.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
