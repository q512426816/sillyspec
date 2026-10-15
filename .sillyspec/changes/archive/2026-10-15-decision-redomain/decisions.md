---
author: flow-machine-draft
created_at: 2026-10-15T08:30:10.129Z
---
# 决策记录（Decisions）— 2026-10-15-decision-redomain

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：决策段的「变更」行多源歧义（段内多变更行/无变更行）——parse 侧 last-wins 与 sectionMeta first-wins 曾对坏段判定分歧（gov-action 粘连段实证：批次表认 last、迁移过滤认 first → 无命中拒）——处置：迁移前数据修复坏段（补标题分拆），过滤器与批次生产同源化（first-wins 单一口径）。次风险：无变更行条目（6 条深链旧条目）判定靠主题人工——留痕裁决。放弃方案：①复用 redomain.js 加参数（段格式/冲突键/路由形态三处语义差异，硬塞参数化比孪生实现更易漂移）；②不删空壳保留 unmapped.md（空壳域污染域列表——fr 面既有防线语义，同款处置）；③批量重蒸馏迁移（源 decisions.md 已归档改不动，重放会覆盖 ID 体系）。
