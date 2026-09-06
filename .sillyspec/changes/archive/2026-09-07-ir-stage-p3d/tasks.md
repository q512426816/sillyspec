---
author: qinyi
created_at: 2026-09-07T06:40:00+08:00
---

# 任务清单（Tasks）

- [x] task-01: src/archive-delta.js 聚合器（collectDeltaSources/buildDeltaReport + deriveActualModules 复用）
- [x] task-02: index.js delta 命令 case（--change/--spec-dir/--json）+ complete-handlers.js 归档自动生成 (depends_on: task-01)
- [x] task-03: 测试套件 test/archive-delta.test.mjs（四源/降级/兜底/归属/幂等/归档集成）(depends_on: task-01,task-02)
