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
| 2026-09-11 | 2026-09-11-cross-change-decision-guard | config-schema 增 semantic_guard 段（enabled：boolean optional live，默认 true，fail-open——缺键/读取异常恒 true 不拦门禁）；readers 登记引 readSemanticGuardEnabled（src/semantic-guard.js）；renderExample yaml 块同步（friction_hint 同款形态，live 键 example 防漂耦合测试覆盖）。 |
- ql-20260911-029-2892 | 紧急包小修：parseMakefileTestCommand 重写为行扫描——行内 prereq 按 make 语义回退 make test、新增 ; 同行配方、排除 test := 变量、配方边界=下一非缩进行（旧正则 \s* 吞换行可取错命令致门禁假通过）
