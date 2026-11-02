---
author: flow-machine-draft
created_at: 2026-11-02T08:04:03.235Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-engine-tail

- [x] task-01: 向量融合对称——knowledge-vector.js 抽 fuseBaseWithScope（graphPathCandidates 规整、catch 返回 base）、路由/向量两分支共用；knowledge-fusion.test.mjs 加向量用例（mock fetch + 局仓 local.yaml + env on，未修复必红）并跑绿
- [x] task-02: 遥测 scope 单列——flow.js/run/prompt.js/stages/execute.js 三处新增 scopeMatchedFiles（展示子集 top3+top3 去重）、mentionedFiles 展示集合构造；knowledge-stats 文档注记；thin-inject-telemetry 两形态断言跑绿
- [x] task-03: 图卫生——sectionFilePaths 含 / 过滤（只 section 级）+ GRAPH_CACHE_VERSION 4；删除 scopeRecall frCount/frs 与测试字面量、注释诚实化；memo 注记；knowledge-graph 测试正反例跑绿
- [x] task-04: 数据规划注记——eval/knowledge/README.md 记「flow 形态带 scope + fusion 升主刻度 + 非标题复述查询」
- [x] task-05: 回归与交付——145 测试全绿 + lint 绿 + eval 五面不回归 + 六探针 GREEN；向量路径 eval 不覆盖（VECTOR=off）写入 verify-result 交付说明
