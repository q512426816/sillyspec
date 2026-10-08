---
author: flow-machine-draft
created_at: 2026-10-08T16:09:40.486Z
---
# 提案书（Proposal）— 2026-10-08-graph-summary-consistency

## 动机

任务原话转写：graph summary 与 doctor 图检查「同源」声明落实为真单一源。

动机与背景：
2026-10-08-graph-summary-nodes 的 summary 四计数注释声称与 doctor 六检查「口径一处定义两处消费」，实测为两份手抄副本（module_doc_gaps/changelog_danglings 判定逻辑在 doctor-diagnostics.js 与 knowledge-graph.js 各写一遍）——今天同值靠复制时刻相同，明天改任一边即静默漂移；平台仓阶段三（2026-10-08-platform-knowledge-graph）正拿该面当跨仓依赖契约。评审另指出：module_doc_gaps/changelog_danglings 两计数零测试断言；dangling_refs 合并口径（=doctor 强边 2717+中边 1439 两类之和）未注——消费方对不上账。

成功标准：
- 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真
- summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）
- 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）
- 既有图测试 9 组 + doctor 回归全绿，lint 零告警

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真
2. summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）
3. 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）
4. 既有图测试 9 组 + doctor 回归全绿，lint 零告警

## 成功标准（可验证）

1. 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真
2. summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）
3. 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）
4. 既有图测试 9 组 + doctor 回归全绿，lint 零告警
