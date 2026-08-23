---
schema_version: 1
doc_type: module-changelog
module_id: docs-consistency
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# docs-consistency 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | docs-check 新增决策规则族 runDecisionRules（async advisory：implemented 条目锚点存在性 + 锚定模块源码 behind 超阈值复核，decisions.behind_threshold 缺省 10；known_failures 新增 decisions.* 命名空间豁免，规则级/条目级伞形；不进 ok/invalid 阻断链、只读零写盘、无信号零输出）+ readDecisionRulesConfig；docs-debt 新导出 computeModuleBehind（单模块 behind 计数，与 moduleDebt 共用口径单一真相源，不改现有行为）；**新增源文件 src/decision-distill.js 归属本模块**（决策提炼纯函数：parseDecisions + distillIntoKnowledge，rejected 优先留痕/needsWait/域三级兜底/幂等），paths 已补进 _module-map.yaml。消费者：doctor 决策待复核步骤、verify evidence-auto 推荐链、archive decision-distill 步骤。 |
