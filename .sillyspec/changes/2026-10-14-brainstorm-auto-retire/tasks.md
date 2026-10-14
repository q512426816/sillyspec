---
author: flow-machine-draft
created_at: 2026-10-14T03:08:20.159Z
---
# 任务注册表（Tasks）— 2026-10-14-brainstorm-auto-retire

- [x] task-01: src/stages/brainstorm-auto.js 删除；run auto 在 brainstorm 阶段种/推进主模式 8 步表（通用 ensureStageSteps 路径）
- [x] task-02: 存量 4 步 auto 表（首名「进度确认与上下文加载」）变更：run brainstorm/run auto 触达时明确报错退役指引（--reset 重种主模式表或 doctor），不静默重种清零进度
- [x] task-03: 测试清理：删 brainstorm-auto-skeleton/brainstorm-auto-step2-conditional-wait/auto-dualtrack-brainstorm 三个测试文件；decisions-header-backfill 与 proto-reuse-register 中的 auto 引用摘除后全绿
- [x] task-04: docs/prompt 同步：删 brainstorm-auto.md，_extract.mjs 变体块/README 表行与注记/_TEMPLATE 静态清单/_build-site 注册摘除，_extracted.json 与 index.html 再生成
- [x] task-05: 新增退役拒绝与 auto 回退主模式表的测试；npm test 全绿、lint 绿、docs gate 过
