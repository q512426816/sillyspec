---
id: task-02
title: strategy.js dispatch instruction renderer
title_zh: 派发策略生成 strategy.js
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-01]
blocks: [task-06, task-07]
requirement_ids: [FR-03]
decision_ids: [D-007@v1]
allowed_paths:
  - src/dispatch/strategy.js
provides:
  - contract: renderDispatchInstruction
    fields: [instruction, backend]
expects_from:
  task-01:
    - contract: probeSillyHub
      needs: [available]
goal: >
  新建 src/dispatch/strategy.js 的 renderDispatchInstruction，依据 probe 结果与 DispatchContract
  选择后端并生成注入 execute prompt 的派发指令文本供 agent 执行
implementation:
  - 新建 src/dispatch/strategy.js 文件
  - 定义 DispatchContract 输入含 brief worktreePath branch allowedPaths modelHint
  - probe available 为 true 拼 SillyHub 后端指令否则拼 Local 指令
  - 指令文本含用哪个后端调什么 tool 传什么参数怎么轮询与回收
  - 始终附加 Local 兜底指令保证可回退
acceptance:
  - probe available 为 true 时指令 backend 标记为 sillyhub
  - probe available 为 false 时指令 backend 标记为 local 且与现状行为一致
  - 指令含轮询间隔与 kill lease 防双写约定
verify:
  - npm test
constraints:
  - dispatcher 非执行体只生成指令不调任何 tool
  - 指令必须明确单后端避免 agent 误执行
  - allowedPaths 不物化到 SillyHub 仅写入指令供 SillySpec 侧校验
---
