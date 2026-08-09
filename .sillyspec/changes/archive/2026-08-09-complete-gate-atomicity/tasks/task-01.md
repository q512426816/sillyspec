---
id: task-01
title: complete.js:262-278 completeStep 完成分支 persist completed 移到 completeStageGates 成功之后（覆盖：FR-01, FR-02）
title_zh: completeStep persist 移后（消除硬中断窗口）
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: []
blocks: [task-05]
requirement_ids: [FR-01, FR-02]
allowed_paths:
  - src/run/complete.js
goal: >
  completeStep 完成分支的 persist completed（pm._write + triggerSync）从 gate 前（:265/:266）移到 completeStageGates 成功返回之后（:279 后），消除「persist completed → gate 崩溃窗口」（硬中断落中间 DB 永久 completed 而 gate 未跑）。stageData.status='completed' 内存保留供 gate rollback。
implementation:
  - :262-264 stageData.status='completed' + completedAt + progress.lastActive 内存赋值保留（不动）。
  - 删 :265 pm._write（persist completed）+ :266 triggerSync（移到 gate 后）。
  - :269-273 user-inputs.md appendFileSync 保留 gate 前（属 #7 范围，本 task 不动）。
  - :278 completeStageGates 调用保留；:279 if (_stageGatesResult) return 保留（gate 失败 rollbackCompletionAndReturn 已 _write in-progress）。
  - gate 成功后（:279 return 之后、:281 console.log 之前）加 pm._write(cwd, progress, changeName) + triggerSync(cwd, changeName, platformOpts)。
acceptance:
  - complete.js:262-278 段 persist completed（_write+triggerSync）在 completeStageGates 成功返回之后，不在 gate 前。
  - stageData.status='completed' 内存赋值保留（gate rollback rollbackStageCompletion 依赖）。
  - user-inputs.md appendFileSync 位置不变。
  - node --check 通过；npm test 不回归。
verify:
  - node --check src/run/complete.js
  - npm test
constraints:
  - 只改 :262-278 段（completeStep 完成分支）；不动 :720-725（task-03 continueStep，同文件顺序执行避免冲突）。
  - 行为不变：gate 全过才 completed（persist 移后），gate 失败/异常 rollback in-progress。
  - triggerSync 仅本处移后（stage.js/complete.js:720-725 原无 triggerSync，task-02/03 只移 _write）。
---
