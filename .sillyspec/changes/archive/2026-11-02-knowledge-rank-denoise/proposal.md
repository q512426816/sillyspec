---
author: flow-machine-draft
created_at: 2026-11-02T04:02:08.616Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-rank-denoise

## 动机

任务原话转写：知识检索排序与降噪：四类缺陷转绿

知识库检索存在已实证的排序与降噪缺陷，评测面（变更 0）已就位：score 契约违反（关键词表长冒充命中数）、词边界把 _ 当边界（node 命中 node_modules）、INDEX 的 fr/decisions 路由行混入面向人的 entries、known-issues 已修复条目仍被注入、entries 无相关度排序。子代理方案审查修正三处：- 必须保持词边界（否则打断 kebab-case 变更名匹配，实测损失 568 命中对）；路由行不能全局剔除（会打掉 implemented 决策在 search/prompt/execute 的可见性），改为独立 routeHits；scope-manual 属变更 2 另案。

成功标准：
- score 契约：buildSearchMatches 接收 query、score=实际命中标签数，合成条目输出 channel 字段；probe score-contract 转 GREEN
- 词边界：两处统一 _ 为词字符、- 为边界（[^a-z0-9_]）；shingle 抽取保留 _- 整词并额外产出拆分片段；kebab-case 正反例单测（worktree 命中 2026-*-worktree-*、不命中 worktree_apply）
- 已修复过滤：known-issues 分类 + INDEX display/anchor 显式词（已修复/已解决/已退役）判定，fail-open；includeResolved 贯穿 search；resolvedFiltered 披露；probe fixed-entries 转 GREEN
- routeHits 分离：entries 只留手工条目、新增条件式 routeHits 键、decisionHits 内部全量保留；search/prompt/execute/flow/complete 不丢 routeHits 可见性（指针行）；空 entries 不渲染空知识段；probe route-rows 转 GREEN
- DF 排序：entries 可展示语料为分母、Σ(1/DF) 或命中数优先+DF 破平、合成单测锁泛词不主导；organic entries/search 对比基线并单列候选集缩小影响
- 回归：knowledge 面 20 个测试文件全绿；eval 基线更新（version=1）；scope-manual 记录为变更 2 范围

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. score 契约：buildSearchMatches 接收 query、score=实际命中标签数，合成条目输出 channel 字段；probe score-contract 转 GREEN
2. 词边界：两处统一 _ 为词字符、- 为边界（[^a-z0-9_]）；shingle 抽取保留 _- 整词并额外产出拆分片段；kebab-case 正反例单测（worktree 命中 2026-*-worktree-*、不命中 worktree_apply）
3. 已修复过滤：known-issues 分类 + INDEX display/anchor 显式词（已修复/已解决/已退役）判定，fail-open；includeResolved 贯穿 search；resolvedFiltered 披露；probe fixed-entries 转 GREEN
4. routeHits 分离：entries 只留手工条目、新增条件式 routeHits 键、decisionHits 内部全量保留；search/prompt/execute/flow/complete 不丢 routeHits 可见性（指针行）；空 entries 不渲染空知识段；probe route-rows 转 GREEN
5. DF 排序：entries 可展示语料为分母、Σ(1/DF) 或命中数优先+DF 破平、合成单测锁泛词不主导；organic entries/search 对比基线并单列候选集缩小影响
6. 回归：knowledge 面 20 个测试文件全绿；eval 基线更新（version=1）；scope-manual 记录为变更 2 范围

## 成功标准（可验证）

1. score 契约：buildSearchMatches 接收 query、score=实际命中标签数，合成条目输出 channel 字段；probe score-contract 转 GREEN
2. 词边界：两处统一 _ 为词字符、- 为边界（[^a-z0-9_]）；shingle 抽取保留 _- 整词并额外产出拆分片段；kebab-case 正反例单测（worktree 命中 2026-*-worktree-*、不命中 worktree_apply）
3. 已修复过滤：known-issues 分类 + INDEX display/anchor 显式词（已修复/已解决/已退役）判定，fail-open；includeResolved 贯穿 search；resolvedFiltered 披露；probe fixed-entries 转 GREEN
4. routeHits 分离：entries 只留手工条目、新增条件式 routeHits 键、decisionHits 内部全量保留；search/prompt/execute/flow/complete 不丢 routeHits 可见性（指针行）；空 entries 不渲染空知识段；probe route-rows 转 GREEN
5. DF 排序：entries 可展示语料为分母、Σ(1/DF) 或命中数优先+DF 破平、合成单测锁泛词不主导；organic entries/search 对比基线并单列候选集缩小影响
6. 回归：knowledge 面 20 个测试文件全绿；eval 基线更新（version=1）；scope-manual 记录为变更 2 范围
