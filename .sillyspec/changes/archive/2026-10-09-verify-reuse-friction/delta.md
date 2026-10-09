---
generated_at: 2026-10-09T12:31:55.109Z
sources_reconcile: 命中（ran_at=2026-10-09T12:28:23.449Z，verify-runs 按 change 过滤取最新）
sources_verify_facts: 命中
sources_module_map: 缺失
sources_decisions: 命中
---

# 变更 Delta — 2026-10-09-verify-reuse-friction

## Before（变更前状态）

### 受影响模块（module-map 注册摘要）

（无 module-map：docs/project/modules/_module-map.yaml 不存在或不可解析——模块归属推导跳过，交付文件全部按未匹配列出）

未匹配文件（不归属任何模块 paths，人工裁量）：.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、src/cross-repo-reconcile.js、src/friction-tally.js、src/index.js、src/run/code-face-key.js、src/run/gates.js、src/run/green-cache.js、src/run/verify-quality-scan.js、src/test-bindings.js、src/verify-postcheck.js、src/wt-commit.js、test/code-face-key-doc-commit-survival.test.mjs、test/cross-repo-reconcile-baseline-anchor.test.mjs、test/gates-snapshot-fallback-visibility.test.mjs、test/gates-verify-cheap-gates-first.test.mjs、test/test-bindings-crossrepo-row-resolution.test.mjs、test/verify-quality-scan-reuse-actual-scope.test.mjs、test/verify-test-result-reuse-observability.test.mjs、test/wt-commit-crossrepo-infer.test.mjs、src/run/gate-snapshot.js、src/verify-probes.js

### 声明域并集（decisions.md 模块域）

（decisions.md 解析出 6 条当前版本决策，均未填写模块域——声明域为空）

## Delta（做了什么）

### 交付文件 × 模块归属

| 交付文件 | 模块归属 |
|---|---|
| .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md | —（无 module-map） |
| .sillyspec/docs/sillyspec/modules/core-engine.changelog.md | —（无 module-map） |
| .sillyspec/docs/sillyspec/modules/runtime.changelog.md | —（无 module-map） |
| .sillyspec/docs/sillyspec/modules/worktree.changelog.md | —（无 module-map） |
| docs/sillyspec/platform-interface-map.md | —（无 module-map） |
| src/cross-repo-reconcile.js | —（无 module-map） |
| src/friction-tally.js | —（无 module-map） |
| src/index.js | —（无 module-map） |
| src/run/code-face-key.js | —（无 module-map） |
| src/run/gates.js | —（无 module-map） |
| src/run/green-cache.js | —（无 module-map） |
| src/run/verify-quality-scan.js | —（无 module-map） |
| src/test-bindings.js | —（无 module-map） |
| src/verify-postcheck.js | —（无 module-map） |
| src/wt-commit.js | —（无 module-map） |
| test/code-face-key-doc-commit-survival.test.mjs | —（无 module-map） |
| test/cross-repo-reconcile-baseline-anchor.test.mjs | —（无 module-map） |
| test/gates-snapshot-fallback-visibility.test.mjs | —（无 module-map） |
| test/gates-verify-cheap-gates-first.test.mjs | —（无 module-map） |
| test/test-bindings-crossrepo-row-resolution.test.mjs | —（无 module-map） |
| test/verify-quality-scan-reuse-actual-scope.test.mjs | —（无 module-map） |
| test/verify-test-result-reuse-observability.test.mjs | —（无 module-map） |
| test/wt-commit-crossrepo-infer.test.mjs | —（无 module-map） |

- 对账基线：status=undeclared / form=post-apply / sources=main:status-porcelain(untracked-all)、apply-pathspec
- missing（声明未落盘）：无
- undeclared（落盘未声明，2 项）：src/run/gate-snapshot.js；src/verify-probes.js

### 决策清单（id × 模块域）

| 决策 | 模块域 |
|---|---|
| D-001@v1 | （未填写） |
| D-002@v1 | （未填写） |
| D-003@v1 | （未填写） |
| D-004@v1 | （未填写） |
| D-005@v1 | （未填写） |
| D-006@v1 | （未填写） |

### 探针 metrics 摘要（验证结论表的机器半边）

快照时刻：2026-10-09T12:18:12.753Z
- probe1：matches=43 / skippedFiles=0 / worktreeHits=0 / globEntries=0
- probe3：tasks=9 / hasTest=9
- probe5：backendEndpoints=3 / frontendCalls=0
- probe6：deletions=0 / unavailable=false
- probe8：mispairs=0 / feOnly=0 / missingNotNull=0 / contractCount=0 / contractOrphans=0 / missingRequired=0 / feKeys=0 / backendFields=0
- probe9：javaFileCount=0 / groupCount=0 / inconsistentGroups=0
- probe10：checkedFiles=10 / unclearedFiles=0

## After（建议动作）

### 模块卡同步状态（module-impact.md「更新结果」）

（引自变更目录 module-impact.md，人工维护为准）

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/cli-entry.md` | 更新cli-entry模块卡（本次变更涉及） | done |
| `modules/core-engine.md` | 更新core-engine模块卡（本次变更涉及） | done |
| `modules/runtime.md` | 更新runtime模块卡（本次变更涉及） | done |
| `modules/worktree.md` | 更新worktree模块卡（本次变更涉及） | done |
| `_module-map.yaml` | <!--TODO: 有未匹配文件，判定模块索引是否需增改（modules rebuild）--> | done |

规则：execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。

### scan 刷新建议

- （无 module-map：docs/project/modules/_module-map.yaml 不存在——受影响模块无法推导，建议先跑 sillyspec modules 同步补索引）
- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：.sillyspec/docs/sillyspec/modules/cli-entry.changelog.md、.sillyspec/docs/sillyspec/modules/core-engine.changelog.md、.sillyspec/docs/sillyspec/modules/runtime.changelog.md、.sillyspec/docs/sillyspec/modules/worktree.changelog.md、docs/sillyspec/platform-interface-map.md、src/cross-repo-reconcile.js、src/friction-tally.js、src/index.js、src/run/code-face-key.js、src/run/gates.js、src/run/green-cache.js、src/run/verify-quality-scan.js、src/test-bindings.js、src/verify-postcheck.js、src/wt-commit.js、test/code-face-key-doc-commit-survival.test.mjs、test/cross-repo-reconcile-baseline-anchor.test.mjs、test/gates-snapshot-fallback-visibility.test.mjs、test/gates-verify-cheap-gates-first.test.mjs、test/test-bindings-crossrepo-row-resolution.test.mjs、test/verify-quality-scan-reuse-actual-scope.test.mjs、test/verify-test-result-reuse-observability.test.mjs、test/wt-commit-crossrepo-infer.test.mjs、src/run/gate-snapshot.js、src/verify-probes.js

### 端点基线提示

- 无基线（变更未拍 baseline）：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\endpoint-baselines\2026-10-09-verify-reuse-friction.json 不存在或不可解析——端点增删不可比（backendEndpoints=3（>0））
