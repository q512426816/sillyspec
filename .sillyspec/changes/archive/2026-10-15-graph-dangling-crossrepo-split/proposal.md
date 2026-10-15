---
author: flow-machine-draft
created_at: 2026-10-15T01:48:23.559Z
---
# 提案书（Proposal）— 2026-10-15-graph-dangling-crossrepo-split

## 动机

任务原话转写：效果评估实证：knowledge graph dangling 主计数 2537 条中 2472 为跨仓强边注记（backend/frontend/sillyhub 等顶级目录本仓不存在——知识库集中管理仓、代码分仓存放是本体系常态拓扑），本仓可行动悬空仅 90 条被噪音淹没；doctor 文案已有跨仓分流但 summary/CLI 数字面未分流，健康数字长期失真。修法为口径分流而非删数据：graphSummary 增 breakdown.cross_repo 与 dangling_refs_local 附加字段（主计数与守恒口径不动，平台 RPC 消费 additive 兼容），dangling 子命令增 --local 过滤与〔跨仓注记〕标注。

成功标准：
- graph summary 输出 dangling_refs_local 与 breakdown.cross_repo，local + cross_repo = total 守恒（真图 2537 = 90 + 2447）
- knowledge graph dangling --local 只列本仓悬空，输出附 cross_repo 分流计数；跨仓条目带〔跨仓注记〕标注
- 既有守恒测试（dangling_refs = strong + medium）零回归，新增分流守恒断言全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. graph summary 输出 dangling_refs_local 与 breakdown.cross_repo，local + cross_repo = total 守恒（真图 2537 = 90 + 2447）
2. knowledge graph dangling --local 只列本仓悬空，输出附 cross_repo 分流计数；跨仓条目带〔跨仓注记〕标注
3. 既有守恒测试（dangling_refs = strong + medium）零回归，新增分流守恒断言全绿

## 成功标准（可验证）

1. graph summary 输出 dangling_refs_local 与 breakdown.cross_repo，local + cross_repo = total 守恒（真图 2537 = 90 + 2447）
2. knowledge graph dangling --local 只列本仓悬空，输出附 cross_repo 分流计数；跨仓条目带〔跨仓注记〕标注
3. 既有守恒测试（dangling_refs = strong + medium）零回归，新增分流守恒断言全绿
