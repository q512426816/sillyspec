---
id: task-08
title: strategy.test.mjs dispatch unit tests
title_zh: 派发策略单测 strategy.test.mjs
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-02, task-06]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: []
allowed_paths:
  - test/dispatch/strategy.test.mjs
goal: >
  新建 test/dispatch/strategy.test.mjs 覆盖 probe 策略 fallback 与 kill lease 单测，
  mock MCP 客户端与 daemon 隔离外部依赖
implementation:
  - 新建 test/dispatch 目录与 strategy.test.mjs 文件
  - mock task-05 SillyHubMcpClient 与 daemon 连通性
  - 测 probe available 为 true 与 false 两分支的指令生成
  - 测路径A stub 检测降级与 per-worker fallback Local
  - 测 kill lease 防双写与负面缓存命中
acceptance:
  - probe 两分支指令 backend 字段正确
  - 路径A 未支持时降级提示触发且 fallback Local
  - mock 不命中真实 daemon 或网络
verify:
  - npm test
constraints:
  - 仅读 src/dispatch 源不修改被测源
  - mock 隔离 MCP HTTP 与 daemon 不做真实网络调用
  - 测试与现有 run-tests 套件兼容
---
