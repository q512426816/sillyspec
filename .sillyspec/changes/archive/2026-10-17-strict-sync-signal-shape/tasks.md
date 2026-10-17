---
author: flow-machine-draft
created_at: 2026-10-17T06:34:32.358Z
---
# 任务注册表（Tasks）— 2026-10-17-strict-sync-signal-shape

- [x] task-01: 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError
- [x] task-02: test/terminal-sync-strict.test.mjs 全绿（10 用例）
- [x] task-03: dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E
