---
author: flow-machine-draft
created_at: 2026-10-14T08:46:10.581Z
---
# 决策记录（Decisions）— 2026-10-14-timeline-ticktime-anchor-scope

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：显示形态变化破坏既有测试断言——侧车在场才去 ≈ 前缀，纯推断路径保持 ≈ 原形态，既有断言（≈HH:MM:SS、?、未勾）零改动；侧车时刻与推断时刻同时在场时必须显侧车（测试钉住优先级）。 - 死路（放弃）：tasks.md frontmatter 落 ticked 映射——tasks.md 被 machine-draft 生成/agent 手工编辑多方覆写，frontmatter 键易在重生成时丢失，且把时间戳塞进人读文档加剧本复杂度；侧车 append-only 不参与覆写竞争。 - 死路（放弃）：watcher 快照存 per-task 行状态以捕获直接 Edit 翻格的任务 id——需改快照/水位格式并顾跨版本兼容，且对观测盲窗（本次事故主因）无效；CLI 留痕是零盲窗的事实源，Edit 翻格仍走推断降级（诚实面不编时间）。 - 死路（放弃）：按 commit diff 路径补强 sameChange——见做法概述②，注入面波及过大，边际收益。
