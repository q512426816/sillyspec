---
author: flow-machine-draft
created_at: 2026-10-02T17:16:32.968Z
---
# 决策记录（Decisions）— 2026-10-03-fr-governance-telemetry

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：候选视图被当门禁用——高 suspect 次数不等于该退休（热文件天然高频被触达）。对冲：渲染文案显式「候选非裁决」，处置指引给出人裁出口（承接翻链/needs_review），视图零阻断。声明边界：①帽 20 截断——超大触达面事件只带前 20 个 id，聚合计数是下界（视图本就是 Top-N 指引）；②存量 64+ 次事件无 id——视图只对新事件生效，历史需积累（不回填伪造）；③unmapped 迁移只做机械可迁面（来源变更可判域者），语义归属不猜。试过放弃：给 unreferenced 探针做全量 id（不帽）——单事件可达数百 id 撑爆 jsonl 行，帽 20 抽样足够指引裁决。
