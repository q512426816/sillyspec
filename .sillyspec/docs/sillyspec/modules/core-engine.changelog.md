---
schema_version: 1
doc_type: module-changelog
module_id: core-engine
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# core-engine 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。卡内既有「变更索引」表为迁出前历史，保留不动。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | knowledge-match 增决策匹配：parseDecisionEntries 解析 decisions 条目、matchKnowledge 返回值新增 decisionHits（rejected 优先排序，matched/entries/report/json 旧四键不变，无库/未命中空数组）供 brainstorm Step2 防复潮注入；verify-postcheck 接线 test_strategy 新值（D-005@v2）——skip 真跳过（mode strategy-skip，不回退全量、输出显式标注留审计痕迹、审计落盘）+ resolveTestStrategy 统一入口（evidence-auto 按 module-impact.md 影响面推荐检查组合，缺失降级 module 并注记）。 |
