---
id: task-02
title: review gate 阻断文案加期望路径 + runId（建议 3）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: []
blocks: [task-03]
allowed_paths:
  - src/task-review.js
  - src/run.js
---
> 三处阻断文案追加期望 review.json 绝对路径 + runId，让 agent 知道往哪写（D-005）。

## implementation
- src/task-review.js:182 主阻断 `"{taskId}: 缺少 review.json — task 未经过评审"` → 追加期望路径 `<runtimeRoot>/execute-runs/<runId>/tasks/<taskId>/review.json` + runId
- src/task-review.js:461 `printReviewResult` 提示同步追加期望路径 + runId
- src/run.js:3329-3333 补充提示同步追加期望路径 + runId
- 期望路径来源：run.js:3297 `runtimeRoot` + run.js:1834 `EXECUTE_RUN_ID` 标记

## acceptance
- task-review.js:182 文案含 review.json 绝对路径 + runId
- task-review.js:461 + run.js:3329 文案同
- 路径用 runtimeRoot（平台模式指向 specDir），非硬编码 .sillyspec/

## verify
- 构造缺少 review.json 的 task，跑 review gate，断言输出含期望路径 + runId
- `npm test`（含新测试 task-03）

## constraints
- 纯文案追加，不改 review gate 放行标准（仍要求 review.json 落盘）
- 不改控制流，不改 sillyspec.db
- 中文文案（CONVENTIONS）
