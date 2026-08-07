---
id: task-13
title: SillyHub path-A stub contract declaration
title_zh: SillyHub 路径A stub 契约声明
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P1
depends_on: [task-04]
blocks: []
requirement_ids: [FR-06, FR-07]
decision_ids: [D-003@v2]
allowed_paths:
  - docs/sillyspec/sillyhub-path-a-contract.md
goal: >
  新建 sillyhub-path-a-contract.md 声明 SillyHub 路径A 三处期望与 daemon root_path 约束，
  供 multi-agent-platform 仓库独立变更对齐
implementation:
  - 新建 sillyhub-path-a-contract.md 于变更目录
  - 写明 dispatch_worker 增 worktree_path branch worker_prompt 可选参数
  - 写明 execution.py 检测 caller worktree 跳自建与 render_worker_prompt 不 commit
  - 写明 daemon ws.root_path 必须 ≥ SillySpec 主仓根约束
  - 标注路径A 未落地时 SillyHubMcpBackend stub fallback 行为
acceptance:
  - 文档含路径A 三处期望与 daemon root_path 约束
  - 与 task-04 stub 检测逻辑一致
verify:
  - npm test
constraints:
  - 只声明契约期望不实现 SillyHub 侧代码
  - 跨仓 multi-agent-platform 仓库独立变更本变更不碰
  - 纯文档改动不触及 src 与 test
---
