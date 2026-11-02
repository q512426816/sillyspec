---
author: flow-machine-draft
created_at: 2026-11-02T04:02:08.616Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-rank-denoise

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按子代理方案审查的修正版分六步实施，每步独立验证：

① **score 契约**：`buildSearchMatches(result, knowledgeDir, limit, query)` 增加 query 参数，score = tags 中 keywordMatchesContext 为真的数量；合成条目按 channels 标 `channel`（fallback/scope/vector）。cmdSearch 与 eval engine 同步调用。
② **词边界**：`keywordMatchesContext`（knowledge-match.js）与 `asciiWordHit`（同文件）统一 `[^a-z0-9_]`——`_` 是词字符、`-` 是边界（审查实测：`-` 当词字符会损失 568 个变更名×关键词命中对、0 增益）。shingle 抽取保留 `_-` 整词并额外产出按 `[_-]` 拆分的片段。
③ **已修复过滤**：matchByRouting 内对 known-issues 类文件（category==='Known Issues' 或 file basename 含 known-issues）按 INDEX display/anchor 含「已修复|已解决|已退役」判定过滤，零正文解析、fail-open；opts.includeResolved 贯穿 matchKnowledge/matchKnowledgeHybrid/cmdSearch（--include-resolved）；输出 resolvedFiltered 披露。
④ **routeHits 分离**：matchByRouting 内部保留全量 matched（decisionRoutes 与 parseDecisionEntries 不变），对外 entries 只留手工条目；条件式新增 routeHits（仅当非空时出现，防 decisions-lifecycle 顶层键严格相等断言回归）；matched = entries∪routeHits∪decisionHits 非空。消费面：flow 知识命中行只取 entries + 新增 routeHits 指针行；complete 的知识条目取 entries + routeHits 指针；prompt/execute 的 matchKnowledge 入口同样加指针行；空 entries 不渲染空段。
⑤ **DF 排序**：entries 可展示语料（排除 fr/decisions）为分母统计关键词 DF；排序分 = 命中数优先、Σ(1/DF) 破平、INDEX 行序兜底；matchByRouting 内部排序后输出。
⑥ **回归与基线**：knowledge 面 20 个测试文件全绿、四类探针转 GREEN、基线更新。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `matchByRouting(indexDir, taskContext, opts?)`：新增 opts.includeResolved（默认 false）；返回新增**条件式** `routeHits` 数组（{file, anchor, category, keywords}）；`entries` 语义收紧为「手工条目」；`matched` 为 entries/routeHits/decisionHits 三者并集；其余四键（json/report）结构不变。
- `matchKnowledge(indexDir, taskContext, opts?)` / `matchKnowledgeHybrid(indexDir, taskContext, opts)`：透传 opts 到 matchByRouting。
- `buildSearchMatches(result, knowledgeDir, limit, query)`：新增 query 参数；行对象新增 `channel`；score 语义改为命中标签数。
- `cmdSearch`：新增 `--include-resolved` flag；输出新增 resolvedFiltered/resolvedNote（仿 parkingFiltered）。
- `keywordMatchesContext` 已导出（变更 0）；`asciiWordHit`/`queryShingles` 行为收紧（`_` 词字符 + 拆分片段）。
- 消费面（flow.js / run/prompt.js / stages/execute.js / run/complete.js）：知识段渲染条件收紧为 entries 非空；新增 routeHits 指针行（按需 Read，不注入正文）。无对外端点变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。DF 在单次 INDEX 解析快照上统计，与事件顺序无关；排序 tie-break 固定 INDEX 行序，重复运行结果确定。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

本变更全部为只读检索逻辑，无新增写点；baseline 更新由变更 0 的原子写承载。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。routeHits 条件式新增、entries 语义收紧为软切换（旧消费者仍能工作，只是看不到路由行）；includeResolved 默认 false 全仓一致。已修复判定 fail-open（解析不到不过滤），不会因知识文件形态异常把知识藏掉。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。所有逻辑以传入 indexDir 为界，无跨仓缓存；DF 仅作用于本次解析的 INDEX。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① entries 收紧后「只命中路由行」成为常见形态——已用条件式 routeHits + 指针行 + 空段收紧覆盖，需测试锁；② 遥测 matchedFiles 口径变化（decisions/fr 不再进 entries）——保留 routeHits 进遥测或单列字段，避免 knowledge-stats 把 decisions/fr 误标 neverHit；③ 测试面广（20 个文件），契约更新可能连锁——按六步顺序逐步验证。

**放弃的方案**：① `-` 当词字符——审查实测损失 568 个 kebab-case 命中对、0 增益；② 全局剔除 fr/decisions 路由行——会打掉 implemented 决策在 search/prompt/execute 的可见性（这些面只消费 entries，决策只渲染 rejected/死路）；③ 读正文 heading 判定已修复——锚点→heading 归一脆弱、fail-open 后 probe 仍红；④ 只认绿色标记——平台实测会误杀 4 条现行知识；⑤ 把 scope-manual 塞进本变更——手工条目正文建边是独立功能，变更 2 另案。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-match.js | score/词边界/词片/已修复过滤/routeHits/DF 排序 |
| 修改 | src/knowledge-vector.js | opts 透传 includeResolved |
| 修改 | src/stages/knowledge.js | buildSearchMatches query/channel；--include-resolved；resolvedFiltered |
| 修改 | src/flow.js | 知识段 entries-only + routeHits 指针 + 空段收紧 |
| 修改 | src/run/prompt.js | 同上（buildKnowledgeInjection 面） |
| 修改 | src/stages/execute.js | Wave 注入面同上 |
| 修改 | src/run/complete.js | 知识条目 entries + routeHits 指针 |
| 修改 | src/knowledge-stats.js | matchedFiles 口径兼容（routeHits 进统计或单列） |
| 新增 | test/knowledge-rank-denoise.test.mjs | 六步单测（score/词边界/已修复/routeHits/DF） |
| 修改 | test/knowledge-tier-denoise.test.mjs 等既有断言 | 契约更新（entries 不含路由行） |
| 修改 | eval/knowledge/baseline.json | 新基线（version=1） |
