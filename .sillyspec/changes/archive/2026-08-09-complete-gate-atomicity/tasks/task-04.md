---
id: task-04
title: gates.js:549 completeStageGates 收尾段 :554-621 整体 try/catch（异常 rollbackCompletionAndReturn，:624 cleanup 在 try 外）（覆盖：FR-03, FR-04, FR-05）
title_zh: completeStageGates 整体 try/catch 异常兜底
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: []
blocks: [task-05]
requirement_ids: [FR-03, FR-04, FR-05]
allowed_paths:
  - src/run/gates.js
goal: >
  completeStageGates（gates.js:549）的收尾段 :554-621（execute 并发预检 + handleScanStageCompleted + validateMetadata + validateFileLocations + auxiliary 重置 + runStageCompletionGates）整体包 try/catch，任一段抛非结构化异常 → rollbackCompletionAndReturn（回滚 in-progress + _write + 返回未完成对象），不冒顶 exit 1。:624 handleExecuteWorktreeCleanup 在 try 外（cleanup 副作用独立，失败不 rollback stage 状态）。
implementation:
  - gates.js:549 completeStageGates 主体（:554-621）包 try { ... }，:616 runStageCompletionGates 失败的 early-return 是正常 return 不被 catch 拦。
  - catch (e) { console.error(阶段完成收尾异常已 rollback: e.message); return await rollbackCompletionAndReturn(pm, progress, stageData, steps, currentIdx, cwd, changeName, platformOpts) }。
  - :624 handleExecuteWorktreeCleanup 在 try/catch 外（保留原位置，cleanup 失败不 rollback）。
  - 保留 :554-582 execute 并发预检的内层 try/catch（:555/:579 外、:565/:572 内）——advisory 语义不阻断，外层 try 与之嵌套无冲突。
acceptance:
  - :554-621 段在 try 内，异常 rollbackCompletionAndReturn（不冒顶）。
  - :624 handleExecuteWorktreeCleanup 在 try 外。
  - :554-582 execute 预检内层 try/catch 保留（advisory 不阻断）。
  - auxiliary 阶段（scan）gate 成功后 _write 落盘 pending（stageData.status 内存值决定，:601-613 重置）。
  - node --check 通过；npm test 不回归。
verify:
  - node --check src/run/gates.js
  - npm test
constraints:
  - 只改 gates.js:549 completeStageGates；不动 runStageCompletionGates（:179，已被外层 try 覆盖，内部无需单独 try/catch）。
  - :624 cleanup 在 try 外（副作用独立）。
  - 保留 execute 预检内层 advisory try/catch。
---
