---
author: flow-machine-draft
created_at: 2026-10-05T11:26:13.975Z
---
# 决策记录（Decisions）— 2026-10-05-visual-downgrade-narrow

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：窗口值选错——真降级声明写法超出 6 字窗口（如「视觉层面做了大幅的收缩式降级」= 视觉+7 字+降级）会漏判；漏判方向是 fail-open（少拦一次 error），而该形态本就极小众（正例标定留了余量），且 error 档之外缺证据面仍有 gate 兜底。 试过放弃：① 语义排除（行含「探针/检测/词表」跳过）——讨论形态不可枚举，且引入语义判定制违 D-003 封闭面；② 删除 partial token——既有正例「FR-04 partial：」依赖它，伤正例。
