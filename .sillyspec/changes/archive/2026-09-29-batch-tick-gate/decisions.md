---
author: flow-machine-draft
created_at: 2026-09-29T08:42:04.727Z
---
# 决策记录（Decisions）— 2026-09-29-batch-tick-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：误拒合法场景——三层防护（镜像-only 静默、哨兵面未知降级 advisory、--allow-batch-tick 逃生门留痕）；观测旁路事件格式漂移 → detectBatchCheckCadence 解析失配按无证据静默（既有 fail-open）。弃案：逐 task 证据时刻配对（勾选拍与提交拍顺序核验）——git 提交时序与文件编辑时序不可严格配对（一提交多 token 是规范形态），误伤面大；单拍跳幅是唯一机械可靠的一把勾特征。
