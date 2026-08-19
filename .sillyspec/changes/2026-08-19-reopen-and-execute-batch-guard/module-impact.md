---
author: qinyi
created_at: 2026-08-19T11:40:12+08:00
---

# 模块影响分析（Module Impact）— reopen-and-execute-batch-guard

## 模块影响矩阵

依据 `_module-map.yaml`（schema v2）× design.md 文件变更清单 × plan.md 任务列表：

| 模块 | 影响类型 | 涉及文件 | 说明 |
|------|----------|----------|------|
| runtime | 修改 | src/run/complete.js | W1 stale 回填 --confirm 门控 + audit log（改动点 1）；W2 shouldAutoCheckTask ctx 守卫 + autoCheckPlanFromReviews 构造（改动点 3）+ detectExecuteBatchFinish 逐 task 复核与 blockedTasks（改动点 4） |
| progress | 修改 | src/progress/stage-machine.js | W1 completeStage 存在 stale 步骤时拒绝、--force 例外（改动点 2） |
| worktree | 修改 | src/worktree-apply.js | W3 patch 锚点默认 merge-base + 交付集合锚不变（改动点 5/6）+ 冲突列表 stderr 解析（改动点 8） |
| cli-entry | 修改 | src/index.js | W3 worktree apply 子命令解析 `--base <merge-base\|baseline>` + usage 文案（改动点 7） |
| core-engine | 间接依赖 | src/task-review.js（不改） | W2 草稿识别读其 reviewerNotes `auto-generated draft` 约定（D-002@v1）；generateTaskReviewDrafts 零 diff 跳过既有逻辑仅回归锁定 |
| docs-consistency | 文档同步 | docs/sillyspec/file-lifecycle.md | task-10：W1 步骤流转语义变化同步 |
| （自身）progress 模块文档 | 文档同步 | .sillyspec/docs/sillyspec/modules/progress.md | task-10：W1/W2 行为变化同步 |
| （自身）worktree 模块文档 | 文档同步 | .sillyspec/docs/sillyspec/modules/worktree.md | task-10：W3 锚点策略与冲突报错同步 |

## 新增测试文件（unmapped：test/ 不在 _module-map 任何模块 paths）

| 文件 | 归属 task | 说明 |
|------|-----------|------|
| test/reopen-stale-confirm.test.mjs | task-03 | FR-01/02 三场景回归 |
| test/execute-batch-zero-diff.test.mjs | task-06 | FR-03/04 全分支 + 生成层锁定 |
| test/worktree-apply-merge-base.test.mjs | task-09 | FR-05/06 回归 |

## 连带测试影响（plan review 轮识别，P2）

| 既有测试 | 风险点 | 处置 |
|----------|--------|------|
| test/progress-complete-stage.test.mjs | completeStage 新增 stale 拒绝（改动点 2）可能改变既有断言语境 | execute 阶段 npm test 后按 CLAUDE 规则 11 判定：预期行为变化则补断言，否则修逻辑 |
| test/execute-batch-endtoend-checkbox.test.mjs | shouldAutoCheckTask 加可选 ctx（向后兼容） | 回归验证 ctx 缺省行为不变断言仍绿 |
| test/worktree-apply-classification.test.mjs | applyWorktree base 缺省 merge-base（HEAD==baseHash 场景锚点等价） | 回归验证 diffBase 语义一致 |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/progress.md` | 更新 progress 模块卡（W1 completeStage stale 拒绝 + W2 批量守卫行为） | pending |
| `modules/worktree.md` | 更新 worktree 模块卡（W3 merge-base 锚点策略 + 冲突列表报错） | pending |
| `modules/runtime.md` | 更新 runtime 模块卡（W1/W2 complete.js 行为） | pending |
| `modules/cli-entry.md` | 更新 cli-entry 模块卡（--base flag 解析） | pending |
| `_module-map.yaml` | 无变化（未增删模块，paths 不变） | skipped |
