---
author: flow-machine-draft
created_at: 2026-11-26T01:33:10.490Z
---
# 任务注册表（Tasks）— 2026-11-26-flow-help-flag-shortcircuit

- [x] task-01: flow 帮助旗标短路——新增形态判定、目标定位、用法行三个纯函数并在 cmdFlow 入口（平台 spec 根解析之前）接入，兜底分支复用共享详注行组
- [x] task-02: 用例先红后绿——test/flow-help-flag.test.mjs 覆盖形态矩阵、进程内零副作用、短路先于指针解析、用法与消费旗标双向相等、目标定位、兜底不变
- [x] task-03: 回归面复跑——flow-help-status、input-format-copy 与 flow 族既有套件全绿，lint 零新增
