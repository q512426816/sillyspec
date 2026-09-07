---
author: qinyi
created_at: 2026-09-07T08:30:00+08:00
---

# 任务清单（Tasks）

- [x] task-01: src/endpoint-baseline.js（capture 复用 scanBackendEndpoints + diff 归一）
- [x] task-02: endpoints baseline CLI（worktree 主仓锚定）+ execute Step3 指引 (depends_on: task-01)
- [x] task-03: archive-delta 第五源（采集+After 端点增删节+降级门控）+ 既有 test/archive-delta.test.mjs:296-298 旧提示断言更新至降级口径 (depends_on: task-01)
- [x] task-04: 测试套件 test/endpoint-baseline.test.mjs (depends_on: task-01,task-02,task-03)
