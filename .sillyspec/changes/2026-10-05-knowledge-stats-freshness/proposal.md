---
author: flow-machine-draft
created_at: 2026-10-05T00:39:14.310Z
---
# 提案书（Proposal）— 2026-10-05-knowledge-stats-freshness

## 动机

任务原话转写：动机：knowledge stats 仪表盘的读者无法判断遥测数据新鲜度——hits.jsonl 可能多日未写入，但输出只显示统计窗口天数，不知道数据截至何时；需要在输出中暴露遥测流最后写入时间。改动面：src/knowledge-stats.js 聚合函数 + 渲染 + 对应单测。
成功标准：
- knowledge stats --json 输出新增 lastEventAt 字段（全量流 max(at) 的 ISO 字符串；无任何遥测记录时为 null）
- 人类可读模式在遥测计数行展示数据截至日期（有遥测时）；无遥测时不展示该读数
- 单测覆盖三种情形：多记录取最新 at、单记录、无遥测为 null

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. knowledge stats --json 输出新增 lastEventAt 字段（全量流 max(at) 的 ISO 字符串；无任何遥测记录时为 null）
2. 人类可读模式在遥测计数行展示数据截至日期（有遥测时）；无遥测时不展示该读数
3. 单测覆盖三种情形：多记录取最新 at、单记录、无遥测为 null

## 成功标准（可验证）

1. knowledge stats --json 输出新增 lastEventAt 字段（全量流 max(at) 的 ISO 字符串；无任何遥测记录时为 null）
2. 人类可读模式在遥测计数行展示数据截至日期（有遥测时）；无遥测时不展示该读数
3. 单测覆盖三种情形：多记录取最新 at、单记录、无遥测为 null
