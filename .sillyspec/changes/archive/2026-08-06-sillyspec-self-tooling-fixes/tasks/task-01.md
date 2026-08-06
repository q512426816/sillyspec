---
id: task-01
title: execute Stage Review marker 自生（坑1）
title_zh: execute Stage Review marker 自生（坑1）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P0
depends_on: []
blocks: [task-06, task-07]
requirement_ids: [FR-01]
decision_ids: [D-01@v1]
allowed_paths:
  - src/run/gates.js
  - test/stage-review-marker-auto.test.mjs
goal: |
  execute 批量完成（detectExecuteBatchFinish, complete.js:540-568）跳过 prompt 渲染，
  导致 stage review marker 不写盘时，stage review gate（gates.js:276）兜底自生 review-
  前缀 ID 并写 marker，使 gate 失败错误路径从 execute-null/review.json 变
  execute-review-<id>/review.json（路径确定、agent 可执行补盘）。
implementation: |
  - src/run/gates.js:276 附近 stage review gate（tier !== 'self' 分支）插入 marker 缺失自生：
    let reviewRunId = getLatestStageReviewRunId(runtimeRoot, stageName, changeName)
    if (!reviewRunId) {
      reviewRunId = generateStageReviewRunId()
      try {
        mkdirSync(runtimeRoot, { recursive: true })
        writeFileSync(stageReviewMarkerPath(runtimeRoot, stageName, changeName), reviewRunId + '\n')
      } catch {}
    }
  - 新增 import { generateStageReviewRunId, stageReviewMarkerPath } from '../stage-review.js'
    （getLatestStageReviewRunId 已 import :258；generateStageReviewRunId :233 / stageReviewMarkerPath
    :250 已 export，同源复用）。
  - 新增 test/stage-review-marker-auto.test.mjs：构造 marker 缺失场景触发 gate，断言
    marker 文件落盘 + 内容以 review- 开头 + gate 错误路径含 execute-review-<id>（非 execute-null）。
acceptance: |
  - marker 缺失 → gate 自生 review- 前缀 ID 并写盘（marker 文件存在 + 内容以 review- 开头）。
  - marker 已存在 → 不重写（幂等，走原 getLatestStageReviewRunId 路径）。
  - gate 错误路径变 execute-review-<id>（非 execute-null）。
  - review.json 仍缺时 gate 仍 fail-closed（marker 自生只改错误路径，不掩盖根因）。
verify: |
  node test/stage-review-marker-auto.test.mjs
constraints: |
  - marker 存在走原路径不重写（幂等）。
  - gate 仍 fail-closed（review.json 缺仍拦，错误可执行化非放行）。
  - 仅 stage review marker（current-stage-review-run-id-<stage>-<change>）自生；
    task review marker（current-execute-run-id-<change>, gates.js:315-320 fallback）不动。
  - 不改 detectExecuteBatchFinish（D-01 否决项：import classifyReviewTier 增耦合）。
---

# task-01: execute Stage Review marker 自生（坑1）

execute 批量完成撞 stage review gate 时 marker 缺失 → gate 读 null → 错误路径 execute-null
不可执行。本 task 在 gate 兜底自生 marker，把错误路径变成 execute-review-<id>（确定可补盘）。

## 依据
- design.md §5 Fix-1 / §7 Fix-1 代码片段 / FR-01 / D-01@v1
- 根因：src/run/complete.js:540-568 detectExecuteBatchFinish 批量推进跳过 prompt 渲染；
  marker 写入点在 src/run/prompt.js 渲染 {REVIEW_TIER}；gate 读 marker gates.js:276。
- 复用 src/stage-review.js:233 generateStageReviewRunId / :250 stageReviewMarkerPath（已 export）。
