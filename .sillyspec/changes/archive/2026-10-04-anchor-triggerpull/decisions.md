---
author: flow-machine-draft
created_at: 2026-10-04T16:45:52.930Z
---
# 决策记录（Decisions）— 2026-10-04-anchor-triggerpull

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：锚在窗内但语义漂移（行号指向了别的 triggerPull 出现处）——已核对 4232/4235 均为「const { triggerPull } = await import」目标语句。试过放弃：锚 4232 精确贴 HEAD（否决——并行提交后工作树校验窗又一轮漂）。
