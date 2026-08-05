---
id: task-08
title: complete.js outputStep 后底部 advanced 行
title_zh: execute --done 推进后输出末尾打印 advanced 锚定行
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-06]
decision_ids: []
allowed_paths:
  - src/run/complete.js
  - test/run-complete-step.test.mjs
---

## goal
complete.js 单步推进分支（452-473）outputStep 调用后追加底部 `🚀 advanced to step N/M: <name>` 锚定行，让 tail 截断也能看到推进位置。

## implementation
- 单步推进分支：complete.js:470-472 `if (printNext) { await outputStep(...) }` 块内，outputStep 调用**之后**、473 行 `return` **之前**追加：
  `console.log(`\n🚀 advanced to step ${nextPendingIdx+1}/${steps.length}: ${defSteps[nextPendingIdx].name}`)`
- 放 outputStep 之后（输出末尾，tail 可见）；nextPendingIdx 来自 306 行 findIndex，steps.length 已用于 464 行 ✅ 打印。
- defSteps[nextPendingIdx] 存在性防御（参照 prompt.js:174-179 越界降级先例，平台模式 buildPlanSteps 长度漂移）。
- 阶段完成分支（308-449）不动：385 行已有 `✅ ${stageName} 阶段已完成`，不重复。

## acceptance
- execute --done 单步推进后输出末尾含 `🚀 advanced to step N/M: <name>`；`tail -n 5` 可见。
- 阶段完成分支输出不受影响（仍打 ✅ 阶段已完成 N/N）。

## verify
- node test/run-complete-step.test.mjs（新增 advanced 行断言）。
- 注：test 目录无此确切文件名，实际为 run-complete-step-<stage>.test.mjs（plan/quick/brainstorm/verify/archive 等），增断言时挑其一或新建此文件。
- npm test + npm run lint。

## constraints
- 仅改单步推进分支；阶段完成分支不改。
- machine-interface --json 不污染：advanced 行在非 json 路径，--json 模式走独立输出不进此 console.log。

## related_tests
- test/run-complete-step-*.test.mjs（本 task 增 advanced 行断言）
