---
author: flow-machine-draft
created_at: 2026-10-21T15:07:47.079Z
---
# 任务注册表（Tasks）— 2026-10-21-deps-batch-runner-flags

- [x] task-01: verify-postcheck.js 新增导出 extractRunnerTrailingFlags（裸 flag/含等号一体/吃值 flag 连值/位置参数丢弃/段边界防御）+ hits 命中 pyRunner 追加 flag 串
- [x] task-02: test/deps-batch-runner-flags.test.mjs 直测：extractRunnerTrailingFlags 矩阵 + buildDepsBatches 集成（-n auto 保留/重定基不破/无 flag 逐字不变/jsx 不动/位置参数不混入）
- [x] task-03: 既有受影响面复跑（verify-postcheck 相关既有用例）全绿 + module 卡 core-engine 补条目
