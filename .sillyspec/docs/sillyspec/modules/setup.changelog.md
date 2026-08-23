---
schema_version: 1
doc_type: module-changelog
module_id: setup
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# setup 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。卡内既有「变更索引」表为迁出前历史，保留不动。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | config-schema（local.yaml 单一数据源）：test_strategy 枚举扩 skip / evidence-auto（D-005@v2——skip=真跳过留审计痕迹、evidence-auto=按 module-impact 影响面推荐组合，full/module 语义不变）；新增 live 键 decisions.behind_threshold（决策 behind 复核阈值，缺省 10，reader=readDecisionRulesConfig/src/docs-check.js）；renderExample 落盘段与示例注释同步扩；config-schema 既有测试适配。 |
