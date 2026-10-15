---
author: flow-machine-draft
created_at: 2026-10-15T02:00:32.068Z
---
# 提案书（Proposal）— 2026-10-15-thin-query-slim

## 动机

任务原话转写：效果评估实证两处：①thin 道 flow start 知识匹配查询用整段 --input（含成功标准段的文件路径/测试名/断言词），路径词过触路由关键词把命中面撑爆——本仓实证整段 input 匹配出 76 条目、58 个 fr 域文件全命中，精度靠 top-3/40 行截断兜底；修法 thinKnowledgeQuery 只取动机段（成功标准：标记前正文），无标记全文照旧。②知识图谱相关检索「知识图谱 graph 影响面 impact」路由层零词表命中只靠查询 bigram 兜底（score 3）——分词机制非病（响面 tag 是查询侧 bigram 命中文件文本的正常显示），病在词表覆盖：INDEX unmapped 路由行补 知识图谱|图谱|影响面|impact 关键词，score 3→9 实证。

成功标准：
- thinKnowledgeQuery 四态单测绿（有标记留动机/中文冒号同判/无标记全文/动机空白退全 input）
- flow start 遥测 query 字段=瘦身串；既有注入面测试零回归
- INDEX 词表补齐后 knowledge validate ok:true，检索 score 提升（3→9）留档回执

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. thinKnowledgeQuery 四态单测绿（有标记留动机/中文冒号同判/无标记全文/动机空白退全 input）
2. flow start 遥测 query 字段=瘦身串；既有注入面测试零回归
3. INDEX 词表补齐后 knowledge validate ok:true，检索 score 提升（3→9）留档回执

## 成功标准（可验证）

1. thinKnowledgeQuery 四态单测绿（有标记留动机/中文冒号同判/无标记全文/动机空白退全 input）
2. flow start 遥测 query 字段=瘦身串；既有注入面测试零回归
3. INDEX 词表补齐后 knowledge validate ok:true，检索 score 提升（3→9）留档回执
