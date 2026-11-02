---
author: flow-machine-draft
created_at: 2026-11-02T05:17:16.207Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-scope-recall

- [x] task-01: A 段——knowledge-graph.js entry 节点补 category/anchor/display；section 级 doc-refs（normalizeAnchorForCompare 前缀容忍、medium 强度）；scopeRecall 收 doc-refs entry；buildScopeRecallResult entries-only 非 null；GRAPH_CACHE_VERSION 2 + fingerprint 含手工文档 stat；knowledge-graph 测试跑绿
- [x] task-02: B 段——反向两跳 deliverables→change→from-change 只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；hit 带 score（direct=2/two-hop=1）；cap 20 保持；测试跑绿
- [x] task-03: C 段数据——平台 decisions 8~10 条（非 parking rejected、排除重复 id、域关键词+标题配方）；scope 两侧各 5~8 条（平台 fetch-sse/auth_deps/main.py，本仓 flag-contract + direct/两跳）；validateLabels 扩展 scope_files 存在性与 heading 归一化校验、scope-unreachable 警告；dataset 测试跑绿
- [x] task-04: 探针——scope-manual 增 entries-only 正例与 section 隔离负例；六类探针全 GREEN（run.mjs --smoke）
- [x] task-05: 验收口径——scope 面按 frozen/added 子集单列（faces/run.mjs）；原 5 条 frozen 如实报告；旧 case 逐条 rank 不回归；eval 全量跑通
- [x] task-06: 回归与基线——knowledge 面全绿 + lint 绿 + baseline 更新 version=1 + doctor 悬空增量单列说明
