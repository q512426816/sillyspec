---
author: flow-machine-draft
created_at: 2026-10-09T04:24:04.313Z
---
# 任务注册表（Tasks）— 2026-10-09-module-card-updated-at-iso

- [x] task-01: syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移
- [x] task-02: 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）
- [x] task-03: 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿
