---
id: task-04
title: sillyhub-mcp.js SillyHub backend template
title_zh: SillyHub 后端指令模板 sillyhub-mcp.js
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-05]
blocks: [task-13]
requirement_ids: [FR-02, FR-06]
decision_ids: [D-003@v2]
allowed_paths:
  - src/dispatch/backends/sillyhub-mcp.js
provides:
  - contract: SillyHubInstruction
    fields: [instructionText, pathAStubDetect, recycleRule]
expects_from:
  task-05:
    - contract: SillyHubMcpClient
      needs: [dispatchWorker, listWorkers, killLease]
goal: >
  新建 src/dispatch/backends/sillyhub-mcp.js 提供 SillyHub 后端派发指令模板含路径A stub 检测，
  dispatch_worker 不支持 worktree_path 时降级提示并回退 Local
implementation:
  - 新建 src/dispatch/backends/sillyhub-mcp.js 文件
  - 生成调 create_mission 与 dispatch_worker 的指令含 worktree_path 与 branch 参数
  - 检测路径A 三处期望未落地时标记 stub 并降级
  - 写明 agent 轮询 list_workers 与超时 kill lease 的约定
  - 写明 worker 不 git commit 改动留工作区交 SillySpec diff 的回收约定
acceptance:
  - 路径A 支持时指令含 worktree_path branch model 等参数
  - 路径A 未支持时输出降级提示并回退 Local 指令
  - 指令含 kill lease 防双写与轮询超时约定
verify:
  - npm test
constraints:
  - converge_mission 不在指令中出现 SillySpec 自己 apply
  - 不直接调 client 只生成指令由 agent 执行
  - 路径A 检测保守不支持即回退不硬试
---
