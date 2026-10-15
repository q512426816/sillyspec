---
author: flow-machine-draft
created_at: 2026-10-15T13:21:52.280Z
---
# 任务注册表（Tasks）— 2026-10-15-eval-b-arm-turn-budget

- [x] task-01: eval.config.json adapter.maxTurns 60 → 120（B 臂流程完成空间；A 臂不受影响——裸跑实测 16 轮内完成）
- [x] task-02: arms.B.promptTemplate 去除「小任务走 quick 模式」陈旧话术，改为与现行协议一致的表述（走 SillySpec 轻量流程 flow start→flow done）
- [x] task-03: test/eval-adapter-config.test.mjs 扩展：maxTurns=120 断言 + B 臂 prompt 不含 quick 字样断言
- [x] task-04: 变更自身测试面跑绿，lint 通过
