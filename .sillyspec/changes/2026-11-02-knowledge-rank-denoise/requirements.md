---
author: flow-machine-draft
created_at: 2026-11-02T04:02:08.616Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-rank-denoise

## 功能需求

### FR-01: score 契约：buildSearchMatches 接收 query、score=实际命中标签数，合成条目输出 channel 字段；probe score-contract 转 GREEN

`buildSearchMatches` 必须接收 query，score 必须等于该条目的 tags 中实际命中 query 的标签数（复用 keywordMatchesContext 同一判定），禁止使用关键词表长度冒充评分；合成条目（词片回退/scope/向量通道）必须输出 channel 字段标明来源，channel 与 score 语义不混淆。

#### 场景：表长不再冒充命中数

Given 某路由行有 4 个关键词而 query 只命中其中 1 个
When 调 search 视图
Then score 必须为 1 且 matchedTags 长度为 1

#### 场景：合成条目 channel

Given 词片回退返回的合成条目 keywords 为查询词片
When 输出 search 视图
Then 该行必须带 channel=fallback，score 按命中词片数计算

### FR-02: 词边界：两处统一 _ 为词字符、- 为边界（[^a-z0-9_]）；shingle 抽取保留 _- 整词并额外产出拆分片段；kebab-case 正反例单测（worktree 命中 2026-*-worktree-*、不命中 worktree_apply）

`keywordMatchesContext` 与 `asciiWordHit` 的词边界字符类必须统一为 `[^a-z0-9_]`（下划线是词字符、连字符是边界）；shingle 抽取必须保留 `_`/`-` 整词并额外产出按 `[_-]` 拆分的片段。禁止把 `-` 当词字符（会切断 kebab-case 变更名匹配）。

#### 场景：下划线不越界

Given 关键词 node 与上下文含 node_modules
When 匹配
Then 必须不命中；上下文含独立 node 时必须命中

#### 场景：kebab-case 仍可命中

Given 关键词 worktree 与上下文 2026-05-29-worktree-isolation
When 匹配
Then 必须命中；上下文 worktree_apply 时必须不命中

#### 场景：snake_case 词片拆分

Given 查询含 worktree_apply
When 抽取词片
Then 必须同时含 worktree_apply 与 worktree、apply 拆分片段

### FR-03: 已修复过滤：known-issues 分类 + INDEX display/anchor 显式词（已修复/已解决/已退役）判定，fail-open；includeResolved 贯穿 search；resolvedFiltered 披露；probe fixed-entries 转 GREEN

默认检索必须排除 known-issues 分类中 INDEX display/anchor 含「已修复/已解决/已退役」显式词的条目；判定必须零正文解析依赖（不读 heading），解析不到时 fail-open（不过滤）。`includeResolved` 选项必须从 cmdSearch（--include-resolved）贯穿到 matchByRouting；被过滤条目必须在输出 resolvedFiltered 披露。

#### 场景：默认排除与显式包含

Given 一条 INDEX 行 display 含「已修复」
When 默认 query 命中该行
Then entries 必须不含它且 resolvedFiltered 含该文件；带 --include-resolved 时必须返回

#### 场景：非已修复不误杀

Given known-issues 中标题含 🟢 但 display/anchor 无显式词（现行事实/债务）
When 默认 query 命中
Then 必须保留（绿色标记不是唯一键）

### FR-04: routeHits 分离：entries 只留手工条目、新增条件式 routeHits 键、decisionHits 内部全量保留；search/prompt/execute/flow/complete 不丢 routeHits 可见性（指针行）；空 entries 不渲染空知识段；probe route-rows 转 GREEN

面向人的 entries 必须只含手工知识条目（禁止含 fr/、decisions/ 路由行）；matchByRouting 必须条件式新增 routeHits 键（仅当命中路由行时出现，防顶层键断言回归），decisionHits 必须从内部全量 matched 继续解析；flow/prompt/execute/complete/search 消费面必须保留 routeHits 指针行，禁止静默丢失 implemented 决策可见性；entries 为空时必须不渲染空知识段。

#### 场景：entries 纯净且决策通道不受影响

Given 查询同时命中手工条目与 decisions 路由行
When 调 matchByRouting
Then entries 只含手工条目、routeHits 含 decisions 文件、decisionHits 非空

#### 场景：空 entries 不渲染空段

Given 查询只命中 fr/decisions 路由行
When 渲染知识注入段
Then 必须不出段头空段（只出 routeHits 指针行或整段省略）

### FR-05: DF 排序：entries 可展示语料为分母、Σ(1/DF) 或命中数优先+DF 破平、合成单测锁泛词不主导；organic entries/search 对比基线并单列候选集缩小影响

entries 排序必须按相关度（命中数优先 + DF 破平，或 Σ(1/DF)），DF 必须以 entries 可展示语料（排除 fr/decisions 路由行）为分母计算；同分必须按 INDEX 行序稳定排序。必须用合成单测锁住「高频泛词不主导」；organic 对比必须单列候选集缩小对指标的影响。

#### 场景：泛词不主导

Given 5 条路由行含泛词 sillyspec、1 条含长尾词（两条都命中 query）
When 排序
Then 长尾词条目必须排在泛词条目之前

#### 场景：确定性

Given 两条条目同分
When 重复运行
Then 顺序必须一致（INDEX 行序 tie-break）

### FR-06: 回归：knowledge 面 20 个测试文件全绿；eval 基线更新（version=1）；scope-manual 记录为变更 2 范围

本变更必须使 knowledge 面既有测试全绿（含路由行/注入/统计/生命周期断言的必要契约更新），eval 四类目标探针（score-contract/word-boundary/route-rows/fixed-entries）必须转 GREEN 且 linkage 保持 GREEN；scope-manual 必须记录为变更 2 范围并保留 RED；baseline 必须更新且 version 保持 1。

#### 场景：探针与基线

Given 变更完成
When 跑 eval --smoke 与全量
Then 四类转 GREEN、scope-manual 仍 RED（范围外留档）、baseline version=1

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-rank-denoise.test.mjs「score 契约与 channel」
FR-02: test/knowledge-rank-denoise.test.mjs「词边界与词片拆分」
FR-03: test/knowledge-rank-denoise.test.mjs「已修复过滤与 includeResolved」
FR-04: test/knowledge-tier-denoise.test.mjs「路由行移出 entries 且 decisionHits 保留」+ test/knowledge-rank-denoise.test.mjs「routeHits 分离」
FR-05: test/knowledge-rank-denoise.test.mjs「DF 泛词不主导」
FR-06: test/eval-knowledge-probes.test.mjs「四类探针转绿」+ test/eval-knowledge-runner.test.mjs「基线指标与 details」
