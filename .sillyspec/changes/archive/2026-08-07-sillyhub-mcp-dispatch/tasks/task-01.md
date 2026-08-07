---
id: task-01
title: probe.js SillyHub capability probe
title_zh: SillyHub 能力探测 probe.js
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-05]
blocks: [task-02, task-06]
requirement_ids: [FR-01, FR-07]
decision_ids: [D-005@v1]
allowed_paths:
  - src/dispatch/probe.js
provides:
  - contract: probeSillyHub
    fields: [available, reason]
expects_from:
  task-05:
    - contract: SillyHubMcpClient
      needs: [probeDaemon]
goal: >
  新建 src/dispatch/probe.js 提供 probeSillyHub 能力探测，调 client.probeDaemon 验连通，
  返回 available 与 reason，缓存负面结果并校验 worktreePath 在 daemon root_path 内
implementation:
  - 新建 src/dispatch 目录与 probe.js 文件
  - 读 SILLYHUB_MCP_URL 与 TOKEN 配置缺省返回 unavailable
  - 配置齐全时调 task-05 的 client.probeDaemon 验连通与 token
  - 实现负面结果 TTL 缓存避免抖动期反复探测
  - 校验 worktreePath 在 daemon ws.root_path 内否则标记 fallback
acceptance:
  - 无 MCP 配置时返回 available 为 false 且 reason 明确
  - daemon 可达且 token 有效时返回 available 为 true
  - 命中负面缓存时不重复发起探测
verify:
  - npm test
constraints:
  - 探测失败保守 fallback Local 不抛异常阻断 execute
  - TTL 与轮询间隔可配 local.yaml 不硬编码
  - 不直接碰 lease 只感知 daemon 连通性
---
