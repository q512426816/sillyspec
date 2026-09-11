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
- 2026-09-07-endpoint-baseline | archive-delta 第五源：endpointBaseline（fail-soft）+ 现算同口径 × diffEndpointSets → After「### 端点基线提示」四态（增删表/无增删/无基线降级/现算不可得）；门控与标题不动。
- ql-20260908-008 | 新增 autoReanchorDocRefs（--fix 主链路编程化封装：fixable 命中 → applyFixes → 同口径复跑回执），quick --done 检出引用失效时自动重锚并落「🔧 行号漂移已自动重锚」审计行；歧义/零命中仍留人工（无 --force 红线不变） |
- ql-20260908-010 | generateModuleImpactSkeleton 增声明来源入口（sourceFiles+origin 参数，plan --done 首版用 design 文件变更清单——代码未写无 diff；diff 来源语义不变）；卡补 module-impact.js 契约行（此前 map 已归属但表格漏登）
- 2026-09-11-cross-change-decision-guard | decision-distill 增「文件：」字段契约：applyField/FIELD_LABEL_RE 增「文件|files」标签（parseListValue 切分 + 逐项 POSIX 归一），renderBlockLines 锚点行后条件渲染「文件：」行（仅非空才渲染）——存量决策无该字段零迁移；决策→文件映射经 knowledge-match matchDecisionsByFiles 进 quick 语义护栏反查链。
