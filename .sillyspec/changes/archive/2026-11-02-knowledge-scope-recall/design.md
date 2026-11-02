---
author: flow-machine-draft
created_at: 2026-11-02T05:17:16.207Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-scope-recall

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按子代理修正版分三段实施：

**A 段（手工条目可达）**：`src/knowledge-graph.js` 的 INDEX entry 建节点时补 `category/anchor/display` 属性；新增 section 级 doc-refs 建边——对 INDEX 手工条目文档按 `##` 标题切 section，用 `normalizeAnchorForCompare`（stages/knowledge.js 已有，前缀容忍长度≥6）匹配 entry.anchor，只对匹配 section 的文本跑 `extractFilePaths` 建 entry→file 边，强度保持 medium（不动 graphPath/impact 语义）。`scopeRecall` 显式收集 doc-refs 命中的 entry 节点；`buildScopeRecallResult` 改为 decisions 与 entries 都空才 null（修 entries-only 短路）。`GRAPH_CACHE_VERSION` 1→2，fingerprint 增加 INDEX 引用的手工文档 stat（INDEX 解析一次，逐文件 statSignature）——手工文档编辑必须触发重建。

**B 段（两跳防复潮）**：`scopeRecall` 增加反向两跳——scope file 命中 `deliverables` 边（change→file 方向反查）得到 change 集，再经 `from-change`（decision→change 反查）得到决策集，**只收 rejected/deathPath**（全量 144 决策里 139 是 implemented 模板底稿，灌入即噪声）。排序：rejected/deathPath 优先 → 直连锚点（direct）优先于两跳 → 变更名日期降序（从 `h.change` 的 `YYYY-MM-DD-` 前缀解析，缺失排最后）→ id。每条命中带 `score`（direct=2 / two-hop=1）——flow/complete/prompt 的 `rejected && score>0` 过滤器依赖它，否则两跳 rejected 排序再对也不会渲染。引擎 decision cap 保持 20（产品渲染端本来就取前 5）。

**C 段（数据）**：平台 decisions 补 8~10 条（从 27 条非 parking rejected 选，排除同文件重复 id，query 统一「域关键词+标题」）；scope 面两侧各补 5~8 条（平台用 `frontend/src/lib/fetch-sse.ts` → conventions SSE 锚点、`backend/app/core/auth_deps.py` → testing-gotchas、`backend/app/main.py` → known-issues audit_hooks 三个真实 doc-refs 路径；本仓用 test/flag-contract.test.mjs 的 known-issues doc-ref 与 direct anchor/两跳 rejected 案例）。`validateOrganicCase` 加 scope_files 类型校验；`validateLabels` 加 scope_files 存在性、anchor heading 归一化校验与 scope-unreachable 静态警告。评测输出按 frozen/added 子集单列 scope 指标。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `buildKnowledgeGraph(specRoot)`：内部新增 doc-refs 边与 entry 节点属性；`GRAPH_CACHE_VERSION` 2（旧缓存自动失效重建）。
- `scopeRecall(graph, scopeFiles)`：返回 entries 从「决策合成」扩展为「doc-refs 命中的手工条目」；decisionHits 只增 rejected/deathPath 两跳与 score 字段；返回结构 `{decisionHits, entries, frCount, scopeSize}` 不变。
- `buildScopeRecallResult(recall)`：decisions 与 entries 都空才 null（原为 decisions 空即 null）。
- 无新增 CLI 子命令/flag；flow/complete/prompt 消费面只受益于 score 与 entries（无需改动，防潮过滤器条件不变）。
- 数据集：organic.jsonl 新增 case 与 `subset` 字段（scope 面 frozen/added）；validateLabels 输出扩展。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。section 切分与 anchor 匹配是纯函数式文本处理；两跳边集来自单次图谱快照；排序 tie-break 用变更名日期与 id，确定性。INDEX/手工文档的 stat 指纹变化会整图重建，无增量乱序问题。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

本变更只读知识文件与图谱缓存；缓存写沿 writeHotCache 原子写（既有机制）。无新增写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。缓存版本升 2 后旧缓存不命中（自动重建）；entries-only 非 null 是放宽（不会让调用方拿到更少信息）；scope hit 增加 score/entries 是加法字段。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。图谱与 scopeRecall 以传入 specRoot/indexDir 为界；doc-refs 悬空过滤沿用 graphDangling 口径（裸文件名不判、跨仓前缀单列）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① section 切分对无 `##` 标题的文档（整篇一个 section）退化为全文档粒度——仅对该形态文档生效，且 INDEX 条目通常有锚点，可接受；② 两跳的 rejected 中部分位于停车场文件——两跳只按状态过滤不看文件，停车场条目仍可能从两跳进来（它们是真实历史否决，保留有价值，且展示面已有变更名限定）；③ 本仓真实语料 doc-refs 命中面小（实测仅 1 条本地路径）——探针与新增 case 主要靠 fixture 与跨仓路径，验收口径已按子集单列。

**放弃的方案**：① 全文档粒度 doc-refs——实测 1356 条边、单路径最多 65 条目，entry cap 3 变抽签；② doc-refs 改 strong——破坏 graphPath 契约（已有强边不可达测试）并污染 impact 闭包；③ 两跳全量 decisions + FR——144 决策/644 FR 无可用消费面，recency 排序前 11 全是模板底稿；④ 纯 recency 替代 rejected 先验——热文件实测退化；⑤ 引擎 cap 20→5——与 FR-03 的 3/20 契约和 raw/rendered 归因冲突（5 是渲染端 cap）；⑥ organic 到每仓 50 并入本变更——样本组成变化会与代码效果混淆，推迟独立数据变更。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | entry 属性、section doc-refs、scopeRecall 两跳/排序/score、缓存版本与指纹 |
| 修改 | eval/knowledge/datasets/organic.jsonl | 平台 decisions 8~10 条 + scope 两侧 case + subset 字段 |
| 修改 | eval/knowledge/lib/dataset.mjs | scope_files 校验、anchor heading 归一化、scope-unreachable |
| 修改 | eval/knowledge/lib/faces.mjs | scope 面按 frozen/added 子集统计 |
| 修改 | eval/knowledge/run.mjs | 子集指标输出 |
| 修改 | eval/knowledge/fixtures/index.mjs | scope-manual 增 entries-only 正例与 section 负例 |
| 修改 | eval/knowledge/baseline.json | 新基线（version=1） |
| 修改 | test/knowledge-graph.test.mjs / test/knowledge-hotpath-cache.test.mjs / test/eval-knowledge-*.test.mjs | 契约测试 |
