---
generated_at: 2026-09-20T10:50:22.088Z
sources_reconcile: 命中（ran_at=2026-09-20T10:48:02.140Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-20-scope-audit-cross-repo

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 42 |
| cli-entry | active | 9 |
| runtime | active | 12 |

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.md、test/scope-audit-cross-repo.test.mjs、test/scope-audit.test.mjs、.claude/CLAUDE.md、analyze-transcript.cjs、asset-audit-2026-09-20/README.md、asset-audit-2026-09-20/asset-audit.cjs、asset-audit-2026-09-20/platform-archive.csv、asset-audit-2026-09-20/platform-fr.csv、asset-audit-2026-09-20/platform-knownissues.csv、asset-audit-2026-09-20/platform-modules.csv、asset-audit-2026-09-20/platform-quicklog.csv、asset-audit-2026-09-20/platform-troubleshooting.csv、asset-audit-2026-09-20/sillyspec-archive.csv、asset-audit-2026-09-20/sillyspec-fr.csv、asset-audit-2026-09-20/sillyspec-knownissues.csv、asset-audit-2026-09-20/sillyspec-modules.csv、asset-audit-2026-09-20/sillyspec-quicklog.csv、asset-audit-2026-09-20/sillyspec-troubleshooting.csv、asset-audit-2026-09-20/summary.json、docs/sillyspec/platform-interface-map.md、test/cursor-agent-transcript-detect.test.mjs、test/quick-close-linked-changes.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 2 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/core-engine.md | —（未匹配） |
| src/cross-repo-reconcile.js | core-engine |
| src/index.js | cli-entry |
| src/run/gates.js | runtime、bin |
| src/scope-audit.js | core-engine |
| src/verify-postcheck.js | core-engine、bin |
| test/scope-audit-cross-repo.test.mjs | —（未匹配） |
| test/scope-audit.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，21 项）：.claude/CLAUDE.md；analyze-transcript.cjs；asset-audit-2026-09-20/README.md；asset-audit-2026-09-20/asset-audit.cjs；asset-audit-2026-09-20/platform-archive.csv；asset-audit-2026-09-20/platform-fr.csv；asset-audit-2026-09-20/platform-knownissues.csv；asset-audit-2026-09-20/platform-modules.csv；asset-audit-2026-09-20/platform-quicklog.csv；asset-audit-2026-09-20/platform-troubleshooting.csv；asset-audit-2026-09-20/sillyspec-archive.csv；asset-audit-2026-09-20/sillyspec-fr.csv；asset-audit-2026-09-20/sillyspec-knownissues.csv；asset-audit-2026-09-20/sillyspec-modules.csv；asset-audit-2026-09-20/sillyspec-quicklog.csv；asset-audit-2026-09-20/sillyspec-troubleshooting.csv；asset-audit-2026-09-20/summary.json；docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/run/complete-handlers.js（疑似归因 task-01、task-02、task-04）；test/cursor-agent-transcript-detect.test.mjs；test/quick-close-linked-changes.test.mjs（疑似归因 task-04）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-20T10:41:39.079Z
- probe1：matches=36 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=5 / hasTest=4
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=6 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 无需增改：全部 src 变更文件已在既有模块 paths 内（上节逐行核实）；test/ 按惯例不入索引。core-engine.md 模块文档已同步（task-05：内核四档锚点/repos[] 信封/--file 跨仓路由/对外接口节扩写） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、cli-entry、runtime（共 3 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/core-engine.md、test/scope-audit-cross-repo.test.mjs、test/scope-audit.test.mjs、.claude/CLAUDE.md、analyze-transcript.cjs、asset-audit-2026-09-20/README.md、asset-audit-2026-09-20/asset-audit.cjs、asset-audit-2026-09-20/platform-archive.csv、asset-audit-2026-09-20/platform-fr.csv、asset-audit-2026-09-20/platform-knownissues.csv、asset-audit-2026-09-20/platform-modules.csv、asset-audit-2026-09-20/platform-quicklog.csv、asset-audit-2026-09-20/platform-troubleshooting.csv、asset-audit-2026-09-20/sillyspec-archive.csv、asset-audit-2026-09-20/sillyspec-fr.csv、asset-audit-2026-09-20/sillyspec-knownissues.csv、asset-audit-2026-09-20/sillyspec-modules.csv、asset-audit-2026-09-20/sillyspec-quicklog.csv、asset-audit-2026-09-20/sillyspec-troubleshooting.csv、asset-audit-2026-09-20/summary.json、docs/sillyspec/platform-interface-map.md、test/cursor-agent-transcript-detect.test.mjs、test/quick-close-linked-changes.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-20-scope-audit-cross-repo.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
