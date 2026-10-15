---
author: flow-machine-draft
created_at: 2026-10-15T13:42:22.645Z
---
# 决策记录（Decisions）— 2026-10-15-eval-adapter-permissions

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险：skip-permissions 让被测 agent 在草稿目录内有完全执行权——理论上 agent 可写 workdir 之外。缓解：评测任务是自包含小任务、workdir 每轮清空、runner 有 15 分钟超时硬帽；这是 headless 评测的行业标准取舍（不 skip 则测的是「撞权限墙的能力」不是任务能力——两轮实证）。若未来要在敏感环境跑评测，应加 `--add-dir` 白名单或容器隔离，属独立演进。 - 次风险：旗标名是 claude CLI 私有面（版本演化可能改名）。缓解：漂移保护测试在旗标失效（被 CLI 拒识）时无法直接捕获（配置断言只护 config 层）——运行时失败会以 claude 非零退出显形，届时按新版本旗标名更新。 - 死路（已走过）：`\0NN` 转义理论——见做法概述证据链，废弃。
