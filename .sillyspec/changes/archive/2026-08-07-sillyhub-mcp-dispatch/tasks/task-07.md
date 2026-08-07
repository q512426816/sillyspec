---
id: task-07
title: execute.js dispatch integration
title_zh: execute 派发接入
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P0
depends_on: [task-02, task-06]
blocks: [task-08, task-09, task-10, task-11, task-12]
requirement_ids: [FR-04, FR-05]
decision_ids: [D-004@v1, D-006@v1, D-008@v1]
allowed_paths:
  - src/stages/execute.js
  - test/execute-prompt-spec-root-placeholder.test.mjs
  - test/execute-runs-isolation.test.mjs
  - test/run-complete-step-execute-batch.test.mjs
  - test/worktree-execute-spec-drift.test.mjs
  - test/plan-execute-contract.test.mjs
expects_from:
  task-02:
    - contract: renderDispatchInstruction
      needs: [instruction]
goal: >
  改 src/stages/execute.js buildWavePrompt 把硬编码 Agent tool 派发改为经 dispatch hint 注入派发指令，
  实现一 Wave 一 mission 映射与轮询 list_workers 加 kill lease 防双写
implementation:
  - 读取最新 execute.js HEAD 确认并行改动已落地避免冲突
  - buildWavePrompt 调 task-02 renderDispatchInstruction 注入派发指令
  - worktreePath 来自 worktree.js meta 传入 DispatchContract
  - 一 Wave 一 mission 映射 Wave 内 worker 并行 Wave 间 mission 串行
  - 加轮询 list_workers 与 per-worker 超时 kill lease fallback Local 逻辑
acceptance:
  - 无 MCP 配置时 buildWavePrompt 输出与现状一致零回归
  - 配置 MCP 时 prompt 含派发指令且一 Wave 创建一个 mission
  - worker 终态后回收走既有 review.json 与 Review Gate 不变
verify:
  - npm test
constraints:
  - 实现前确认 execute.js 并行改动已 commit 以最新 HEAD 为基线
  - 不改 review.json 契约与 worktree 生命周期与 stage-contract 门控
  - acceptance 强制 tier self 避免 read_only 粒度矛盾
related_tests:
  - path: test/execute-prompt-spec-root-placeholder.test.mjs
    reason: buildWavePrompt 输出结构变化需更新占位符断言
  - path: test/execute-runs-isolation.test.mjs
    reason: execute-run 隔离路径受派发改造影响需复跑
  - path: test/run-complete-step-execute-batch.test.mjs
    reason: execute batch 完成步骤受 buildWavePrompt 改造影响
  - path: test/worktree-execute-spec-drift.test.mjs
    reason: worktree 派发副本漂移断言受 execute 改造影响
  - path: test/plan-execute-contract.test.mjs
    reason: plan 与 execute 契约注入受派发改造影响需复跑
---
