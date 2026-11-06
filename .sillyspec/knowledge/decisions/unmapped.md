# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。
> 【2026-11-02-knowledge-status-lines】本池条目为检索面-only 停车场（语义等价 draft/exclude）——检索核心已过滤，条目仅供人工翻阅与数据对账。

## D-unmapped-489@v1 方案范围=正文词片兜底 + 弱命中并联本地词片
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-001@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：用户于 brainstorm Step 3 收尾一轮明确选择「方案1+2 组合」：①正文词片兜底通道（词片回退语料从 decisions 域扩到全部 INDEX 引用知识文件的 ## 段落正文，锚点级命中，复用 queryShingles+复现窗+已修复过滤同口径）；②弱命中不彻底短路——路由命中时仍并联本地词片层做去重合并，不并联向量（保「路由命中零网络」性能契约）。
故障面：弱命中场景多跑一遍正文扫描的耗时（语料 ~10 文件分段，量级几十 ms）；词片命中噪声进入注入面（需 cap 与排序约束）
退役判据：平台向量层语料扩展到全库知识文件且离线仓有可用语义通道时，本地词片兜底可降级为零命中-only

## D-unmapped-490@v1 窗参数设计期按泛在度统计数据定
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-002@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：我的判断：不预设——Step 5/6 设计时先对实证语料做只读泛在度统计（各知识文件 ## 段落中典型查询 bigram 的分布），按数据定窗；门槛参数（≥4 是否降 ≥3 救 cwd 类短词）不在本次范围（用户裁掉），设计期仅记录数据供后续变更。

## D-unmapped-491@v1 非目标裁剪——向量语料扩展与入库侧词表派生不做
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-003@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：我的判断：均不做。向量语料扩全库属跨系统改动（平台端点契约 + 索引重建，knowledge-vector.js:15-20 端点契约只收决策条目）且离线仓不受益，双路一致判为长期方向；入库侧词表自动派生被 D-unmapped-197（2026-09-29-decision-route-vocab）否决——同窗词片按序截断=抽签，本次方案全走查询侧无复潮冲突。

## D-unmapped-492@v1 实现方案=B 新增独立正文兜底函数
状态：implemented
变更：2026-11-06-knowledge-body-recall
原编号：D-004@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：用户于 brainstorm Step 4 选择「B 新增独立函数」：fallbackByQueryShingles 原样保留（decisions 专用零改动）；新增 fallbackByBodyShingles 承接 INDEX 引用的普通知识文件 ## 段落正文语料（复用已导出的 queryShingles 与窗判定）；matchKnowledgeHybrid 编排两处接线——路由命中后并联 body 兜底去重合并（不并联向量，保零网络契约）、零命中链在 decisions 回退后补跑 body 兜底。
故障面：两兜底函数并存的一致性维护（窗参数若日后分叉需同步）；并联分支去重逻辑错误可能重复注入同条目
退役判据：若后续统一为单一兜底通道（A 形态复潮且成立），本函数可并入

## D-unmapped-493@v1 落选——A 扩展现有回退函数为统一通道
状态：rejected
变更：2026-11-06-knowledge-body-recall
原编号：D-005@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：落选。
否决理由：fallbackByQueryShingles 是 2026-09-29-decision-route-vocab 刚落地机制且被 search/digest/门条目行三面消费——语料参数化使其职责膨胀，decisions 的 decisionHits 结构与普通段落锚点 entries 混合，回归波及既有 decisions 通道行为（用户裁定弃）。
复潮条件：decisions 通道消费面收敛为单一形态（decisionHits 与 entries 结构统一），或函数重构后三面消费有独立回归测试覆盖时。

## D-unmapped-494@v1 落选——C 预建正文词片索引（物化）
状态：rejected
变更：2026-11-06-knowledge-body-recall
原编号：D-006@v1
锚点：未记录
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348
理由：落选。
否决理由：引入索引同步/失效管理（知识文件改动→索引漂移，属本仓「双写必漂移」坑家族新成员）+ 新运行时产物与生命周期；而实时扫描语料仅 ~10 文件几十 ms，性能前提不成立——纯增复杂度零收益（用户裁定弃）。
复潮条件：知识库规模增长到实时扫描进入秒级（如百级文件）且检索频次高到成为热路径时。
