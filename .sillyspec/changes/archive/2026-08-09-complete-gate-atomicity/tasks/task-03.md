---
id: task-03
title: complete.js:720-725 continueStep 完成分支 persist _write 移到 completeStageGates 成功之后（覆盖：FR-01）
title_zh: continueStep persist 移后
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: []
blocks: [task-05]
requirement_ids: [FR-01]
allowed_paths:
  - src/run/complete.js
goal: >
  complete.js continueStep 完成分支（:720-725）的 persist completed（pm._write）从 gate 前移到 completeStageGates 成功返回之后。原无 triggerSync，只移 _write、不加 sync（行为不变）。
implementation:
  - :720-721 stageData.status='completed' + completedAt 内存赋值保留。
  - 删 :722 pm._write（移到 gate 后）。
  - :725 completeStageGates 调用保留；:726 if (_stageGatesResult) return 保留。
  - gate 成功后（:726 return 之后、:727 console.log 之前）加 pm._write(cwd, progress, changeName)。
acceptance:
  - complete.js:720-725 段 persist _write 在 completeStageGates 成功返回之后。
  - stageData.status='completed' 内存保留。
  - 不新增 triggerSync（原无，行为不变）。
  - node --check 通过；npm test 不回归。
verify:
  - node --check src/run/complete.js
  - npm test
constraints:
  - 只改 :720-725 段（continueStep 完成分支）；不动 :262-278（task-01 completeStep，同文件顺序执行避免冲突）。
  - 原无 triggerSync，只移 _write。
---
