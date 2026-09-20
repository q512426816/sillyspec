---
generated_at: 2026-09-20T15:22:50.005Z
sources_reconcile: 命中（ran_at=2026-09-20T15:17:54.524Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 命中
sources_decisions: 命中
---

# 变更 Delta — 2026-09-20-taskcard-yaml-hardgate

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

| 模块 | status | paths+core_files 条目数 |
|---|---|---|
| stages | active | 3 |
| core-engine | active | 42 |

未匹配文件（不归属任何模块 paths，人工裁量）：test/acceptance-matrix-probe.test.mjs、test/cross-task-contracts.test.mjs、test/fixtures/taskcard-bad-yaml/task-01.md、test/fixtures/taskcard-bad-yaml/task-02.md、test/fixtures/taskcard-bad-yaml/task-03.md、test/plan-adopt-waves.test.mjs、test/taskcard-frontmatter-hardgate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml

### 声明域并集（decisions.md 模块域）

stages

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| src/stages/plan-postcheck.js | stages |
| src/taskcard-frontmatter.js | stages |
| src/verify-probes.js | core-engine、bin |
| test/acceptance-matrix-probe.test.mjs | —（未匹配） |
| test/cross-task-contracts.test.mjs | —（未匹配） |
| test/fixtures/taskcard-bad-yaml/task-01.md | —（未匹配） |
| test/fixtures/taskcard-bad-yaml/task-02.md | —（未匹配） |
| test/fixtures/taskcard-bad-yaml/task-03.md | —（未匹配） |
| test/plan-adopt-waves.test.mjs | —（未匹配） |
| test/taskcard-frontmatter-hardgate.test.mjs | —（未匹配） |

- 对账基线：status=undeclared / form=worktree / sources=worktree:diff-base..HEAD、worktree:status-porcelain(uncommitted)
- missing（声明未落盘）：无
- undeclared（落盘未声明，1 项）：.sillyspec/docs/sillyspec/modules/_module-map.yaml（疑似归因 task-01、task-11）

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v2 | stages |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-09-20T14:49:22.345Z
- probe1：matches=7 / skippedFiles=0 / worktreeHits=5 / globEntries=0
- probe3：tasks=4 / hasTest=3
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=5 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `_module-map.yaml` | stages.paths 补录 src/taskcard-frontmatter.js（lint 门模块归属盲区拦截后补登；随 worktree 交付 3f854037） | done |
| `modules/stages.md` | 契约摘要补 frontmatter YAML 硬校验段（0b 语义/双报豁免/yamlError 降级键/单一解析源） | done |
| `modules/core-engine.md` | verify-probes 条目补探针 7 坏 YAML 区分（parseTaskAcceptance 三态契约/fmError 渲染） | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- `sillyspec scan facts` 下次刷新重点关注：stages、core-engine（共 2 个模块）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：test/acceptance-matrix-probe.test.mjs、test/cross-task-contracts.test.mjs、test/fixtures/taskcard-bad-yaml/task-01.md、test/fixtures/taskcard-bad-yaml/task-02.md、test/fixtures/taskcard-bad-yaml/task-03.md、test/plan-adopt-waves.test.mjs、test/taskcard-frontmatter-hardgate.test.mjs、.sillyspec/docs/sillyspec/modules/_module-map.yaml

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-09-20-taskcard-yaml-hardgate.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
