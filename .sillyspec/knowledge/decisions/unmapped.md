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

## D-unmapped-495@v1 增量 scan 与既有 scan-refresh 的职责边界
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-001@v1
锚点：stages/scan.js
最近确认：c2191f4e
理由：两者互补不互替。scan-refresh＝引用级定点修补（staleRefs 命中的 file:line 过期陈述，agent 手术式编辑，检出极限=只查带引用论断，src/scan-refresh.js:24-25）；增量 scan＝模块级重生成（变化文件经 module-map 归属到模块，受影响模块的模块卡+映射增量重写，子代理并行生成，复用 stages/scan.js 的子代理范式）。增量 scan 解决 refresh 检出极限外的「无引用论断/结构性变化」，不替代 refresh 的轻量定点修补场景。
故障面：两套增量机制并存可能让用户困惑选哪个——命令输出需互相指引（增量 scan 触发软门时建议 refresh，反之亦然）。
退役判据：若 refresh 使用率趋零（增量 scan 覆盖其场景），可考虑合并。

## D-unmapped-496@v1 降级链——CodeGraph 缺失时零回归回退全量
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-002@v1
锚点：init/index.state
最近确认：c2191f4e
理由：用户任务书明确：绝不因索引缺失阻断 scan——探测失败（命令不存在/未 init/index.state!=complete/超时）自动回退现行全量 scan，行为与现行版本完全一致（零行为回归）。降级要留痕（警告行说明回退原因），不静默。

## D-unmapped-497@v1 入口形态——方案 A 缺省自动增量判定
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-003@v1
锚点：未记录
最近确认：c2191f4e
理由：用户选方案 A（2026-11-14 对话轮「A」）：`sillyspec run scan` 启动时 CLI 秒级探测（codegraph status + git diff 基线聚合 → 增量计划），可行则自动走增量路径（受影响模块清单/篇章跳过集/unmapped/对账报告注入既有 11 步编排），不可行自动回退现行全量（警告留痕）。`--incremental` 显式请求增量（不可行时警告后回退）、`--force-rescan` 语义不变。理由：任务书动机是「贵→不跑→腐烂」循环，缺省自动同时断掉「贵」与「不跑」两环；降级链（D-002）与缺省路径天然同构；判定不确定时保守回全量控制误判半径。
故障面：同命令双路径的可预期性下降——输出必须明示走了哪条路径与原因，否则用户无法判断「这次为什么快/慢」。
退役判据：若自动判定误判率实测过高（漏更模块），翻缺省值回方案 B 形态（显式 flag）。

## D-unmapped-498@v1 方案 B（缺省全量 + --incremental 显式触发）落选
状态：rejected
变更：2026-11-14-scan-incremental
原编号：D-004@v1
锚点：未记录
最近确认：c2191f4e
理由：落选。
否决理由：不解决采用率——用户已不常跑 scan，新 flag 只治「跑了贵」不治「不跑」，腐烂循环另一半仍在；且 C1 要求探测失败静默回退全量，显式 flag 的「显式失败」意义被架空。
复潮条件：自动增量误判率实测过高需要用户显式控制时，或存量用户对缺省行为变化反弹强烈时。

## D-unmapped-499@v1 增量路径的 worktree-guard 握手（Grill P0-1 修复）
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-006@v1
锚点：未记录
文件：src/hooks/worktree-guard.js, src/run/stage.js
最近确认：c2191f4e
理由：增量模式写自己的 guard 握手：mode='scan-incremental' + incrementalDocs 白名单（=计划 guardDocs：docsToRegenerate+受影响模块卡+_module-map.yaml+_module-map-audit.md+_facts.md）+ docHashes（哈希在手才放行，refresh D-007 同构 fail-closed）+ sourceCommit。worktree-guard 新增 mode 分支：白名单内放行、白名单外照常拦截——guard 转为「未受影响面零触碰」的执行保护机制。
故障面：guardDocs 与实际重生成面不一致 → 子代理被拦（fail-closed 方向）或越界放行（docHashes 哈希校验兜底）。
退役判据：scan 覆盖保护机制整体重构时。

## D-unmapped-500@v1 探测落点=scan 命令启动入口层，三档统一生效（Grill P1-1 修复）
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-007@v1
锚点：src/run/stage.js
文件：src/run/scan-profile.js, src/run/stage.js
最近确认：c2191f4e
理由：探测+计划在 scan 命令启动入口层（src/run/stage.js scan 启动段，写 guard 同段）执行，quick/standard/deep 三档统一；quick 深度文档例外回退全量（受影响文档含 scan_depth:quick → mode:'full'，与 refresh quick-depth 硬门同语义）。

## D-unmapped-501@v1 .sillyspec-codegraph 索引目录隔离（Grill P1-2 修复）
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-008@v1
锚点：src/scan-refresh.js:48
文件：.gitignore, src/run/scan-profile.js
最近确认：c2191f4e
理由：三层隔离：①scan-incremental.js 定义单点排除常量（skipDirs 同源集合+'.sillyspec-codegraph/'）供对账与变化集过滤共用；②探测发现索引目录存在但未进 .gitignore → warnings 提示建议登记（不自动改写用户 .gitignore）；③本仓 dogfood 自身 .gitignore 补登记一行。CODEGRAPH_DIR 不改落 .sillyspec/ 下（其只接受项目根单段目录名，基础设施约束）。

## D-unmapped-502@v1 增量模式豁免「生成模块卡片」conditionalWait（Grill P1-3 修复）
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-009@v1
锚点：未记录
最近确认：c2191f4e
理由：增量模式下豁免该等待：授权载体=增量计划本身（D-003 缺省自动判定的用户授权 + 启动时路径判定输出明示重生成面）。未受影响模块卡不在重生成面、天然无覆盖风险；guard 白名单（D-006）为放行边界。非增量模式（含 --force-rescan）conditionalWait 行为原样。注入段显式压制「已存在则跳过」规则（对计划内受影响面不适用）。

## D-unmapped-503@v1 task-06 验收驱动的性能修复越卡边界（软门前置+探测缓存）
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-012@v1
锚点：未记录
文件：src/run/stage.js, src/scan-incremental.js
最近确认：c2191f4e
理由：我的判断（执行期裁决）：验收发现缺陷→修复→复验是验收任务的闭环产出，同变更 worktree 内可逆不推翻决策——作为 task-06 交付一并提交，verify-evidence.md 留痕。修复内容：①computeIncrementalPlan 软门 behind 轴前置到 git diff 之前（behind>200 非 force 直接回退省大 diff）；②stage.js 探测提循环外+listIndexFiles memoize 注入（多项目仓省 N-1 次 status/files 子进程）。
退役判据：软门阈值或 diff 口径变更时重估前置条件。

## D-unmapped-504@v1 unmapped 归属线索用目录邻居启发（零子进程），不用 codegraph query
状态：implemented
变更：2026-11-14-scan-incremental
原编号：D-010@v1
锚点：未记录
最近确认：c2191f4e
理由：我的判断（执行期裁决）：hint 改为目录邻居启发——unmapped 文件取其目录前缀，查同目录/父目录下已归属文件的模块 id（纯本地计算，零子进程零开销）；codegraph query 语义等价信息（文件→依赖边→模块）留待未来需要时按需引入。归属结论仍归 agent 判断（C3 不变）。
退役判据：秒级预算约束解除（如 hint 走后台异步）时可回到 query 方案。

## D-unmapped-505@v1 方案 C（scan-refresh 工单扩大版）落选
状态：rejected
变更：2026-11-14-scan-incremental
原编号：D-005@v1
锚点：未记录
最近确认：c2191f4e
理由：落选。
否决理由：违反任务书「只重新生成受影响模块的文档/模块卡」的重生成语义与验收标准 1 的产物 diff 对比口径；agent 定点编辑质量不可控（正是 refresh 检出极限困境），token 成本下降不显著。
复潮条件：子代理重生成范式在某仓不可用（如无子代理环境）而该仓需要增量维护文档时。

## D-unmapped-506@v1 收口实测门走分层门语义——必过面收窄到变更自身测试+直接依赖测试
状态：implemented
变更：2026-11-21-verify-gate-scope-speed
原编号：D-001@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：用户选「收窄（分层门）」：收口必过门收窄到「变更自身测试＋直接依赖测试」；间接回归面（FR 回归层、枢纽扩散面）移出收口阻断，转后台或 pre-push 门——跑但不阻断，证据留痕。「亲自实测防作弊」亮点语义保留（收口内必过面仍真实执行），只切除间接回归面拖慢收口的缺陷面。
故障面：间接回归面移出阻断后，间接破坏发现时点后移——依赖「证据留痕不静默」纪律兜底；若留痕通道缺失或被忽略，间接回归失败将无人看到。
退役判据：若收口实测面收窄后评审/CI 层间接回归逃逸率显著上升（P0/P1 缺陷绕过收口），重审分层切线。

## D-unmapped-507@v1 验收口径=范围构成+时长护栏双验收
状态：implemented
变更：2026-11-21-verify-gate-scope-speed
原编号：D-002@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：用户选「范围+时长双验收」：主指标=收口阻断面构成可审计（「本变更测试∪直接依赖测试」的披露行/ledger 可查证）；另加时长护栏——必过面超预算（可配置）自动转留痕不阻断＋loud 披露，防变更自身测试套件本身就慢的仓把 agent 卡死在收口。
故障面：时长护栏的降级通道可能被滥用为「跳过慢测试」——强制 loud 披露 + ledger 留痕 + 全量归 pre-push/CI 门兜底；若降级被静默化即退化。
退役判据：若降级通道使用率异常高（多数收口都在超预算降级）或降级后 pre-push 全量门频繁放行失败，重审护栏切线。

## D-unmapped-508@v1 间接回归面落点=只归 pre-push 门（不在收口跑）
状态：implemented
变更：2026-11-21-verify-gate-scope-speed
原编号：D-004@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：用户选「只归 pre-push」：间接面不在收口执行、不做收口后台编排，全部归 pre-push 门承担（与 2026-10-23-fr-regress-default-off 用户裁决「默认不跑归 pre-push/CI 门」同口径延伸）。收口对间接面只做披露（面清单+归属去向），不执行。
故障面：收口到推送之间间接回归无执行窗口——收口披露必须显式标注「间接面未跑、归 pre-push」，防 agent 与用户误读为「全绿已验证」。

## D-unmapped-509@v1 分层门作为 dynamic 策略缺省行为，逃生阀回旧阻断面
状态：implemented
变更：2026-11-21-verify-gate-scope-speed
原编号：D-006@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：用户选「收窄为缺省」：dynamic 策略（缺省策略）的收口阻断面缺省即「本变更测试∪直接依赖测试」；local.yaml 逃生阀键回旧行为（三源全阻断面，间接面回收口阻断）。符合「默认零配置可用+机制类调优键缺省即最优」配置哲学；缺省行为变化需迁移披露（版本 note/输出提示行）。

## D-unmapped-510@v1 收窄切线=方案A 枢纽分层（命中计数广度切线）
状态：implemented
变更：2026-11-21-verify-gate-scope-speed
原编号：D-007@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：用户选方案 A「枢纽分层」：import 依赖面按引用广度分层——被命中的变更源文件中，命中测试数 > 既有 hub 阈值（DEPS_SYMBOL_NARROW_HUB_MIN，语言无关命中计数）的枢纽源带来的测试=间接回归面（收口只披露+归 pre-push）；非枢纽命中+本变更测试=收口阻断面。时长护栏（D-002）套阻断面执行外层。JS/TS 不做符号级精细化（枢纽面整体出阻断），精细化留后续。C 的兜底价值由时长护栏承接，不为兜底牺牲切线语义。
故障面：hub 阈值是硬切线——命中数在阈值两侧横跳的文件两轮收口切线不稳（抖动面）；枢纽测试移出阻断后枢纽行为破坏延迟到 pre-push 才发现。
退役判据：若枢纽切线后 pre-push 间接面失败率显著高于阻断面（切线失准信号），或小仓/中仓普遍无 hub 导致收益趋零，重审阈值或切线形态。

## D-unmapped-511@v1 落选——方案B 紧度分层（rejected 防复潮）
状态：rejected
变更：2026-11-21-verify-gate-scope-speed
原编号：D-008@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：落选：namedImportEvidence 符号命中=直接阻断、纯字符串路径命中=间接 pre-push 的证据强度切线。
否决理由：Python 等无符号信息语言整体回落全归直接 → 面不变 → 重灾仓（多语言混合仓，D-003 第一优先实证场景）零收益，方案对主痛点失效。
复潮条件：Python/泛语言符号提取适配器落地且全语言覆盖（无符号回落不再退化）后可重议。

## D-unmapped-512@v1 落选——方案C 预算分层与 A+C 融合（rejected 防复潮）
状态：rejected
变更：2026-11-21-verify-gate-scope-speed
原编号：D-009@v1
锚点：未记录
最近确认：436ef561f9c73ba4285ab0988af33076ba50dc5f
理由：落选：①方案 C（①+③ 整体套规模帽、超帽按字母序弃置归 pre-push）；②A+C 融合（枢纽切线+整体规模帽双保险）。
否决理由：切线任意（字母序≠依赖语义——第 31 个文件被弃不是因为不依赖而是字母序靠后），与 C1「阻断面=直接依赖」名实不符；同一变更在不同仓切线结果不可预期；A+C 融合叠加两套切线机制面最大、披露最复杂，且兜底价值已被时长护栏（D-002）承接。
复潮条件：枢纽切线在实证中被证明无法给出确定上界（如无 hub 大仓面仍失控）且时长护栏降级通道使用率过高时，可重议规模帽兜底。
