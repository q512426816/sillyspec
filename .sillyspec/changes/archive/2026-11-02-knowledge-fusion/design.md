---
author: flow-machine-draft
created_at: 2026-11-02T06:16:10.324Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-fusion

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按子代理方案审查的修正版实现（3a 核心融合 + 3b 键统一）：

**核心融合**：新增 `fuseScopeRecall(base, recall)` 纯函数（knowledge-graph.js，graph 已 import match 方向正确）——**只追加不重排**：路由结果 `decisionHits/entries` 原对象原序不动，scope 独有决策入 `scopeDecisionHits`（键 `file#id#change` 去重、via=direct/two-hop）、scope 独有手工条目入 `scopeEntries`（键 `file#anchor`、cap 3）；不做跨通道 score 排序；过滤 ghost 与缺 file/id 的畸形 hit；scope 空/零命中返回 base 原对象（deepEqual）。`matchKnowledgeHybrid` 在路由命中且 scopeFiles 在场时（动态 import graph）融合，失败 `return base`；路由命中仍不跑平台向量。新增同步入口 `matchKnowledgeWithScope(indexDir, query, opts)`（`matchKnowledge` 路由/词片 + 融合），供 execute/Wave 的同步注入路径使用——不改 `matchKnowledge` 默认语义、不把 buildKnowledgeInjection 改 async。

**scopeRecall 修正**：ghost 决策节点（`attrs.ghost` 或 `!attrs.hit.file/id`）在 pushHit 前过滤——真实库已复现 `{file:undefined,id:undefined}` 畸形 hit。

**展示**：flow 的 rejected 渲染保持路由 top-5，新增 scope 独立小节（≤3 条，标注触达文件来源）；complete 的 knowledge-gate 同款；`renderKnowledgeInjectSection` 与 execute 孪生增加 scopeEntries 指针行（`📚 触达文件关联手工条目`），格式锁测试同步。

**键来源**：execute step 用 `deliverableFilesFromDesignText`（fr-index 已有）；Wave 用 task 卡 `target_files`，缺失时过滤 `allowed_paths` 的精确文件项；quick 仅 `guard.allowedFiles`；`{DECISION_HITS}` 与 cmdSearch 不传并注释理由。新增 `graphPathCandidates(files)` 键规整（去 glob/目录前缀/非文件形态，POSIX 归一）——不猜不造键。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 `fuseScopeRecall(base, recall)`（knowledge-graph.js 导出）：返回 base 或 `{...base, scopeDecisionHits, scopeEntries, scopeFused}`。
- 新增 `matchKnowledgeWithScope(indexDir, query, opts)`（knowledge-graph.js 导出）：同步融合入口；opts.scopeFiles/includeResolved。
- `matchKnowledgeHybrid`：路由命中 + scopeFiles 时调用融合；未命中路径顺序不变（向量→scope→词片）；失败返回路由结果。
- `scopeRecall`：返回值结构不变，ghost/畸形 hit 被过滤（行为收紧）。
- `matchKnowledge`：签名与默认行为不变（不融合）。
- `buildKnowledgeInjection`：新增可选 `scopeFiles` 参数（同步，走 matchKnowledgeWithScope）；不传时行为与旧实现逐字节等价。
- flow/complete 渲染：新增 scope 独立小节/指针行（加法输出）。
- 无 CLI flag 变化（cmdSearch --scope 不做）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。融合是纯函数式合并，顺序由 base 与 recall 的既有确定性顺序决定；scopeRecall 的排序含变更名日期 tie-break；键规整是纯字符串处理。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

本变更只读知识/图谱；图缓存沿 writeHotCache 原子写。无新增写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。融合是加法字段（旧消费者忽略新字段）；scope 构建失败 fail-soft 返回路由结果；图缓存版本不升（scopeRecall 行为收紧只影响新图，缓存旧图可能仍含 ghost——融合侧过滤兜底，无需强制重建）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。indexDir/specRoot 决定图与知识面；scopeFiles 由各消费面自己的机器键传入，无跨仓共享。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① 热文件 scope 否决（本仓 src/flow.js 实测 15 条 rejected/deathPath，多为模板底稿）在 flow 反复出现——用独立小节 + ≤3 + 触达文件来源标注压噪，且不挤占路由 top-5；② 每消费面 45ms 图读取成本——路由命中才构建 + 进程级 memo（按 specRoot 缓存）；③ task 卡键形态杂（glob/目录）——graphPathCandidates 统一过滤，宁空不造。

**放弃的方案**：① 合并进 decisionHits 后统一 score 排序——跨通道尺度不可比（路由 Jaccard 0~1 vs scope 2/1），会让 scope 直连压掉查询相关条目；② 合并 entries 后 cap 3——路由 raw 被截断会回归 eval 与既有契约（cap 留渲染层）；③ buildKnowledgeInjection 改 async——连锁破既有同步测试与 Wave 孪生；④ cmdSearch --scope / {DECISION_HITS} 传 scope——无机器键，编造键违反 D-004；⑤ 路由命中后跑向量——破坏零网络约束与既有测试；⑥ 条件式「仅路由无 rejected 时跑 scope」——会漏「路由有 rejected 但热文件另有否决」形态且使 s-scope-03 类两跳期望消失。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | fuseScopeRecall、matchKnowledgeWithScope、graphPathCandidates、scopeRecall ghost 过滤、图 memo |
| 修改 | src/knowledge-vector.js | 路由命中的 scope 融合分支（fail-soft） |
| 修改 | src/run/prompt.js | buildKnowledgeInjection 加 scopeFiles（同步入口）、scope 指针行、execute step 键 |
| 修改 | src/stages/execute.js | Wave 同步入口 + task 卡键 + 孪生 scope 指针行 |
| 修改 | src/flow.js | rejected 展示 = 路由 top-5 + scope 独立小节 |
| 修改 | src/run/complete.js | scope 否决独立小节 |
| 新增 | test/knowledge-fusion.test.mjs | RED-first 融合用例全组 |
| 修改 | test/knowledge-inject.test.mjs | 孪生格式锁同步 |
| 修改 | eval/knowledge/datasets/organic.jsonl | subset='fusion' 的 entries/decisions case |
| 修改 | eval/knowledge/lib/faces.mjs + run.mjs | fusion 子集单列（entries/decisions 面按 subset 分组） |
