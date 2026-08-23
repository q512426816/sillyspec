---
schema_version: 1
doc_type: module-changelog
module_id: runtime
author: qinyi
created_at: 2026-08-24T00:40:00+08:00
updated_at: 2026-08-24T00:40:00+08:00
---

# runtime 变更索引（changelog sidecar）

> 模块卡的变更索引历史条目迁出至此（卡正文保持精简，降低子代理读取税）；新条目追加到表尾，勿堆回卡正文。

| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-08-23 | 2026-08-23-adopt-harness-practices | run/prompt 两占位符注入（均 fail-soft）：brainstorm Step2 的 {DECISION_HITS}——matchKnowledge decisionHits 命中 rejected 条目渲染否决决策提示段（无命中替换空串零输出、注入结果落 .runtime/decision-hits.json、异常单行说明不抛）；verify 运行测试步的 {EVIDENCE_AUTO_RECOMMENDATION}——resolveTestStrategy 的 evidence-auto 推荐组合在 prompt 时点渲染进 step prompt（含降级注记与 verify-result.md 否决路径，FR-11），注入失败给读 local.yaml 指引、--done 仍按实测对账。 |
