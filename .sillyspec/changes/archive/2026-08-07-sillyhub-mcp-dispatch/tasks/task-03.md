---
id: task-03
title: local-agent.js Local backend template
title_zh: Local 后端派发指令模板 local-agent.js
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-005@v1]
allowed_paths:
  - src/dispatch/backends/local-agent.js
provides:
  - contract: LocalAgentInstruction
    fields: [instructionText, recycleRule]
goal: >
  新建 src/dispatch/backends/local-agent.js 提供 Local 后端派发指令模板与回收约定，
  保留现有本机 Agent tool 派发行为作为默认与降级路径
implementation:
  - 新建 src/dispatch/backends 目录与 local-agent.js 文件
  - 导出现有 Agent tool 启动子代理的指令文本模板
  - 写明子代理 workdir 必须设为 worktreePath 的约定
  - 写明 worker 终态后 SillySpec 对 worktree 工作区 git diff 写 review.json 的回收约定
  - 标注 Local 后端忽略 modelHint 与 agentProfileHint
acceptance:
  - 模板生成的 Local 指令与现有 buildWavePrompt 派发行为等价
  - 指令含 workdir 强制必传说明与 review.json 回收约定
verify:
  - npm test
constraints:
  - Local 后端为默认与降级路径不改现有行为
  - 不调 MCP tool 只出指令模板
  - 回收走既有 review.json 契约不变
---
