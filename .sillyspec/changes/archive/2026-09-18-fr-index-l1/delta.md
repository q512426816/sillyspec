---
generated_at: 2026-09-18T00:27:10.097Z
sources_reconcile: 命中（ran_at=2026-09-18T00:26:15.015Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-18-fr-index-l1

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 35 |
| docs-consistency | active | 15 |
| runtime | active | 12 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/fr-index.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/sillyspec/platform-interface-map.md、test/acceptance-matrix-gate.test.mjs、test/doctor-archive-integrity.test.mjs、test/pass-eligibility.test.mjs、test/verify-handover-structured.test.mjs

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 8 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/fr-index.js | core-engine |
| test/fr-index.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，14 项）：.claude/CLAUDE.md；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；docs/sillyspec/platform-interface-map.md（疑似归因 task-10、task-07）；src/decision-distill.js（疑似归因 task-01）；src/doctor-diagnostics.js（疑似归因 task-05）；src/run/archive-distill.js（疑似归因 task-03）；src/run/prompt.js（疑似归因 task-04、task-01、task-03、task-02）；src/stage-contract.js（疑似归因 task-04、task-03、task-02）；src/stages/brainstorm.js（疑似归因 task-04）；src/verify-probes.js；test/acceptance-matrix-gate.test.mjs；test/doctor-archive-integrity.test.mjs（疑似归因 task-06）；test/pass-eligibility.test.mjs；test/verify-handover-structured.test.mjs

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |
| D-006@v1 | （未填写） |
| D-008@v1 | （未填写） |
| D-007@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-18T00:15:50.155Z
- probe1：matches=4 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=7 / hasTest=5
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | core-engine paths 补录 src/fr-index.js（verify 步 6 lint 盲区拦截驱动） | done |
| `modules/core-engine.md`（模块卡） | 最近变更行+frontmatter+changelog 边车（收尾批次） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、docs-consistency、runtime、stages（共 4 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/fr-index.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/sillyspec/platform-interface-map.md、test/acceptance-matrix-gate.test.mjs、test/doctor-archive-integrity.test.mjs、test/pass-eligibility.test.mjs、test/verify-handover-structured.test.mjs

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-18-fr-index-l1.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
