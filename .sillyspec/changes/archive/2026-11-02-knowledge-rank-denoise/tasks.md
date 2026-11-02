---
author: flow-machine-draft
created_at: 2026-11-02T04:02:08.616Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-rank-denoise

- [x] task-01: score 契约——buildSearchMatches 加 query 参数、score=匹配标签数、合成条目 channel；cmdSearch 与 eval engine 同步；新建 test/knowledge-rank-denoise.test.mjs 覆盖并跑绿（probe score-contract 转 GREEN）
- [x] task-02: 词边界——keywordMatchesContext 与 asciiWordHit 统一 [^a-z0-9_]；shingle 保留 _- 整词+拆分片段；kebab-case 正反例入 knowledge-rank-denoise.test.mjs 并跑绿（probe word-boundary 转 GREEN、knowledge-reason-overlap 不红）
- [x] task-03: 已修复过滤——known-issues 分类+display/anchor 显式词 fail-open 判定、includeResolved 贯穿 matchByRouting/matchKnowledge/matchKnowledgeHybrid/cmdSearch、resolvedFiltered 披露；测试覆盖默认排除/显式包含/非误杀（probe fixed-entries 转 GREEN）
- [x] task-04: routeHits 分离——entries 只留手工条目、条件式 routeHits、decisionHits 内部全量、matched 三通道并集；flow/prompt/execute/complete 加 routeHits 指针与空段收紧；更新受影响的既有断言（knowledge-tier-denoise 等）；测试跑绿（probe route-rows 转 GREEN）
- [x] task-05: DF 排序——entries 可展示语料分母、命中数优先+Σ(1/DF) 破平+INDEX 行序兜底；合成单测锁泛词不主导；跑 eval 对比基线并单列候选集缩小影响
- [x] task-06: 回归与基线——knowledge 面 20 个测试文件全绿、四类探针 GREEN 且 scope-manual 留 RED 范围记录、baseline 更新（version=1）、lint 绿
