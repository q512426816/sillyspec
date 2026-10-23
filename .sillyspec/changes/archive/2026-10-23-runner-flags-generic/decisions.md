---
author: flow-machine-draft
created_at: 2026-10-23T07:16:07.670Z
---
# 决策记录（Decisions）— 2026-10-23-runner-flags-generic

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：风险=消费仓误配 flags 或 deps_regress_cap 过激致本地漏测（CI 红后置）——显式配置责任在仓主，loud 披露每轮可见；放弃：按语言/框架提供专用键（py_flags/go_flags/…）= 开放世界枚举违反规约 00，弃；按框架名匹配注入（vitest/jest/pytest 各写一套）同理弃——统一走 CLI 的批类别。
