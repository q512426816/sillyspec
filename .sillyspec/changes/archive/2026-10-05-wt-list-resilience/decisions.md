---
author: flow-machine-draft
created_at: 2026-10-05T11:39:43.944Z
---
# 决策记录（Decisions）— 2026-10-05-wt-list-resilience

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：changeName 兜底目录名后，若某历史注册表目录名与变更名不一致（理论上只在手工改名目录时出现），list/doctor 会按目录名匹配——但该形态下旧行为是 undefined 崩溃/失配，兜底严格更优，不构成回退面。放弃的方案：① 渲染器（index.js）侧判空——只修 CLI 一处，doctor 的 undefined 失配仍在，且 index.js 当前被并行会话在途占用（不可改）；② 写入侧强制补全历史件——要迁移已落盘 meta，读侧问题写侧修，收益错位。均已弃。
