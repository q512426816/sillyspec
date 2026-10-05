---
author: flow-machine-draft
created_at: 2026-10-05T06:35:42.024Z
---
# 决策记录（Decisions）— 2026-10-05-uivisual-word-narrow

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：误漏——真 UI 变更的 input 恰好只含「渲染/组件/样式」而无其他信号且文件面无前端扩展名（如纯设计讨论期）。缓解：flow start 须知本就是 advisory 非门禁（漏渲染只少一段提示），且 detectUiTouchInPaths 扩展名兜底覆盖绝大多数真 UI 交付；探针 12 的 error 档（降级无裁决）不依赖词表触发条件的变化。 试过放弃：① 双信号分层（input 命中 ∧ 文件面/多词佐证）——纯文案改版真 UI 变更会漏，且把简单启发式复杂化；② 全词表保留+对 CLI 仓加白名单——按仓配置引入 per-repo 维护面，与「仓中立」模块承诺冲突。
