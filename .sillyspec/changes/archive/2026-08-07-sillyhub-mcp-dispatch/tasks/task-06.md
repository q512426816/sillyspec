---
id: task-06
title: dispatch CLI subcommand in index.js
title_zh: dispatch CLI 子命令
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-01, task-02]
blocks: [task-07]
requirement_ids: [FR-03]
decision_ids: [D-007@v1]
allowed_paths:
  - src/index.js
provides:
  - contract: DispatchCli
    fields: [probeSubcommand, hintSubcommand]
expects_from:
  task-01:
    - contract: probeSillyHub
      needs: [available]
  task-02:
    - contract: renderDispatchInstruction
      needs: [instruction]
goal: >
  在 src/index.js 新增 dispatch 子命令含 probe 与 hint 两子项，
  作为 agent 调用桥暴露能力探测与派发策略生成
implementation:
  - 在 index.js 的 switch command 增加 case dispatch 分支
  - dispatch probe 调 task-01 probeSillyHub 输出 available 与 reason
  - dispatch hint 读 --contract 参数调 task-02 renderDispatchInstruction 输出指令
  - 复用 worktree 子命令的参数解析与错误处理模式
acceptance:
  - sillyspec dispatch probe 输出 JSON 形式的 ProbeResult
  - sillyspec dispatch hint 指定 contract 后输出派发指令文本
  - 无 MCP 配置时 probe 返回 available 为 false 不报错
verify:
  - npm test
constraints:
  - CLI 一律主仓库根跑永不 cd worktree
  - 子命令仅渲染与探测不执行任何 tool 调用
  - 路径与换行兼容 Windows Linux macOS
---
