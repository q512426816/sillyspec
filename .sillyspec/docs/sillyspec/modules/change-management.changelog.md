---
schema_version: 1
doc_type: module-changelog
module_id: change-management
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# change-management 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。卡内既有「变更索引」表为迁出前历史，保留不动。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | quicklog 根因块嵌套四子字段（D-004@v1 / task-07）：根因块内 - 现象：/- 根因：/- 护栏：/- 证据： 列表行为合法 postmortem 形态（顶层标签白名单 ^ 行首锚定，「- 」前缀不构成顶层标签、顶层四字段边界不动，旧条目回退不受影响）；buildPushPayloadFromRaw 字段块复位修复（进入 需求/根因/方案/结果 字段块关闭 inFiles/inLinked 续行模式，防嵌套子字段列表行被「文件 bullet」分支劫进 payload.files）；单行四字段切分声明只作用于单行压缩归一路径。新增回归测试 quicklog-postmortem-fields.test.mjs。 |
