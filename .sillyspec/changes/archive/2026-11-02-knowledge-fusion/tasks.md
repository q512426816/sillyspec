---
author: flow-machine-draft
created_at: 2026-11-02T06:16:10.324Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-fusion

- [x] task-01: 核心纯函数——knowledge-graph.js 加 fuseScopeRecall（只追加 scopeDecisionHits/scopeEntries、键 file#id#change/file#anchor、cap 20/3、ghost/畸形过滤、空 scope 返回 base 原对象）+ graphPathCandidates 键规整 + scopeRecall ghost 过滤；test/knowledge-fusion.test.mjs 的契约/去重/幽灵/cap 用例跑绿
- [x] task-02: 异步与同步入口——matchKnowledgeHybrid 路由命中的 scope 融合分支（fail-soft return base、不跑向量）；matchKnowledgeWithScope 同步入口；无 scope deepEqual + fail-soft 用例跑绿
- [x] task-03: 展示面——flow rejected 路由 top-5 + scope 独立小节（≤3 带来源）；complete 同款；prompt/execute 孪生 scopeEntries 指针行 + 格式锁测试同步；flow 集成用例（filesOverride 触发 scope rejected）跑绿
- [x] task-04: 键统一——execute step 用 deliverableFilesFromDesignText、Wave 用 task 卡 target_files/过滤 allowed_paths、quick 仅 guard.allowedFiles；{DECISION_HITS}/cmdSearch 注释不传理由；键规整单测
- [x] task-05: 测试收口——RED-first 判据（fusion 置空必红）、零平台调用断言、buildKnowledgeInjection/Wave 格式锁、回归全绿
- [x] task-06: eval 融合子集——新增 subset='fusion' 的 entries/decisions case（路由命中、expected 仅 scope 可达）；faces/run 按 subset 单列（entries/decisions 面）；跑 eval 验证五面逐位一致 + 六探针 GREEN + scope 子集不变 + fusion 子集单列
- [x] task-07: 基线与回归——baseline 更新、knowledge 面全绿、lint 绿
