---
author: flow-machine-draft
created_at: 2026-11-02T06:16:10.324Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-fusion

## 动机

任务原话转写：检索融合与消费面 scope 键统一

early-return 让路由命中后的 scope 层不可达：flow/complete 虽已传 scope 键但 scope rejected/手工条目在路由命中时永远看不到；execute/Wave/quick 消费面根本没有 scope 键。子代理方案审查给出关键修正：不能跨通道按 score 数值排序（路由 Jaccard 0~1 vs scope 2/1）、合并后 cap 3 会遮住 scope 且截断路由 raw 会回归、buildKnowledgeInjection 是同步函数不能只加 scopeFiles 参数、{DECISION_HITS} 与 cmdSearch 没有机器键不得编造、scopeRecall 有幽灵决策节点漏出（file/id 缺失的畸形 hit）、现有 eval case 不会给出可见提升（expected 已被路由命中）。

成功标准：
- 结果契约：路由命中时融合只追加 scopeDecisionHits/scopeEntries（带 via provenance），不设 json.scope、不截断路由 raw 列表；scope 空/无命中时结果逐字段不变（deepEqual 保护）
- 合并算法：决策键 file#id#change、条目键 file#anchor；路由优先保留、scope 按 scopeRecall 原序追加；上限沿用 20/3；不做跨通道 score 排序；ghost/缺 file/id 的畸形命中过滤
- 展示：flow/complete 的 rejected 渲染 = 路由 top-5 + scope 独立小节（至多 3 条，带触达文件来源）；execute/Wave 走新增同步融合入口 matchKnowledgeWithScope（fuseScopeRecall 纯函数 + graph 正向依赖），prompt/execute 孪生渲染格式锁同步
- 键来源：execute step 用 design 交付清单；Wave 用 task card target_files/过滤后的 allowed_paths；quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS} 与 cmdSearch 明确不传并写明理由；所有键规整为图内精确文件路径（目录前缀/glob 不传）
- 性能与降级：图构建进程级 memo 或写明 45ms/次预算；scope 构建失败原样返回路由结果（不掉词片回退）；路由命中零平台调用
- 测试：RED-first 新增「路由命中 + scope 独有 rejected/手工条目/两跳」用例（禁用融合分支必红）、flow 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap/去重、零平台、fail-soft；回归全绿
- eval：未改 engine 时五面指标与 baseline 逐位一致、六探针 GREEN、scope frozen/added 不变；新增 subset='fusion' 的「路由命中、expected 仅 scope 可达」case 单列报告

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. 结果契约：路由命中时融合只追加 scopeDecisionHits/scopeEntries（带 via provenance），不设 json.scope、不截断路由 raw 列表；scope 空/无命中时结果逐字段不变（deepEqual 保护）
2. 合并算法：决策键 file#id#change、条目键 file#anchor；路由优先保留、scope 按 scopeRecall 原序追加；上限沿用 20/3；不做跨通道 score 排序；ghost/缺 file/id 的畸形命中过滤
3. 展示：flow/complete 的 rejected 渲染 = 路由 top-5 + scope 独立小节（至多 3 条，带触达文件来源）；execute/Wave 走新增同步融合入口 matchKnowledgeWithScope（fuseScopeRecall 纯函数 + graph 正向依赖），prompt/execute 孪生渲染格式锁同步
4. 键来源：execute step 用 design 交付清单；Wave 用 task card target_files/过滤后的 allowed_paths；quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS} 与 cmdSearch 明确不传并写明理由；所有键规整为图内精确文件路径（目录前缀/glob 不传）
5. 性能与降级：图构建进程级 memo 或写明 45ms/次预算；scope 构建失败原样返回路由结果（不掉词片回退）；路由命中零平台调用
6. 测试：RED-first 新增「路由命中 + scope 独有 rejected/手工条目/两跳」用例（禁用融合分支必红）、flow 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap/去重、零平台、fail-soft；回归全绿
7. eval：未改 engine 时五面指标与 baseline 逐位一致、六探针 GREEN、scope frozen/added 不变；新增 subset='fusion' 的「路由命中、expected 仅 scope 可达」case 单列报告

## 成功标准（可验证）

1. 结果契约：路由命中时融合只追加 scopeDecisionHits/scopeEntries（带 via provenance），不设 json.scope、不截断路由 raw 列表；scope 空/无命中时结果逐字段不变（deepEqual 保护）
2. 合并算法：决策键 file#id#change、条目键 file#anchor；路由优先保留、scope 按 scopeRecall 原序追加；上限沿用 20/3；不做跨通道 score 排序；ghost/缺 file/id 的畸形命中过滤
3. 展示：flow/complete 的 rejected 渲染 = 路由 top-5 + scope 独立小节（至多 3 条，带触达文件来源）；execute/Wave 走新增同步融合入口 matchKnowledgeWithScope（fuseScopeRecall 纯函数 + graph 正向依赖），prompt/execute 孪生渲染格式锁同步
4. 键来源：execute step 用 design 交付清单；Wave 用 task card target_files/过滤后的 allowed_paths；quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS} 与 cmdSearch 明确不传并写明理由；所有键规整为图内精确文件路径（目录前缀/glob 不传）
5. 性能与降级：图构建进程级 memo 或写明 45ms/次预算；scope 构建失败原样返回路由结果（不掉词片回退）；路由命中零平台调用
6. 测试：RED-first 新增「路由命中 + scope 独有 rejected/手工条目/两跳」用例（禁用融合分支必红）、flow 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap/去重、零平台、fail-soft；回归全绿
7. eval：未改 engine 时五面指标与 baseline 逐位一致、六探针 GREEN、scope frozen/added 不变；新增 subset='fusion' 的「路由命中、expected 仅 scope 可达」case 单列报告
