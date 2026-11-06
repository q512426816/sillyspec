---
author: flow-machine-draft
created_at: 2026-11-06T16:03:17.608Z
---
# 任务注册表（Tasks）— 2026-11-06-knowledge-body-recall

- [x] task-01: 新增 test/knowledge-body-recall.test.mjs 七组用例（T1 主路径锚点级命中/T2 段落覆盖窗泛在排除稀有落窗/T3 已修复段落跳过/T4 弱命中并联追加不重排+零网络/T5 去重无重复键/T6 decisions 通道与向量门零回归对照/T7 零命中链补跑），fixture 用 tmpdir 语料（含正文含查询词但 INDEX 词表未收录的条目——复现实证场景），先跑确认红
- [x] task-02: 实现 fallbackByBodyShingles（src/knowledge-match.js 新增导出）：parseKnowledgeIndex 语料解析（排除 decisions/fr/停车场）+ ## 段落切分 + queryShingles 复用 + 段落覆盖窗 [2, max(2,ceil(8%段落数))] + 已修复段落状态行过滤 + 锚点级 entries（返回形态对齐 fallbackByQueryShingles 契约，无可命中返回 null）；T1~T3 转绿
- [x] task-03: matchKnowledgeHybrid 两处接线（src/knowledge-vector.js）：路由命中后并联 body 兜底（file+anchor 去重追加顶层 entries 尾部、零网络）+ 零命中链末端补跑 + json.bodyFallback 判定键；T4~T7 转绿
- [x] task-04: 跑受影响既有测试面（import knowledge-match/knowledge-vector 的全部测试文件）全绿（22 面 + 4 消费面 26/26 绿）；抽查确认 FR-core-engine-211/212 绑定与实态相符（tests --confirm 翻牌 active，证据=knowledge-vector-recall.test.mjs）
- [x] task-05: eval/knowledge 基线重打（snapshot_mismatch 消除，top1/top3 与旧基线持平、mrr 微幅波动 0.004-0.007 在 R-04 预期内）+ scope-manual 探针转绿（六个探针全 GREEN——登记在案的「手工知识被第一层短路」缺陷修复实证）
