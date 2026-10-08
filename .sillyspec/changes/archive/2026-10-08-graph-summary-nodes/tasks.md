---
author: flow-machine-draft
created_at: 2026-10-08T09:16:11.270Z
---
# 任务注册表（Tasks）— 2026-10-08-graph-summary-nodes

- [x] task-01: sillyspec knowledge graph summary --json 输出 ok:true + stats 全字段（本仓真实数据：nodes≈4628/edges≈8173 量级，byType/byEdge 分布与 doctor 图完整性检查通过的 nodeCount/edgeCount 一致，四计数与 doctor 六检查同源同值）
- [x] task-02: clusters 每簇带 key/label/count/representatives（≤5 个 GraphNodeRef），FR 最大簇的 representatives 是度数最高节点（可用图查询验证其真实邻边多）
- [x] task-03: sillyspec knowledge graph nodes --search knowledge --json 返回 id/label 含 knowledge 的节点列表（count≤20），--limit 可调（钳 1-50）
- [x] task-04: nodes --search 空串/缺省返回 usage 错误不崩
- [x] task-05: 现有五子命令回归全绿；新增两子命令进 usage 行
- [x] task-06: lint/test 与仓内惯例一致
