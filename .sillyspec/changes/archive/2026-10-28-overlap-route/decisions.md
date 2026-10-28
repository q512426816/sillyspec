---
author: flow-machine-draft
created_at: 2026-10-28T06:27:51.151Z
---
# 决策记录（Decisions）— 2026-10-28-overlap-route

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险是声明源噪声：未归档旧变更的陈旧 design 声明会喂活假重叠（既有坑 baseline-overlay-cross-change-contamination 同源现象）——advisory 定位容忍（提示而非阻断），文案里给「确认对方变更已死可归档后消音」出口；若实测噪声大，后续可加活跃度过滤（DB last_active 阈值），本版不做（先看真实使用密度）。 放弃的方案：① 重叠检测做成批准门硬阻断——把「路由建议」升格为「禁行」，违反「不是禁止是分流」的设计意图，且陈旧声明会制造假禁行；② 用 collectForeignDeclaredFiles 逐变更查他侧声明——N 次全量扫描 + own-priority 语义（双方声明归 own）恰好把重叠面藏掉，方向相反；③ 落地序列新做调度器——既有 main-repo.lock + apply --3way + guard 预检已覆盖序列与合并，重做是重复建设，本变更只在指引文案里把既有机器串成协议叙事。
