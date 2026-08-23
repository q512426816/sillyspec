---
schema_version: 1
doc_type: module-changelog
module_id: stages
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# stages 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | 决策知识库闭环接线：archive 六步化（新「decision-distill 决策提炼」步，sync-module-docs 后、确认归档前，conditionalWait + repeatableWait 上限 3 轮；末步 git add 精确到 knowledge/decisions/ 子目录）；brainstorm Step2 加 decisions 库路由 + {DECISION_HITS} 占位符（rejected 防复潮）、Step6 决策模板四个可选字段（锚点/模块域/否决理由/复潮条件）；verify 加检查选择指引 + {EVIDENCE_AUTO_RECOMMENDATION} 占位符 + 检查选择与重复执行纪律两条 + 实现偏差 postmortem 提示；quick 单行旧形式警告补嵌套列表行合法说明 + step3 四子字段可选提示；doctor 新增「决策待复核检查」步骤（5→6 步）+ 汇总报告决策待复核段与 postmortem 提示。提炼本体（src/decision-distill.js）与决策规则族（docs-check）归 docs-consistency 卡。 |
