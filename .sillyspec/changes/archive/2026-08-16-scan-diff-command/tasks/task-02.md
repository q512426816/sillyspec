---
id: task-02
title: scan diff wiring
title_zh: 接线 scan diff 子命令
author: qinyi
created_at: 2026-08-16 21:15:00
priority: high
depends_on: [task-01]
blocks: [task-03, task-04]
allowed_paths:
  - src/index.js
  - src/run/command.js
goal: index.js case 'scan' 拦截 diff 子命令（跳过 pull）+ command.js --diff flag
implementation: |
  src/index.js case 'scan'（793 行起）：filteredArgs[1]==='diff' 时拦截转发 scan-diff，
  跳过 triggerPullActiveChange（纯只读不触发网络 pull）；
  src/run/command.js scan 参数表（149 行起）补 --diff 布尔 flag，供 `sillyspec run scan --diff` 等价路径。
  先例：worktree/dispatch/platform 子命令拦截方式。
acceptance:
  - `sillyspec scan diff` 走 index.js 拦截（非 command.js 裸 token 静默吞）
  - diff 分支不触发 triggerPullActiveChange
  - `sillyspec run scan --diff` 等价可用
verify: 实跑 `sillyspec scan diff` 与 `run scan --diff` 冒烟 + 单测（task-03）
constraints: D-001@v1——接线唯一入口 index.js；command.js 只补 flag 不做裸 token 解析
---

