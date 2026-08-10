---
id: task-10
title: src/run/shared.js triggerPull 注入
title_zh: 新增 triggerPull 时机注入与本地脏度冲突文件写入
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P1
depends_on: [task-07, task-09]
blocks: [task-15]
requirement_ids: [FR-04, FR-06]
decision_ids: [D-009]
allowed_paths:
  - src/run/shared.js
  - src/run.js
  - src/index.js
expects_from:
  task-07:
    - contract: PullResult
      needs: [ok, conflict, reason]
goal: >
  在 run/shared.js 加 triggerPull 并在 CLI 启动与关键决策点注入，复用 8s 熔断与 Best Effort。
implementation:
  - run/shared.js 新增 triggerPull 旁挂 triggerSync，复用 8s 熔断与 Best Effort
  - run.js run 与 --done 启动时调 triggerPull 拉一次
  - index.js approve 与 archive 前调 triggerPull 拉一次
  - 本地脏度比对触发冲突文件写入逻辑
acceptance:
  - run/--done 启动时 triggerPull 被调用一次
  - approve/archive 前 triggerPull 被调用一次
  - 不在每步 pull，避免高频写入
  - 未连接平台时 triggerPull 跳过不报错
verify:
  - npm test
  - npm run lint
constraints:
  - 复用现有 triggerSync 的 8s 熔断与 Best Effort
  - 不每步 pull，只在启动与关键决策点
  - 未连接平台时静默跳过与现状一致
---
