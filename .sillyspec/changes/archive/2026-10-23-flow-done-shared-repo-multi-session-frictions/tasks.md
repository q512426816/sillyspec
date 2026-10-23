---
author: flow-machine-draft
created_at: 2026-10-23T15:19:42.030Z
---
# 任务注册表（Tasks）— 2026-10-23-flow-done-shared-repo-multi-session-frictions

- [x] task-01: 归档面 staged（A/R）但 HEAD 树无本变更 archive 路径时，提示走 stderr 🚨 并附幂等命令与不执行后果；已落库时走 stdout 语义不变
- [x] task-02: archiveLandedInHeadTree 纯函数三态有测试锚（落地/未落地/-changeName 后缀兼容形态）
- [x] task-03: 既有 archive-commit-suggest-race 套件绿；doc-ref-check 行号引用绿
