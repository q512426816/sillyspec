---
author: flow-machine-draft
created_at: 2026-10-08T09:16:11.270Z
---
# 需求规格（Requirements）— 2026-10-08-graph-summary-nodes

## 功能需求

### FR-01: sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）

- `knowledge graph summary --json` 必须输出 ok:true 且 stats 含 nodes/edges/byType/byEdge/orphans/module_doc_gaps/changelog_danglings/dangling_refs 全字段；orphans 与 dangling_refs 必须与 graphOrphans/graphDangling 逐值同源（doctor 六检查同口径），禁止另立计数实现。

#### 场景：主路径

Given buildFixture 九面全形态 specRoot / When graphSummary(g) / Then nodes/edges 等于 g.stats.nodeCount/edgeCount，byType/byEdge 深等值，四计数与图函数一致。

### FR-02: clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）

- 每簇必须带 key（type:域）/label/count/representatives，representatives 禁止超过 5 个且必须为图中真实节点（度数=全边入+出合计 top，同度按 id 字典序稳序）；全部簇 count 之和必须等于节点总数（守恒）。

#### 场景：主路径

Given fixture 含 fr:core-engine 簇（belongs-module 域）与 decision:core-engine 簇（域文件名） / When summary / Then 两簇在场、代表节点全部 g.nodes.has 命中、簇计数和=总节点数、簇按 count 降序。

### FR-03: sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）

- nodes 搜索必须对 id 与 label 做不区分大小写的包含匹配，--limit 必须钳制在 1-50（缺省 20，非整数回退 20），返回节点形状必须为 {id,type,label}。

#### 场景：主路径

Given fixture / When graphNodesSearch(g, 'FR-CORE-ENGINE-001', 10) 与 label 中文包含「第一个需求」/ Then 两者都命中 FR-core-engine-001；limit=0 时至多返回 1 条。

### FR-04: nodes --search 空串/缺省返回 usage 错误不崩

- --search 缺省或空串时必须返回 ok:false + error.code=search_required（附 usage），禁止抛未捕获异常；纯函数侧空串必须返回 {count:0, nodes:[]}。

#### 场景：主路径

Given fixture / When cmdKnowledgeGraph(root, ['nodes']) / Then ok:false 且 error.code==='search_required'；graphNodesSearch(g,'',10) 深等值 {count:0,nodes:[]}。

### FR-05: 现有五子命令回归全绿；新增两子命令进 usage 行

- 本变更禁止改变既有五子命令（neighbors/path/impact/orphans/dangling）的签名与输出形状；GRAPH_USAGE 与 stages/knowledge.js available 列表必须收编 summary/nodes/graph。

#### 场景：主路径

Given 既有 ④CLI 分发用例 / When 回归 / Then 全绿且 usage 文案含七子命令。

### FR-06: lint/test 与仓内惯例一致

- 必须通过 node test/check-syntax.mjs（913 文件零未引用导出）与 node --test test/knowledge-graph.test.mjs；新增用例必须沿 fixture+纯函数断言惯例（⑧⑨ 编号续接）。

#### 场景：主路径

Given 仓内 lint/test 命令 / When 跑 / Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」
FR-02: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」
FR-03: test/knowledge-graph.test.mjs「⑨nodes 搜索 + CLI 分发 summary/nodes：包含匹配/大小写/limit 钳/usage 错」
FR-04: test/knowledge-graph.test.mjs「⑨nodes 搜索 + CLI 分发 summary/nodes：包含匹配/大小写/limit 钳/usage 错」
FR-05: test/knowledge-graph.test.mjs「④CLI 分发：knowledge graph 子命令 --json/--edges 热测」
FR-06: test/knowledge-graph.test.mjs「⑧summary 聚合 + ⑨nodes 搜索」（lint 门由 flow done 实测子步覆盖 test/check-syntax.mjs）
