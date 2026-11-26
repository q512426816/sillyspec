---
generated_at: 2026-11-14T15:53:02.821Z
sources_reconcile: 命中（ran_at=2026-11-14T15:47:18.075Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 缺失
sources_decisions: 命中
---

# 变更 Delta — 2026-11-14-scan-incremental

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

（无 module-map：docs/project/modules/_module-map.yaml 不存在或不可解析——模块归属推导跳过，交付文件全部按未匹配列出）

未匹配文件（不归属任何模块 paths，人工裁量）：.claude/skills/sillyspec-scan/SKILL.md、.gitignore、docs/prompt/_extracted.json、docs/prompt/scan.md、docs/sillyspec/file-lifecycle.md、src/hooks/worktree-guard.js、src/run/command.js、src/run/scan-profile.js、src/run/stage.js、src/scan-codegraph.js、src/scan-facts.js、src/scan-incremental.js、src/stages/scan.js、test/scan-codegraph.test.mjs、test/scan-incremental-wiring.test.mjs、test/scan-incremental.test.mjs、test/scan-facts.test.mjs、test/scan-paths.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 12 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .claude/skills/sillyspec-scan/SKILL.md | —（无 module-map） |
| .gitignore | —（无 module-map） |
| docs/prompt/_extracted.json | —（无 module-map） |
| docs/prompt/scan.md | —（无 module-map） |
| docs/sillyspec/file-lifecycle.md | —（无 module-map） |
| src/hooks/worktree-guard.js | —（无 module-map） |
| src/run/command.js | —（无 module-map） |
| src/run/scan-profile.js | —（无 module-map） |
| src/run/stage.js | —（无 module-map） |
| src/scan-codegraph.js | —（无 module-map） |
| src/scan-facts.js | —（无 module-map） |
| src/scan-incremental.js | —（无 module-map） |
| src/stages/scan.js | —（无 module-map） |
| test/scan-codegraph.test.mjs | —（无 module-map） |
| test/scan-incremental-wiring.test.mjs | —（无 module-map） |
| test/scan-incremental.test.mjs | —（无 module-map） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，2 项）：test/scan-facts.test.mjs（疑似归因 task-04）；test/scan-paths.test.mjs（疑似归因 task-04）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-006@v1 | （未填写） |
| D-007@v1 | （未填写） |
| D-008@v1 | （未填写） |
| D-009@v1 | （未填写） |
| D-012@v1 | （未填写） |
| D-011@v1 | （未填写） |
| D-010@v1 | （未填写） |
| D-005@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-11-14T15:43:33.954Z
- probe1：matches=9 / skippedFiles=0 / worktreeHits=5 / globEntries=0
- probe3：tasks=6 / hasTest=5
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=7 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 模块文档 | 状态 | 备注 |
|---|---|---|
| modules/_module-map.yaml | skipped | 本仓无 module-map（自身从未跑过 scan——正是本变更要解的现场）；按文件清单人工归属已在上表，归档时随 knowledge/uncategorized 沉淀 PowerShell .ps1 shim 吞 `--` token 坑 |

### scan 刷新建议

- （无 module-map：docs/project/modules/_module-map.yaml 不存在——受影响模块无法推导，建议先跑 sillyspec modules 同步补索引）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.claude/skills/sillyspec-scan/SKILL.md、.gitignore、docs/prompt/_extracted.json、docs/prompt/scan.md、docs/sillyspec/file-lifecycle.md、src/hooks/worktree-guard.js、src/run/command.js、src/run/scan-profile.js、src/run/stage.js、src/scan-codegraph.js、src/scan-facts.js、src/scan-incremental.js、src/stages/scan.js、test/scan-codegraph.test.mjs、test/scan-incremental-wiring.test.mjs、test/scan-incremental.test.mjs、test/scan-facts.test.mjs、test/scan-paths.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-11-14-scan-incremental.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
