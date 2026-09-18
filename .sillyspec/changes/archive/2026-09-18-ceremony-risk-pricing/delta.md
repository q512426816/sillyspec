---
generated_at: 2026-09-18T09:27:01.767Z
sources_reconcile: 命中（ran_at=2026-09-18T09:26:20.839Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-18-ceremony-risk-pricing

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| core-engine | active | 37 |
| setup | active | 4 |
| dispatch | active | 2 |
| runtime | active | 12 |
| stages | active | 2 |

未匹配文件（不归属任何模块 paths，人工裁量）：docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/plan.md、test/ceremony-tier.test.mjs、test/stage-review.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/prompt/README.md

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 8 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| docs/prompt/_extracted.json | —（未匹配） |
| docs/prompt/brainstorm.md | —（未匹配） |
| docs/prompt/plan.md | —（未匹配） |
| src/ceremony-tier.js | core-engine |
| src/config-schema.js | setup |
| src/doctor-diagnostics.js | core-engine |
| src/review-dispatch.js | dispatch |
| src/review-tier.js | core-engine |
| src/run/complete-handlers.js | runtime |
| src/run/gates.js | runtime |
| src/run/prompt.js | runtime |
| src/stages/brainstorm.js | stages |
| src/stages/plan.js | stages |
| src/verify-postcheck.js | core-engine |
| test/ceremony-tier.test.mjs | —（未匹配） |
| test/stage-review.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=post-apply / sources=main:diff-merge-base、main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，3 项）：.claude/CLAUDE.md；.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）；docs/prompt/README.md

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

快照时刻：2026-09-18T09:23:26.744Z
- probe1：matches=16 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=7 / hasTest=6
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | 已登记 src/ceremony-tier.js → core-engine（worktree a4029fa + apply 回传主仓生效） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：core-engine、setup、dispatch、runtime、stages（共 5 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：docs/prompt/_extracted.json、docs/prompt/brainstorm.md、docs/prompt/plan.md、test/ceremony-tier.test.mjs、test/stage-review.test.mjs、.claude/CLAUDE.md、.sillyspec/docs/sillyspec/modules/_module-map.yaml、docs/prompt/README.md

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-18-ceremony-risk-pricing.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
