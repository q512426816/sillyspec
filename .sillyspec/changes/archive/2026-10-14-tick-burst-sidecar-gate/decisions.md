---
author: flow-machine-draft
created_at: 2026-10-14T13:43:44.339Z
---
# 决策记录（Decisions）— 2026-10-14-tick-burst-sidecar-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：误报合法近距勾选（两个真实完成相隔 <60s 的任务单元连点）——后果止于 advisory 提示 + flow-state 留痕（用户确认档位，不阻断）；窗口取 60s 保守值：实测快连点形态 span 279ms–29s，渐进勾选间隔通常分钟级，两侧留有余量。 - 死路（放弃）：在事件流侧修判据（对 CLI 精确事件也做时距分析）——事件流是 .runtime 机本位 + 观测盲窗（deploy-release-notes 实证 0 条 task-done），检测面先天缺失；侧车才是跨机事实源。 - 死路（放弃）：检出即恢复证据完备硬拒——重演 2026-10-13 之前的误伤/摩擦循环（用户未选该档，先留痕攒数据）。
