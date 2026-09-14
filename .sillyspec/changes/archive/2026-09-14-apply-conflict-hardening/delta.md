---
generated_at: 2026-09-14T08:14:15.982Z
sources_reconcile: 命中（ran_at=2026-09-14T08:12:32.332Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-14-apply-conflict-hardening

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 29 |
| cli-entry | active | 8 |
| change-management | active | 2 |
| worktree | active | 6 |
| docs-consistency | active | 15 |
| runtime | active | 11 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/ROADMAP.md、.sillyspec/docs/sillyspec/modules/change-management.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.md、docs/sillyspec/troubleshooting.md、test/apply-conflict-hardening.test.mjs、SillySpec-能力亮点全景-2026-09-14.pptx、docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/sillyspec/design-d7-scan-lifecycle.md、docs/sillyspec/prompt-control-debt.md、test/design-facts.test.mjs、test/scan-refresh.test.mjs、test/validate-metadata-scope.test.mjs、test/worktree-apply-rescue.test.mjs

### 声明域并集（decisions.md 模块域）

worktree、core-engine、change-management、cli-entry

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/ROADMAP.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/change-management.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/worktree.changelog.md | —（未匹配） |
| .sillyspec/docs/sillyspec/modules/worktree.md | —（未匹配） |
| docs/sillyspec/troubleshooting.md | —（未匹配） |
| src/doctor-diagnostics.js | core-engine |
| src/index.js | cli-entry |
| src/quicklog.js | change-management |
| src/worktree-apply.js | worktree |
| test/apply-conflict-hardening.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，14 项）：SillySpec-能力亮点全景-2026-09-14.pptx；docs/prompt/_extracted.json（疑似归因 task-05）；docs/prompt/brainstorm.md；docs/sillyspec/design-d7-scan-lifecycle.md（疑似归因 task-04）；docs/sillyspec/prompt-control-debt.md；src/design-facts.js；src/run/gates.js（疑似归因 task-01）；src/scan-postcheck.js；src/scan-refresh.js；src/stages/brainstorm.js；test/design-facts.test.mjs；test/scan-refresh.test.mjs；test/validate-metadata-scope.test.mjs；test/worktree-apply-rescue.test.mjs（疑似归因 task-04）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | worktree、core-engine |
| D-002@v1 | worktree、change-management、cli-entry |
| D-003@v1 | worktree |
| D-004@v1 | worktree |
| D-005@v1 | worktree、core-engine |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-14T08:08:47.677Z
- probe1：matches=24 / skippedFiles=0 / worktreeHits=1 / globEntries=0
- probe3：tasks=4 / hasTest=4
- probe5：backendEndpoints=2 / frontendCalls=1
- probe6：deletions=0 / unavailable=false

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | 本变更未改（无新增源文件需登记；模块卡按既有模块更新） | done |
| `modules/worktree.md` + sidecar | task-04：写回收口/manifest/相交预检登记 | done |
| `modules/change-management.md` | task-04：collectActiveQuickGuardFiles/listQuickSessionGuards 登记 | done |
| `modules/core-engine.md` + sidecar | task-04：doctor 漂移检查登记 | done |
| `docs/sillyspec/troubleshooting.md` §64 | task-03：状态「已修复/落档」 | done |

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、cli-entry、change-management、worktree、docs-consistency、runtime、stages（共 7 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/ROADMAP.md、.sillyspec/docs/sillyspec/modules/change-management.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.md、docs/sillyspec/troubleshooting.md、test/apply-conflict-hardening.test.mjs、SillySpec-能力亮点全景-2026-09-14.pptx、docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/sillyspec/design-d7-scan-lifecycle.md、docs/sillyspec/prompt-control-debt.md、test/design-facts.test.mjs、test/scan-refresh.test.mjs、test/validate-metadata-scope.test.mjs、test/worktree-apply-rescue.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-14-apply-conflict-hardening.json 不存在或不可解析——端点增删不可比（backendEndpoints=2（>0））
