---
author: qinyi
created_at: 2026-09-10T13:44:38+0800
---

# proposal：review-dispatch——tier=independent 独立审查的平台派发命令

## 问题
PI agent 等宿主无 Agent tool 且不支持 MCP，tier=independent 硬要求独立审查子代理时只能降级自审（独立性折损）。平台侧有现成派发能力（daemon + worker + read_only），CLI 已是 MCP 客户端，但缺少把「独立审查」派给平台的命令通道。

## 方案（D-001~D-003，用户 2026-09-10 拍板）
CLI 直发（`sillyspec review-dispatch`）：probe 三层前置 → create_mission(external) → dispatch_worker(read_only) → 异步返回；`--status` 轮询 + 停滞检测（queued 不计时、不自动 kill）；`--kill` 显式处置；artifacts 回收经 CLI 校验落既有 stage-reviews 路径（reviewer.channel=platform 落款）；三 stage 审查清单单源化。

## 不在范围内（Non-Goals）
- execute 阶段 task 派发改造（dispatch/ 抽象层不动，D-007 仅此例外）
- mission 自动重试 / 自动 kill（处置权在人）
- 平台侧协议改动（P3 dispatch_reviewer 专用工具另行提案）
- 跨仓变更的平台派发（只审主仓文档）

## 价值
platform 通道从「配置存在但永不落地」变为真实可用：PI 环境获得最强独立性审查（独立进程/会话/可跨模型）；有 Agent 宿主也可经 channel_priority 主动选用。
