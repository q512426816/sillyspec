---
author: flow-machine-draft
created_at: 2026-11-02T13:11:13.863Z
---
# 决策记录（Decisions）— 2026-11-02-knowledge-status-lines

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：**风险**：状态误判——无检索后果（isResolvedRoute 不读正文），建议清单人工复核兜底。 **放弃的方案**：① decisions/unmapped 加「状态：draft」字段行——docs-check 机械解析契约+producer 幂等性风险（审查实证），改头注自描述；② 改 isResolvedRoute 读正文状态行——数据迁移不夹带检索行为变化（变更 4 审查裁决），留独立变更。
