---
id: task-09
title: execute dispatch integration test
title_zh: execute 派发集成测试
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-07]
blocks: []
requirement_ids: [FR-02, FR-04]
decision_ids: [D-005@v1]
allowed_paths:
  - test/dispatch/execute-dispatch-integration.test.mjs
goal: >
  新建 execute 派发集成测试覆盖 Local 与 SillyHub 两路径，
  验证无 MCP 配置时 execute 行为零回归
implementation:
  - 新建 test/dispatch/execute-dispatch-integration.test.mjs 文件
  - 构造 Local 后端场景断言 buildWavePrompt 输出与现状等价
  - 构造 SillyHub 后端场景 mock probe available 为 true 验证派发指令注入
  - 断言一 Wave 一 mission 与 kill lease fallback 路径
  - 复用 execute-run fixture 与 spec-dir 隔离模式
acceptance:
  - 无 MCP 配置时 execute 输出与现状完全一致零回归
  - SillyHub 路径 prompt 含 mission 与 dispatch 指令
  - 测试不依赖真实 daemon 或网络
verify:
  - npm test
constraints:
  - mock daemon 与 MCP 客户端不做真实调用
  - 用 spec-dir 隔离避免撞文件锁 flaky
  - 不修改被测源 src/stages/execute.js
---
