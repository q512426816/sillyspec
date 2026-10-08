---
author: flow-machine-draft
created_at: 2026-10-08T16:21:56.758Z
---
# 决策记录（Decisions）— 2026-10-08-graph-summary-consistency

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：⑩交叉断言解析 doctor finding 文本计数——doctor 输出格式（「graph-module-doc-gap：N 个」）成为测试契约面，未来改 finding 文案需同步改测试正则。接受：该格式本就是平台时间线展示面，钉住它等于钉住消费契约；格式漂移测试红属正确报警。放弃的方案：doctor 直接消费 graphSummary 拿计数——弃，doctor 需要 finding 样本明细（样本列表进 warning 文本），纯计数接口喂不饱；维持两函数但加注释声明对齐义务——弃，注释不是牙齿（本变更要修的正是注释与实现脱节的先例）。
