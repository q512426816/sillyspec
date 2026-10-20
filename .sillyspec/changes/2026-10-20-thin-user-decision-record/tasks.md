---
author: flow-machine-draft
created_at: 2026-10-20T02:06:01.406Z
---
# 任务注册表（Tasks）— 2026-10-20-thin-user-decision-record

- [x] task-01: 新增 test/thin-user-decision-record.test.mjs 四用例（横幅纪律行/断点②半句/tick 条件提示/零回归锚），先跑确认红（验证：node --test 新套件 FR-01/02/03 红、④绿）
- [x] task-02: src/flow.js 落地横幅纪律行与断点②对账半句，新套件 FR-01/FR-02 用例转绿（验证：node --test test/thin-user-decision-record.test.mjs 绿）
- [x] task-03: src/task-tick.js 落地 decisions.md 存在性 gating 提示行，FR-03 用例转绿（验证：同上全绿）
- [ ] task-04: 复跑既有四套件 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 零回归（验证：node --test 四文件全绿）
