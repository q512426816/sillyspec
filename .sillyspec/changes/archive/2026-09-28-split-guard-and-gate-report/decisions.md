---
author: flow-machine-draft
created_at: 2026-09-28T08:26:59.711Z
---
# 决策记录（Decisions）— 2026-09-28-split-guard-and-gate-report

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：谓词词表漏词导致该拆的不拆（标准粒度变粗）——保守方向（不拆优于误拆，误拆需人工重写 FR，不拆只是粒度粗），词表可增量扩。放弃方案：取消斜杠拆分（推翻 2026-09-25 刻意决策且有测试锁定——评审否决）；全仓 env 白名单清洗（Windows 砍系统变量风险，归 P1 变更处理）。
