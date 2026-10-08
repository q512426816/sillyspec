---
author: flow-machine-draft
created_at: 2026-10-08T16:09:40.486Z
---
# 设计记录（Design Record）— 2026-10-08-graph-summary-consistency

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | 抽 graphModuleDocGaps/graphChangelogDanglings 单一源导出；graphSummary 消费 helper + 增 dangling_refs_breakdown 双桶字段 |
| 修改 | src/doctor-diagnostics.js | 六检查⑤⑥删内联手抄副本、改消费 helper（requireKnowledgeGraph 桥既有） |
| 修改 | test/knowledge-graph.test.mjs | ⑧补三组断言（helper 同值/双 existsFn 态/breakdown 守恒 + mini-fixture 正值）；新增⑩doctor↔summary 交叉断言 |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

把 graph-summary-nodes 留下的两份手抄判定收敛为单一源：module_doc_gaps / changelog_danglings 的判定逻辑抽成 knowledge-graph.js 导出函数（graphModuleDocGaps / graphChangelogDanglings），doctor 六检查与 graphSummary 四计数消费同一函数；「口径一处定义两处消费」从注释愿望变成代码事实，并由⑩交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值对账）钉死——今后改任一边漂移即测试红。另补 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（dangling_refs 语义不动，平台阶段三消费面向后兼容），消解「合并口径对不上 doctor 单类计数」的对账缺口。选 helper 抽取而非 doctor 消费 graphSummary：doctor 需要 finding 样本明细而非纯计数，helper 返回数组（.length 即计数）双方各取所需，改动面最小。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新导出：graphModuleDocGaps(graph) → Node[]、graphChangelogDanglings(graph, {existsFn}) → string[]（knowledge-graph.js）。
- graphSummary 返回增键 dangling_refs_breakdown（附加字段，既有键零变化）；CLI `knowledge graph summary` 输出随之多一个字段（JSON 消费方向后兼容）。
- doctor 六检查行为零变化（同判定同值——交叉断言与真图终验 11/64/1/4156 锚定）；无端点/命令面变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立——helper 是图对象的纯函数（无时序面）；doctor 与 summary 各自调用同函数，无事件序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   图是调用方内存对象（D-003 内存派生），helper 无写盘无共享态；不引入新并发面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   无状态持久化（无缓存文件）；doctor/CLI 每次调用重建图，中断无残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   changelog 悬空判定锚 graph.root（建图传入的 specRoot），doctor 与 CLI 同源传参——无双根口径；无串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：⑩交叉断言解析 doctor finding 文本计数——doctor 输出格式（「graph-module-doc-gap：N 个」）成为测试契约面，未来改 finding 文案需同步改测试正则。接受：该格式本就是平台时间线展示面，钉住它等于钉住消费契约；格式漂移测试红属正确报警。放弃的方案：doctor 直接消费 graphSummary 拿计数——弃，doctor 需要 finding 样本明细（样本列表进 warning 文本），纯计数接口喂不饱；维持两函数但加注释声明对齐义务——弃，注释不是牙齿（本变更要修的正是注释与实现脱节的先例）。
