---
author: flow-machine-draft
created_at: 2026-11-04T23:19:09.910Z
---
# 提案书（Proposal）— 2026-11-05-knowledge-search-observability

## 动机

任务原话转写：知识检索观测补盲与向量质量收口

动机与背景：
三子代理交叉分析（算法/模型基建/使用数据，2026-11-05）实证：①search 显式检索面零遥测（查什么/命中率/通道全盲）且 inject 事件不记通道——向量层与后续地板调优无数据地基；②stats 遥测被两个测试用例污染 62%（用真实仓 specBase 跑 flowKnowledgeDigest，僵尸查询灌入遥测，官方读数虚胖 3 倍）；③thin-start 零命中不落盘——真实零命中率（向量层目标场景）永不可见；④向量结果跨文件重复污染 top-k（798 条中 104 重复槽位，实测 top10 中 5 条同条目副本，去重后真命中升 2-3 位）；⑤search 面向量通道 score 恒显 0（keywords∩query 口径对 vector 通道是错值）；⑥VECTOR_TIMEOUT_MS=3000 硬编码小于 worker 冷启 1~3s（昨日平台修复变更 design.md 留痕的独立议题）。用户已批准第一批行动计划（「做」）。

成功标准：
- VECTOR_TIMEOUT_MS 缺省 3000→5000 且 env SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS 可调（非法值回落缺省）
- 向量 decisionHits 按 (anchor,change) 去重保最高分（跨文件副本不再挤占 top-k）
- search 面向量通道透出真实余弦分（不再恒 0）
- inject 遥测记 channel（routing/vector/fallback/scope）；thin-start 零命中落盘（zeroHit 标记，matchedFiles 空不污染 stats 文件矩阵）
- knowledge search 面新增 type=search 遥测（query/matched/channel/entry_count；stats 现有聚合零回归）
- 两个污染测试改用 tmpdir 隔离 specBase，跑测试不再写真实仓遥测
- 既有测试面全绿 + 新增用例覆盖上述行为

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. VECTOR_TIMEOUT_MS 缺省 3000→5000 且 env SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS 可调（非法值回落缺省）
2. 向量 decisionHits 按 (anchor,change) 去重保最高分（跨文件副本不再挤占 top-k）
3. search 面向量通道透出真实余弦分（不再恒 0）
4. inject 遥测记 channel（routing/vector/fallback/scope）；thin-start 零命中落盘（zeroHit 标记，matchedFiles 空不污染 stats 文件矩阵）
5. knowledge search 面新增 type=search 遥测（query/matched/channel/entry_count；stats 现有聚合零回归）
6. 两个污染测试改用 tmpdir 隔离 specBase，跑测试不再写真实仓遥测
7. 既有测试面全绿 + 新增用例覆盖上述行为

## 成功标准（可验证）

1. VECTOR_TIMEOUT_MS 缺省 3000→5000 且 env SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS 可调（非法值回落缺省）
2. 向量 decisionHits 按 (anchor,change) 去重保最高分（跨文件副本不再挤占 top-k）
3. search 面向量通道透出真实余弦分（不再恒 0）
4. inject 遥测记 channel（routing/vector/fallback/scope）；thin-start 零命中落盘（zeroHit 标记，matchedFiles 空不污染 stats 文件矩阵）
5. knowledge search 面新增 type=search 遥测（query/matched/channel/entry_count；stats 现有聚合零回归）
6. 两个污染测试改用 tmpdir 隔离 specBase，跑测试不再写真实仓遥测
7. 既有测试面全绿 + 新增用例覆盖上述行为
