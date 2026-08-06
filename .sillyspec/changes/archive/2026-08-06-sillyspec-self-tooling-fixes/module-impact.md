# 模块影响分析（Module Impact）— SillySpec 自工具坑确定性修复

author: qinyi
created_at: 2026-08-06 10:05:00

## 变更：2026-08-06-sillyspec-self-tooling-fixes

SillySpec 自工具 4 个确定性坑修复 + 文档同步 + 回归。代码已 cherry-pick 到主仓 working tree（commit f30b702），文档同步 commit 8bb672d；npm test 118 PASS / 0 FAIL，lint 68 files 0 err，verify 7/7 PASS。

## 三重交叉验证

- **声明范围**（proposal.md / design.md）：坑1 stage review marker 自生 / 坑2 detectChangeRisk 早期 warning / 坑3 worktree-apply filterDeliverableFiles 精细化 + verify-postcheck 去双写 / 坑4 archive complete-handlers CLI 下沉 git add
- **任务范围**（plan.md / tasks.md）：task-01..04 各坑源码 + 测试；task-05 ROADMAP；task-06 文档同步；task-07 回归
- **真实变更**（`git diff --name-only HEAD`）：src/{index.js, run/gates.js, run/complete-handlers.js, stage-contract.js, verify-postcheck.js, worktree-apply.js} + 6 test/* + docs/sillyspec/file-lifecycle.md + 4 模块卡 + ROADMAP

**以 git diff 为准**：真实代码改动集中在 6 个 src/* 文件，映射到 4 个模块（runtime / worktree / cli-entry / stages），与声明、任务范围一致。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime | 逻辑变更 + 调用关系变更 | src/run/gates.js | 坑1：stage review gate marker 缺失自生。tier=independent 且 `getLatestStageReviewRunId` 返回空时，gate 自身调 `generateStageReviewRunId()` + `stageReviewMarkerPath()` 写盘 + mkdir，错误路径从 `execute-null` 变为 `execute-review-<id>` | false（runtime.md 已 task-06 同步） |
| runtime | 逻辑变更 | src/run/complete-handlers.js | 坑4：archive `unregisterChange` 后 CLI 下沉 `safeGit add -- .sillyspec/changes/archive/ + .sillyspec/docs/`，不靠 step5 prompt 驱动；safeGit 失败不阻断归档 | false（runtime.md 已 task-06 同步） |
| worktree | 逻辑变更 | src/worktree-apply.js | 坑3：`filterDeliverableFiles` 精细化过滤——保留 `.sillyspec/docs/`（模块文档纳入交付物），排除 `changes/` + `.runtime/` + `quicklog/` + `meta.json` | false（worktree.md 已 task-06 同步） |
| cli-entry | 调用关系变更 | src/index.js | 坑3：apply / assess 自动 apply 用户面消息同步 filterDeliverableFiles 新语义（docs/ 自动 apply 回主仓，changes/+.runtime/+quicklog/ 不自动 apply） | false（cli-entry.md 已 task-06 同步） |
| stages | 逻辑变更 | src/stage-contract.js | 坑2：verify `detectChangeRisk` 判定高危且 design frontmatter 未显式声明 `risk_level`（!explicit）时，在 evidence gate 前发 warning 引导显式覆盖（防否定语境误判） | false（stages.md 已 task-06 同步） |
| stages | 调用关系变更 | src/verify-postcheck.js | 坑3：改 import `filterDeliverableFiles` from worktree-apply.js，消除 verify-postcheck 与 worktree-apply 的双写漂移 | false（stages.md 已 task-06 同步） |

## 文档同步状态

4 个模块卡片（runtime.md / worktree.md / cli-entry.md / stages.md）已由 task-06 预同步，分别登记坑1/坑4、坑3、坑3 消息、坑2/坑3 import。`docs/sillyspec/file-lifecycle.md` updated_at + filterDeliverableFiles 行为变更（docs/ 纳入交付物）已同步。

## _module-map.yaml 边界判定

本次变更不改模块边界（paths / tags / entrypoints 无结构变化）：4 个受影响模块均为既有 active 模块，仅内部逻辑/调用关系变更。`_module-map.yaml` **无需修改**，仅模块卡片内容更新。

## 未匹配文件

| 文件路径 | 说明 |
|----------|------|
| docs/sillyspec/file-lifecycle.md | 文档同步（task-06），filterDeliverableFiles 行为变更登记 |
| .sillyspec/ROADMAP.md | 坑5：多代理中间态 import 链污染登记（架构级延后） |
| .sillyspec/docs/sillyspec/modules/{runtime,worktree,cli-entry,stages}.md | task-06 模块卡片同步 |
| test/archive-cli-git-add.test.mjs | 坑4 测试覆盖（CLI 下沉 git add） |
| test/stage-review-marker-auto.test.mjs | 坑1 测试覆盖（marker 自生） |
| test/stage-contract.test.mjs | 坑2 测试覆盖（detectChangeRisk warning） |
| test/worktree-apply-meta-exclude.test.mjs | 坑3 测试覆盖（filterDeliverableFiles 四态） |
| test/verify-deletion-check.test.mjs | 坑3 测试覆盖（verify-postcheck import） |
| .sillyspec/changes/2026-08-06-sillyspec-self-tooling-fixes/** | 本变更产出（proposal/design/tasks/plan/decisions/requirements） |

## 结论

4 模块受影响（runtime / worktree / cli-entry / stages），全部 needs_review=false（task-06 已预同步模块卡片 + file-lifecycle）。`_module-map.yaml` 无结构变化无需改。归档可推进至 step3 sync-module-docs 确认写入。
