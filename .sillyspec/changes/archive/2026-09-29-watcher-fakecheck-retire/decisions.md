---
author: flow-machine-draft
created_at: 2026-09-29T09:20:28.282Z
---
# 决策记录（Decisions）— 2026-09-29-watcher-fakecheck-retire

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：失去实时人判信号——收口哨兵+单拍门已覆盖同判据的终态裁决，实时层只剩噪音（合法勾选全部闪嫌疑）；历史事件流中的存量 fake-check 事件仍会被 alerts/timeline 渲染（读侧规则名无关）——属历史数据如实展示非新增噪音。弃案：降为 info 级保留——半 retire 徒增状态面。
