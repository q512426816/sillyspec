---
id: task-05
title: client.js SillyHub MCP client
title_zh: SillyHub MCP 客户端 client.js
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: []
blocks: [task-01, task-04]
requirement_ids: [FR-01, FR-05]
decision_ids: []
allowed_paths:
  - src/sillyhub-mcp/client.js
provides:
  - contract: SillyHubMcpClient
    fields: [probeDaemon, createMission, dispatchWorker, listWorkers, killLease]
goal: >
  新建 src/sillyhub-mcp/client.js 封装 SillyHub MCP streamable HTTP 连接，
  暴露 probeDaemon createMission dispatchWorker listWorkers killLease 方法
implementation:
  - 新建 src/sillyhub-mcp 目录与 client.js 文件
  - 实现 Bearer token HTTP 客户端端点带尾斜杠协议 2025-11-25
  - 从 SILLYHUB_MCP_URL 与 TOKEN 读配置缺省返回 unavailable
  - probeDaemon 调 list_agent_profiles 验连通与 token 有效
  - 封装 createMission dispatchWorker listWorkers killLease 方法
acceptance:
  - 缺省配置时 probeDaemon 返回 false 不阻塞调用方
  - 配置齐全且 daemon 可达时 probeDaemon 返回 true
  - killLease 调用后 worker lease 终止防双写
verify:
  - npm test
constraints:
  - converge_mission 不封装不调用
  - worktree_path 仅作 dispatch_worker 入参不持久化为 DB 新列
  - HTTP 错误保守返回 unavailable 不抛穿到 execute
---
