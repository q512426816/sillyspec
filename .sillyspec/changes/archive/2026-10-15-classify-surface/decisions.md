---
author: flow-machine-draft
created_at: 2026-10-15T02:29:39.319Z
---
# 决策记录（Decisions）— 2026-10-15-classify-surface

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：info 信号常态化出现在每次 digest（收件箱长期 1~5 条是正常运维态）——提示疲劳。评估：info 与 warn 视觉分区（ℹ️ vs ⚠️）、healthy 不翻红、底数行照旧——看到「有条目待归类+一条命令」是恰当的轻推，狼来了风险低于原 >20 报警（那才是积压到忍无可忍才叫）。次风险：平台 governance 卡对 level 字段缺省的旧信号（warn）渲染分支——既有信号全带 'warn' 字面量，无缺省态，零影响。放弃方案：①给 classify 做自动建议目标文件（条目语义分类需要模型判断，词面建议错误率高——留给 agent 按清单自行裁决）；②收件箱阈值降到 >5 报 warn（把提示当告警用，语义错位）；③只改 healthy 不加 info 信号（收件箱存在但仍隐身，问题实质未解）。
