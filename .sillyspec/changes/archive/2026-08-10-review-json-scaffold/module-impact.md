---
author: qinyi
created_at: 2026-08-10 12:45:00
---

# 模块影响分析（module-impact）

## 三重交叉验证

| 来源 | 文件 |
|---|---|
| 声明范围（design §6 文件变更清单） | src/stage-review.js / src/index.js / test/stage-review-register.test.mjs |
| 任务范围（plan.md tasks + tasks/task-NN.md allowed_paths） | task-01 src/stage-review.js / task-02 src/index.js / task-03 test/stage-review-register.test.mjs / task-04 src/index.js（验证入口） |
| 真实变更（git diff HEAD~1..HEAD = commit b5844c9） | src/stage-review.js / src/index.js / test/stage-review-register.test.mjs |

**三者完全对齐**（声明 = 任务 = 真实，3 文件）。注：`git diff HEAD~1`（到工作区）会被并发 session 2026-08-10-worktree-apply-dirty-resilient 的 staged 文件污染，本分析以 commit b5844c9（HEAD~1..HEAD）为准，排除并发 session 文件。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|---|---|---|---|---|
| runtime | 新增（导出函数） | src/stage-review.js | 新增 `registerStageReview()` 导出函数（stage 级 review.json 确定性 writer，复用 computeDocHash/generateStageReviewRunId/stageReviewMarkerPath/validateStageReviewSchema/verifyStageReviewDocHash + 常量）；fs import 加 writeFileSync，加 resolveRuntimeRoot import。不改现有任何导出函数。 | false |
| cli-entry | 新增（命令分支） | src/index.js | 新增 `case 'register-stage-review'`（镜像 backfill-reviews）+ topCommands 数组补登 + 帮助文案补登。不改其他 case。 | false |
| runtime（测试） | 新增（测试） | test/stage-review-register.test.mjs | 11 用例覆盖 registerStageReview 全分支（骨架/adopt/marker/stage 映射/错误分支），原生 node:test + tmpdir fixture。 | false |

## 未匹配文件

无。3 文件均匹配到模块（runtime + cli-entry；test 归 runtime 测试域）。

## 影响类型说明

全部为**新增**（纯新增导出函数 + CLI 命令分支 + 测试），无逻辑变更/数据结构变更/接口变更/调用关系变更/配置变更。不改 review.json schema（v1）、不改 DB、不改 marker 格式、不改任何现有导出函数签名。

## needs_review 判定

全 false：本变更新增内容明确（registerStageReview + CLI case + 测试），无不确定影响。worktree 模块 needs_review=true（_module-map 既有标记，git-helper.js 待补录），但本变更不触 worktree 模块。
