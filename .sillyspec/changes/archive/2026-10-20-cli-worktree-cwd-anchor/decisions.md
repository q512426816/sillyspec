---
author: flow-machine-draft
created_at: 2026-10-20T02:50:39.615Z
---
# 决策记录（Decisions）— 2026-10-20-cli-worktree-cwd-anchor

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：锚定静默改变「agent 以为在 worktree 跑」的预期——缓解：警告恒输出（stderr 四行，含原 cwd 与锚定目标，agent 可见可纠偏）；逃生门整行照贴保留刻意独立实例路径。次风险：平台 daemon 在 worktree 模式下 spawn CLI 且 cwd=worktree（若存在此形态）被意外锚定——排查：wt-commit 已豁免（子代理 workdir 形态）；daemon 平台模式 specRoot 异位不经本守卫路径段。放弃的方案：①维持硬拦只加更多指引文案（生产实证指引已够清楚，痛点在来回本身）；②按 SILLYSPEC_SESSION_ID/env 锚定主仓（坑文提及的锚点族）——session env 是多会话共享值不标识仓根，路径结构锚点（mainRepoRoot）已完备，env 锚点对 worktree 场景无增益。
