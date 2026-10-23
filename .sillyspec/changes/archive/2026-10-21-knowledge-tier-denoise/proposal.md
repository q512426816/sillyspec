---
author: flow-machine-draft
created_at: 2026-10-21T03:59:03.755Z
---
# 提案书（Proposal）— 2026-10-21-knowledge-tier-denoise

## 动机

任务原话转写：知识库分级治理：注入去噪、缓存止血与存量清偿
动机：三路调查（本仓机制探查+独立复核+平台侧沉淀）证实归档原文从不进注入、注入有硬上限，热层的真缺口有三——①decisions 检索面三条路径（INDEX 路由命中、词片回退、平台向量层召回）均不过滤 decisions/unmapped.md，443 条未映射决策条目实打实能进 prompt，而 FR 注入面 2026-09-29-rot-retire-inject-cap 已滤 unmapped（.filter(d => d !== 'unmapped')，prompt.js:454 等），两面口径不一致；②decision-distill 默认模板给每个域生成 decision|决策 泛词路由行（decision-distill.js:490 一带），全体域共享泛词，注入席位实际由 INDEX 行序抽签决定；③knowledge-graph 构建与 quicklog 伪条目扫描在 flow start/execute/知识门/doctor 热路径上无缓存全量扫 765 个归档目录（graph 逐节点读归档 design.md 全文+change-patch.json，fr-index.js:897 covCache 仅进程内且每来源变更跑 git log --all）。另：unmapped 存量 633(fr)+443(decisions) 条，源头域路由匹配器已修（2026-10-15-module-path-glob-match）、存量迁移工具 decision-redomain 已在库，缺的是执行清偿。本变更只做分级治理①②③+存量清偿，不含平台侧保留策略（另立）与 quicklog 账本退役（另立）。

成功标准：
- decisions/unmapped.md 在全部注入/检索路径（INDEX 路由命中、词片回退、向量层召回）不再进入 prompt——对齐 FR 面既有 unmapped 过滤口径，过滤处与 FR 面同构留痕
- INDEX.md 不再保留、也不再新生成各域泛词路由行（decision|决策 类全体域共享关键词），存量泛词行清除；distill 写盘侧同步改模板，路由命中不再按行序抽签
- knowledge-graph 构建与 quicklog 伪条目扫描具备跨进程缓存：同状态二次运行不再全量重扫 765 归档目录，缓存有失效机制（归档新增/目录变化能刷新）
- unmapped 存量经既有 redomain 机器通道清偿：fr/unmapped.md 与 decisions/unmapped.md 条目数降至有界，迁移正确的进正确域、迁不动的留痕处置，不裸删条目
- 零回归：本变更测试面+FR 关联回归全绿、lint 过；注入行为变化（去噪）有测试锁定

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. decisions/unmapped.md 在全部注入/检索路径（INDEX 路由命中、词片回退、向量层召回）不再进入 prompt——对齐 FR 面既有 unmapped 过滤口径，过滤处与 FR 面同构留痕
2. INDEX.md 不再保留、也不再新生成各域泛词路由行（decision|决策 类全体域共享关键词），存量泛词行清除；distill 写盘侧同步改模板，路由命中不再按行序抽签
3. knowledge-graph 构建与 quicklog 伪条目扫描具备跨进程缓存：同状态二次运行不再全量重扫 765 归档目录，缓存有失效机制（归档新增/目录变化能刷新）
4. unmapped 存量经既有 redomain 机器通道清偿：fr/unmapped.md 与 decisions/unmapped.md 条目数降至有界，迁移正确的进正确域、迁不动的留痕处置，不裸删条目
5. 零回归：本变更测试面+FR 关联回归全绿、lint 过；注入行为变化（去噪）有测试锁定

## 成功标准（可验证）

1. decisions/unmapped.md 在全部注入/检索路径（INDEX 路由命中、词片回退、向量层召回）不再进入 prompt——对齐 FR 面既有 unmapped 过滤口径，过滤处与 FR 面同构留痕
2. INDEX.md 不再保留、也不再新生成各域泛词路由行（decision|决策 类全体域共享关键词），存量泛词行清除；distill 写盘侧同步改模板，路由命中不再按行序抽签
3. knowledge-graph 构建与 quicklog 伪条目扫描具备跨进程缓存：同状态二次运行不再全量重扫 765 归档目录，缓存有失效机制（归档新增/目录变化能刷新）
4. unmapped 存量经既有 redomain 机器通道清偿：fr/unmapped.md 与 decisions/unmapped.md 条目数降至有界，迁移正确的进正确域、迁不动的留痕处置，不裸删条目
5. 零回归：本变更测试面+FR 关联回归全绿、lint 过；注入行为变化（去噪）有测试锁定
