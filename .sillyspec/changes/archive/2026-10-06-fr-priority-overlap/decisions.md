---
author: flow-machine-draft
created_at: 2026-10-06T11:56:01.512Z
---
# 决策记录（Decisions）— 2026-10-06-fr-priority-overlap

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：优先面扩大（全量绑定文件含重叠）进一步放大执行批尺寸——与 fr-regress-cap-drop 已裁决的边界同族（TEST_TIMEOUT_MS 兜底、绑定面是知识库声明面有治理），增量只是重叠子集（本仓实测 14 个），可忽略。放弃的方案：① 在 buildDepsBatches 内部把 priorityFiles 语义改为「并集口径」——调用方语义应显式，函数不该猜调用者意图；② 去重时把 frLinked 换成 fr.files 并顺带删 added 计算——frReport 的 addedCount（新增并入 N）是既有披露口径，动了会漂移控制台文案语义。
