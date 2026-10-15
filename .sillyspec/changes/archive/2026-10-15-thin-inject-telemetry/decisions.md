---
author: flow-machine-draft
created_at: 2026-10-15T01:23:51.262Z
---
# 决策记录（Decisions）— 2026-10-15-thin-inject-telemetry

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：遥测双写膨胀——thin start 高频重入（每次 start/resume 都落一条）可能推高事件量。评估：单条 <2KB、既有 8698 行量级下不构成问题，且「注入发生了」本就是事实记录；若未来需要去重，消费端按 (change,query,at窗口) 聚合即可，不在本变更范围。放弃的方案：①在 knowledge-stats 读数时反推 thin 命中（无法还原、纯猜测）；②给 thin 面也注入正文再记 injectedFiles（改变注入形态，超出遥测导线范围——thin 面按需 Read 是 2026-09-28-knowledge-inject-ranking 定下的口径）；③同步写 hits 改异步队列（引入落盘时序复杂度，违背 R-04 简单 fail-soft 先例）。
