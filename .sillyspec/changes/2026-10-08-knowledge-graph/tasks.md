---
author: t
created_at: 2026-10-08 14:20:00
---
# 任务清单（Tasks）— 2026-10-08-knowledge-graph

- [x] task-01: 图引擎解析层——NEW:src/knowledge-graph.js 实现 buildKnowledgeGraph(specRoot)：聚合既有 parser（parseKnowledgeIndex/parseDecisionEntries import 复用 + fr/测试绑定/模块图/changelog 域内解析），本体 10 节点 16 边三档强度，决策去重键 file+id+change，fr 版本链走 superseded_by/取代链 物化形态，changelog 三态行；验证：test/knowledge-graph.test.mjs 解析组用例（临时 fixture 目录全形态断言节点/边数与去重）
- [x] task-02: 查询面——neighbors/path/impact/orphans/dangling 查询 API（强边子集遍历、边型筛选、封顶）+ stages/knowledge.js 注册 graph 子命令（文本与 --json 双出口、--edges 筛选，classify 同款 lazy import）；验证：查询组用例 + CLI 子命令分发热测
- [x] task-03: 召回接线——knowledge-vector.js matchKnowledgeHybrid 增 opts.scopeFiles 参数与第三层遍历召回（向量后词片前；scopeRecall 沿强边 anchors 反查 + supersedes 一跳 + belongs-module，rejected/deathPath 优先 + frTitleOverlap 排序 + entries≤3/decisionHits≤20 封顶）；knowledge-match.js 补结果构造导出；验证：接线组用例（层序四层、scope 缺省与现状逐字节等价、封顶、保底命中）
- [x] task-04: 消费方透传——flow.js flowKnowledgeDigest 把 touched（filesOverride ∪ design 交付表）传入 hybrid scopeFiles；run/complete.js knowledge-gate 从 decisions.md「锚点：」字段提路径（anchorFilePaths 同款 token 提取）传入 scopeFiles 实现防复潮保底；验证：消费方用例（scope 传递、锚点提取、保底进场）
- [x] task-05: doctor 六检查项——doctor-diagnostics.js 增 graph-dangling-route / graph-doc-dangling-ref / graph-dangling-anchor / graph-orphan-entry / graph-module-doc-gap / graph-changelog-dangling（全 warning 不阻断，沿 apply_manifest_drift advisory 先例）；验证：doctor 组用例（命中/干净面两态）
- [x] task-06: 回归收口——package.json test:core 登记新测试文件；npm run test:core 全绿 + npm run lint 零新告警；requirements.md 测试绑定槽回填核对；设计偏差留痕（prompt.js 无变更面渲染点→零改动，锚点行解释）
