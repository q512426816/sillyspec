---
author: flow-machine-draft
created_at: 2026-10-15T02:00:32.068Z
---
# 设计记录（Design Record）— 2026-10-15-thin-query-slim

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

效果评估两处实证。①查询面：thin 道 flow start 知识匹配查询用整段 --input——「成功标准：」段是验收判据语料（文件路径/测试名/断言词），对知识匹配是纯噪音且路径词过触路由关键词撑爆命中面（本仓实证整段 input 匹配出 76 条目、58 个 fr 域文件全命中，精度靠 top-3/40 行截断兜底）。修法：src/flow.js 新增导出 thinKnowledgeQuery(change, input)——只取「成功标准：/：」标记前动机段，无标记全文照旧（兼容旧形态），动机空白退全 input（禁空查询）；flowKnowledgeDigest 匹配与遥测 query 字段同用瘦身串。②词表面：检索「知识图谱 graph 影响面 impact」路由层零词表命中只靠查询 bigram 兜底（score 3）——评估修正：分词机制非病（「响面」tag 是查询侧 bigram 命中文件文本的正常信号显示，queryShingles bigram 设计如此），病在 INDEX 路由词表覆盖缺口；修法为数据补齐：INDEX.md unmapped 路由行补 知识图谱|图谱|影响面|impact，score 3→9 实证。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/flow.js 新增导出 thinKnowledgeQuery(change, input) → string：`${change}\n${动机段}`；flowKnowledgeDigest 内部匹配与遥测同源消费。
- .sillyspec/knowledge/INDEX.md unmapped 路由行关键词集扩充（数据面）。
- 对外 CLI 行为：flow start 知识命中面可能变窄（噪音命中减少）——这是目的本身；遥测 query 字段形态变化（全 input → 动机段），knowledge-stats 对 query 字段无消费依赖（按 matchedFiles 计数）零回归。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——纯字符串变换，无时序面。
2. 并发写：INDEX.md 数据行为本变更单点写入，收口对账以落盘为准；他会话并行编辑 INDEX 的既有风险面不变。
3. 切换/生命周期：thinKnowledgeQuery 纯函数无状态；标记缺席回退全文保证旧形态 --input 零破坏。
4. 作用域：瘦身只作用于轻量道注入点（flow.js），厚道 execute（任务名串）与 quick step1（任务描述）查询面本就瘦，不动；INDEX 词表全消费端（search/注入/门）即时受益。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：动机段写得空泛而成功标准里藏着真正该匹配的领域词——漏匹配。评估：动机段按过门格式必然描述问题域（改动对象+背景），领域词密度天然高于判据段；且 scope 遍历层（touched 文件）与 FR 域注入不依赖该查询，兜底面仍在。次风险：「成功标准：」字样出现在动机正文中间造成提前截断——接受：该串本身是过门格式标记，出现在动机里即格式噪音。放弃方案：①查询按 sentence 切分打权重（过度工程，词面匹配器吃不起）；②INDEX 全量词表审计（2378 条 FR 域逐域补词——值一次独立数据清偿，不在本变更）；③改 queryShingles 展示（bigram tag 是信号面非缺陷，动了破坏 fallback 可解释性）。
