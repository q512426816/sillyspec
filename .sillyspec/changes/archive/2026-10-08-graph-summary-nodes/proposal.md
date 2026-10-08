---
author: flow-machine-draft
created_at: 2026-10-08T09:16:11.270Z
---
# 提案书（Proposal）— 2026-10-08-graph-summary-nodes

## 动机

任务原话转写：平台仓 2026-10-08-platform-knowledge-graph 阶段三需要图引擎两个聚合/检索子命令（跨仓依赖契约）：knowledge graph summary --json 输出全图统计聚合（nodes/edges/byType/byEdge + doctor 六检查同源四计数 orphans/module_doc_gaps/changelog_danglings/dangling_refs + clusters 簇代表[簇 key=节点类型×域，域逐类型取值：fr=attrs.domain、decision=attrs.domain、file=module-files 边反查、module=自身id、doc=attrs.kind、entry=attrs.file、test=test-binding 边反查 fr domain、project/change/ql=id，缺省 _unmapped/_tests]；representatives=簇内度数 top-5，度数=全边入+出]）；knowledge graph nodes --search <模糊> --json 输出节点 id/label 不区分大小写包含匹配（默认限 20）。

成功标准：
- sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）
- clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）
- sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）
- nodes --search 空串/缺省返回 usage 错误不崩
- 现有五子命令回归全绿；新增两子命令进 usage 行
- lint/test 与仓内惯例一致

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）
2. clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）
3. sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）
4. nodes --search 空串/缺省返回 usage 错误不崩
5. 现有五子命令回归全绿；新增两子命令进 usage 行
6. lint/test 与仓内惯例一致

## 成功标准（可验证）

1. sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）
2. clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）
3. sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）
4. nodes --search 空串/缺省返回 usage 错误不崩
5. 现有五子命令回归全绿；新增两子命令进 usage 行
6. lint/test 与仓内惯例一致
