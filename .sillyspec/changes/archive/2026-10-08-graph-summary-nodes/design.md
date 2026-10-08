---
author: flow-machine-draft
created_at: 2026-10-08T09:16:11.270Z
---
# 设计记录（Design Record）— 2026-10-08-graph-summary-nodes

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台仓（multi-agent-platform 2026-10-08-platform-knowledge-graph 阶段三）需要图引擎的两个聚合/检索面做 lite 总览与锚点补全的数据源。在既有 `src/knowledge-graph.js` 内新增两个纯函数（`graphSummary` 聚合、`graphNodesSearch` 过滤）并扩 `cmdKnowledgeGraph` 白名单加 `summary`/`nodes` 两子命令——图仍是解析时内存派生（不落盘不缓存，沿 2026-10-08-knowledge-graph D-003），summary 四计数直接复用 `graphOrphans`/`graphDangling` 与 doctor `knowledge_graph_integrity` 六检查同一段口径（一处定义两处消费，防口径漂移）。选「函数内聚扩展」而非新文件：与五查询共用建图/强度表/域 attrs，拆文件只会复制耦合。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

文件变更清单（自声明）：①`src/knowledge-graph.js`（新增 graphSummary/graphNodesSearch 两导出 + cmdKnowledgeGraph 白名单扩 summary/nodes + GRAPH_USAGE 更新——函数内聚扩展，既有五查询零改动）；②`test/knowledge-graph.test.mjs`（⑧⑨ 两用例 + import 扩展）；③`src/stages/knowledge.js`（仅 678 行 available 列表补 'graph' 项，路由 case 既有）。

新增导出：`graphSummary(graph, { existsFn, clustersLimit })` → `{nodes, edges, byType, byEdge, orphans, module_doc_gaps, changelog_danglings, dangling_refs, clusters:[{key,label,count,representatives(≤5 GraphNodeRef)}]}`；`graphNodesSearch(graph, search, limit)` → `{count, nodes:[{id,type,label}]}`（id/label 不区分大小写包含，limit 钳 1-50 默认 20）。CLI：`sillyspec knowledge graph summary [--clusters N] --json` 与 `sillyspec knowledge graph nodes --search <模糊> [--limit N] --json`；USAGE 行与 `stages/knowledge.js` available 列表同步收编。既有五子命令签名与输出零变化；`--clusters` 缺省 0=全量（真图 883 簇，平台侧传 50）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——图由静态 md/yaml 解析派生，无事件流；文件半写由既有解析器 fail-soft 容忍（②坏行同款）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用——纯只读聚合，不落盘；spec 树被并行变更写入时看到的是某一致快照的视图。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   不适用——单次 CLI 调用内存生灭；无会话/请求状态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——graph 按调用方传入的 specRoot（`<dir>/.sillyspec` 或 opts.specDir）构建，跨仓/多工作区天然隔离；跨仓锚点只计入 dangling_refs 计数不解析外仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：clusters 数量随域增长（真图 883 簇）撑爆平台 lite 画布——已由 `--clusters N` 截断旗标化解（消费方按需取 top-N，簇计数守恒不变）。放弃的方案：①CLI 侧默认截断 50——否，默认值是平台 UI 偏好不是引擎语义，全量才是可审计口径；②summary 落盘缓存——否，违反 D-003 图不落盘铁律且引入失效问题；③doctor 内调 summary 复用——已如此（同源口径互引，不复制实现）。死路提示：不要为「跨仓锚点单列计数」去解析 local.yaml 外仓（探测面无界，历史否决同型）。
