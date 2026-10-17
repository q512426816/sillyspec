---
author: flow-machine-draft
created_at: 2026-10-17T06:38:47.107Z
---
# 决策记录（Decisions）— 2026-10-17-strict-sync-signal-shape

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：无——单行形状修复 + 回归钉；已放弃方案：改 raceWithAbort 传裸 AbortSignal（将破坏既有 triggerSync 内联用法 `sync(name, cwd, sig)` 的 opts 形状契约，面大不用）。
