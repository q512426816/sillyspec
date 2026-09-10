---
author: qinyi
created_at: 2026-09-10T13:34:27+0800
---

# 决策记录

## D-001@1 平台审查派发的执行体：CLI 直发 vs 纯 prompt 注入
- type: architecture
- source: user
- question: 平台通道的派发执行体选谁——CLI 进程直发（SillyHubMcpClient 调 MCP tool），还是只在 prompt 注入指令让有宿主 MCP 的 agent 自己派？
- answer: **CLI 直发**。理由：PI 等宿主无 Agent tool 且不支持 MCP，纯 prompt 注入对 PI 无解；CLI 直发只依赖「能跑 sillyspec 命令」。D-007「dispatcher 不是执行体」记为例外（单 worker 一次性任务，无 execute 派发的多 worker/lease 复杂度；probe 本就直连）。
- evidence: 2026-09-10 对话——用户对「P2 的 CLI 直发路线认不认」回复「干」。

## D-002@1 等待形态：同步轮询阻塞 vs 异步创建+独立查询
- type: architecture
- source: user
- question: review-dispatch 创建 mission 后如何等待 worker 终态？
- answer: **异步**：创建即返回（missionId + 指引），等待拆 `review-dispatch --status`。理由：CLI 是 agent 调起的短进程，单次调用内阻塞轮询会挂死宿主工具调用；execute 派发同款形态。
- evidence: 2026-09-10 对话——用户否定「轮询 budget 默认 10 分钟」方案后共同收敛。

## D-003@1 卡死判定：墙钟超时自动 kill vs 进展停滞检测人工处置
- type: architecture
- source: user
- question: worker 长时间未终态怎么判定卡死？
- answer: **停滞检测 + 人工处置**：总时长默认无上限（`review_dispatch.timeout_ms` 可配，0=永不）；`--status` 看状态迁移/进度心跳，`review_stall_ms`（默认 15 分钟）零变化提示疑似停滞；**queued 不计时**（排队慢是正常形态，用户明确「有的可能就是比较慢」）；不自动 kill，`--kill` 显式处置。误 kill 在跑审查的代价 > 多等。
- evidence: 2026-09-10 对话——用户：「这个不太认同，有的可能就是比较慢得」。
