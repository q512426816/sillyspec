---
author: flow-machine-draft
created_at: 2026-11-02T06:16:10.324Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-fusion

## 功能需求

### FR-01: 结果契约：路由命中时融合只追加 scopeDecisionHits/scopeEntries（带 via provenance），不设 json.scope、不截断路由 raw 列表；scope 空/无命中时结果逐字段不变（deepEqual 保护）

路由命中且 scopeFiles 在场时，融合结果必须保持既有四键+decisionHits 与 entries 的原对象和原顺序，只追加 scopeDecisionHits（scope 独有决策，带 via direct/two-hop）与 scopeEntries（scope 独有手工条目）两个新字段；禁止设置 json.scope、禁止截断或重排路由 raw 列表；scope 为空或零命中时返回对象必须与路由结果逐字段 deepEqual。

#### 场景：无 scope 零变化

Given 调用方不传 scopeFiles
When 调 matchKnowledgeHybrid/matchKnowledgeWithScope
Then 返回结果与不融合实现逐字段 deepEqual（既有消费者零回归）

#### 场景：只追加不重排

Given 路由命中 5 条且 scope 命中 2 条独有决策
When 融合
Then decisionHits 保持原 5 条原序，scopeDecisionHits 含 2 条（via 标记），entries 原序不变

### FR-02: 合并算法：决策键 file#id#change、条目键 file#anchor；路由优先保留、scope 按 scopeRecall 原序追加；上限沿用 20/3；不做跨通道 score 排序；ghost/缺 file/id 的畸形命中过滤

合并必须按 file#id#change 去重决策、file#anchor 去重条目，重复时保留路由记录；scope 追加按 scopeRecall 原序，上限决策 20、条目 3；禁止跨通道按 score 数值排序（路由 Jaccard/scope 2 与 1/向量/词片尺度不可比）；必须过滤 ghost 决策与缺 file/id 的畸形命中。

#### 场景：跨变更同号

Given 同一 file#id 在路由与 scope 各出现一次但 change 不同
When 融合
Then 两条都保留（键含 change），路由条在 decisionHits、scope 条在 scopeDecisionHits

#### 场景：幽灵节点

Given scope 遍历经 supersedes 链到达 ghost 决策（无 attrs.hit）
When 融合
Then 该畸形条目必须被过滤，不得产出 file/id 缺失的 hit

### FR-03: 展示：flow/complete 的 rejected 渲染 = 路由 top-5 + scope 独立小节（至多 3 条，带触达文件来源）；execute/Wave 走新增同步融合入口 matchKnowledgeWithScope（fuseScopeRecall 纯函数 + graph 正向依赖），prompt/execute 孪生渲染格式锁同步

flow 与 complete 的 rejected 展示必须保持路由 top-5，由 scope 追加的否决以独立小节呈现（至多 3 条并标注触达文件来源），禁止把 scope 条目塞进同一 top-5 数字排序；execute step 与 Wave 注入必须走新增同步入口 matchKnowledgeWithScope（内部 fuseScopeRecall 纯函数），prompt/execute 孪生渲染与格式锁测试同步更新。

#### 场景：展示隔离

Given 路由已有 5 条 rejected 且 scope 有 3 条热文件否决
When flow 渲染
Then 前 5 条仍是路由条目，scope 3 条在独立「触达文件关联」小节

#### 场景：同步融合入口

Given buildKnowledgeInjection/Wave 传入 scopeFiles
When 调用同步入口
Then 段内出现 scope 手工条目指针行，且不传 scope 时与旧输出逐字节等价

### FR-04: 键来源：execute step 用 design 交付清单；Wave 用 task card target_files/过滤后的 allowed_paths；quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS} 与 cmdSearch 明确不传并写明理由；所有键规整为图内精确文件路径（目录前缀/glob 不传）

scopeFiles 必须来自机器键：execute step 用 design 交付清单、Wave 用 task 卡 target_files 或过滤后的 allowed_paths、quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS}（brainstorm Step1 无 decisions.md）与 cmdSearch（自由查询无文件集）必须明确不传并在代码注释/设计写明理由；所有键必须规整为图内精确文件路径，目录前缀与 glob 不传。

#### 场景：glob 不传

Given allowed_paths 含 `src/` 与 `src/**/*.js`
When 构造 scopeFiles
Then 两者都不进入（精确路径才传），实际传空则不分叉融合

### FR-05: 性能与降级：图构建进程级 memo 或写明 45ms/次预算；scope 构建失败原样返回路由结果（不掉词片回退）；路由命中零平台调用

融合路径必须在路由命中后才构建图（且可加进程级 memo）；scope 构建/遍历失败时必须原样返回路由结果，禁止落入词片回退替换结果；路由命中时禁止调用平台向量（零网络）。

#### 场景：图构建失败

Given 图构建抛错
When 路由命中 + scopeFiles 在场
Then 返回路由结果（deepEqual），不降级到词片层

### FR-06: 测试：RED-first 新增「路由命中 + scope 独有 rejected/手工条目/两跳」用例（禁用融合分支必红）、flow 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap/去重、零平台、fail-soft；回归全绿

测试必须先写失败用例再实现：覆盖路由命中 + scope 独有 rejected/手工条目/两跳、flowKnowledgeDigest 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap 20/3 与去重、零平台调用、fail-soft；并验证禁用融合分支时新测试变红。回归全绿。

#### 场景：空实现判据

Given 把 fuseScopeRecall 改成直接 return base
When 跑新增测试
Then 至少一条必须失败（证明测试不是空转）

### FR-07: eval：未改 engine 时五面指标与 baseline 逐位一致、六探针 GREEN、scope frozen/added 不变；新增 subset='fusion' 的「路由命中、expected 仅 scope 可达」case 单列报告

eval engine 不得为融合改动；五面指标必须与 baseline 逐位一致、六探针 GREEN、scope frozen/added 子集不变；必须新增 subset='fusion' 的数据集 case（路由命中、expected 仅 scope 可达）并单列报告，禁止用现有 case 的聚合 top3 宣称融合收益。

#### 场景：零回归不变式

Given 融合实现完成
When 跑 eval 全量对比 baseline
Then 五面 raw 指标逐位一致、六探针 GREEN、scope frozen/added 不变

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-fusion.test.mjs「结果契约与无 scope deepEqual」
FR-02: test/knowledge-fusion.test.mjs「合并去重/幽灵过滤/cap」
FR-03: test/knowledge-fusion.test.mjs「展示隔离与同步入口」+ test/knowledge-inject.test.mjs「孪生格式锁」
FR-04: test/knowledge-fusion.test.mjs「键规整与不传面」
FR-05: test/knowledge-fusion.test.mjs「fail-soft 与零平台」
FR-06: test/knowledge-fusion.test.mjs「RED-first 融合用例」
FR-07: test/eval-knowledge-runner.test.mjs「fusion 子集单列」
