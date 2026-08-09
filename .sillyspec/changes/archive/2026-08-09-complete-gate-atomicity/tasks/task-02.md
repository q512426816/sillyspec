---
id: task-02
title: stage.js:352-357 runStage noAI 末步完成分支 persist _write 移到 completeStageGates 成功之后（覆盖：FR-01）
title_zh: runStage noAI 末步 persist 移后
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: []
blocks: [task-05]
requirement_ids: [FR-01]
allowed_paths:
  - src/run/stage.js
goal: >
  stage.js runStage noAI 末步完成分支（:352-357）的 persist completed（pm._write）从 gate 前移到 completeStageGates 成功返回之后。原无 triggerSync，只移 _write、不加 sync（行为不变）。Design Grill 标签修正：此处非 continueStep，是 runStage noAI 末步。
implementation:
  - :352-353 stageData.status='completed' + completedAt 内存赋值保留。
  - 删 :354 pm._write（移到 gate 后）。
  - :357 completeStageGates 调用保留；:358 if (_stageGatesResult) return 保留。
  - gate 成功后（:358 return 之后、:359 console.log 之前）加 pm._write(cwd, progress, changeName)。
acceptance:
  - stage.js:352-357 段 persist _write 在 completeStageGates 成功返回之后。
  - stageData.status='completed' 内存保留。
  - 不新增 triggerSync（原无，行为不变）。
  - node --check 通过；npm test 不回归。
verify:
  - node --check src/run/stage.js
  - npm test
constraints:
  - 只改 :352-357 段；不动 complete.js（task-01/03）或 gates.js（task-04）。
  - 原无 triggerSync，只移 _write（不引入新平台 sync）。
---
