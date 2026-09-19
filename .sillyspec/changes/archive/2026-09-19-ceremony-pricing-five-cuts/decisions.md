---
author: qinyi
created_at: 2026-09-19 07:20:00
change: 2026-09-19-ceremony-pricing-five-cuts
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 方案选择——A（五刀捆绑单变更，hunk 复用既有锚）胜出
- type: architecture
- priority: P0
- status: superseded（superseded_by: D-001@v2，2026-09-19 重定范围——刀 1/5 随 blast 轴项目化作废）
- source: user
- question: 落地编队与第五刀实现形态取舍：A 五刀捆绑单变更+事实面 hunk 复用既有 merge-base 锚 / B 五刀捆绑+新造 baseSha 快照基线 / C 四刀先行第五刀另立变更。
- answer: 选 A。**用户三轮对话定稿（06:47 四刀方案 → 06:57 五刀定稿），显式原话「第五刀…必须和第 2 刀同一个变更落地」「事实面应该扫变更行，不扫整文件」**。C 被用户显式否决（第 2 刀单独上线=给低报门送弹药——重定价降档后 verify --done 双跑按全文件事实面打出 S3，低报 error 硬拦+记 gate_rollback+摩擦再顶档，降档永远走不到终点）；B 为不存在的问题加状态面（快照缺失/损坏兜底路径），既有 resolveReconcileActualFiles 三源锚定（B1 merge-base diff / worktree merge-base(wtHead, mainHead) / sillyspec-audit tag）已覆盖两种形态的基线需求。
- normalized_requirement: 五刀（枚举继承传完/声明追赶重定价/span 标题/高报 warn/事实面 hunk 口径）在同一变更内交付；hunk 抽取扩展自既有锚定机器，不新造基线状态。
- impacts: [FR-01, FR-02, FR-03, FR-04, FR-05]
- 模块域: core-engine, runtime
- evidence: 用户消息 2026-09-19 06:47:23 / 06:57:24；本会话 Agent 核验回放（定价句八词四漏出 integration-critical、readDesignOwnFiles 解析 0 文件、reconcileDualRun 高报静默、8 文件全文件事实面回放 deployment-critical）；verify-postcheck.js:2586-2661（B1 锚定先例）、:1160-1193（worktree merge-base）
- 故障面: 五刀捆绑使单变更体量增大（~8 文件）——但拆分会在 2 与 5 之间开出门禁击穿窗口，捆绑是约束不是偏好。
- 退役判据: 若三源锚定在某新形态（如 platform 模式）下不可得，hunk 口径降级回全文件并在 reasons 留痕（fail-open 方向随 D-006 地板语义定）。

## D-002@v1: 枚举继承沿纯连接符传完（一跳断链修复）
- type: architecture
- priority: P0
- status: superseded（superseded_by: D-008@v1，2026-09-19 重定范围——散文匹配整体退役，继承精修失去对象）
- source: code
- question: collectLineTriggerStats 枚举继承只传一跳：继承判定（change-risk-profile.js:209）只认前一词被**否定窗口**抑制（NEGATION_CUES.test），不含继承态——定价句「无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat」窗口恰好盖到 agent_run，daemon 一跳继承，lifecycle 起四词漏出成 kept triggers → 误判 integration-critical。
- answer: 改为从左到右扫描：同一子句内一个词被窗口抑制**或已被继承抑制**，下一词与它之间只隔 ENUM_GAP_RE（既有正则 ：181，含 /、空格、|、,、，、和、与、及、and、or）即继续抑制；间隙出现普通文字继承停止。既有反例必须保住：「不改动 daemon，新增 session」子句切断、「不涉及 daemon 的情况下重构 session」普通文字间隔不继承（test/stage-contract.test.mjs:440-441）。新回归钉＝定价原句整句，八词全部进 suppressedTriggers。不加「零」进否定词表（定价时刻自审段不存在，加「零」误伤「零拷贝/零依赖」）。
- normalized_requirement: 同子句否定语境的纯连接符枚举全链抑制；反例行为逐字不变；定价句回放八词全抑制、级别 doc-only。
- impacts: [FR-01]
- 模块域: core-engine
- evidence: 本会话回放实证（kept: lifecycle/state transition/claim/heartbeat，suppressed: daemon/session/lease/agent_run → integration-critical）；现有用例枚举仅三词（:437）恰在一跳可达范围内——一跳实现自测通过的根因
- 故障面: 继承链过长的误抑制面—— ENUM_GAP_RE 纯连接符约束是硬边界，普通文字即断；「零」等新否定词的误伤面已显式排除。
- 退役判据: 若 detectChangeRisk 迁移到结构化判级输入（非文本关键词），继承语义整体退役。

## D-003@v1: 完成门「声明追赶重定价」——无摩擦可降、摩擦地板不退（「只升不降」契约修订）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 开跑价一次定死：06:19 定价 S3、06:31 design 才补 risk_level: unit-sufficient，此后完成门只跑 escalateByFriction（只升不降），声明后补永远追不上——「误伤粘住」。
- answer: escalateCeremonyTierAtGate 在档位文件在场时先用当前 design/plan 重跑 computeInitialCeremonyTierDoc，再跑摩擦升档。**transitions 为空且 ledger 摩擦未超阈：开跑价整档换成重算结果，可升可降**，reasons 留「声明追赶重定价」；**已有摩擦迁移：地板不退**，重算只更新 blast/span 分量，最终档=max(重算档, 摩擦地板)。懒 agent 靠删关键词把真 S3 写成 S0 仍由收口双跑按实际 diff 硬拦（verify-postcheck 事实面 detectChangeRisk 无声明通道）。
- normalized_requirement: 无摩擦迁移且未超阈 → 完成门重定价可降可升；有迁移/超阈 → max(重算, 地板)；行为契约变更须同步 ceremony-tier.js 模块头注、config-schema.js:232「agent 自报只可升不可降」表述与钉住只升不降的既有测试。
- impacts: [FR-02]
- 模块域: core-engine, runtime, setup
- evidence: 用户原话「无摩擦时允许重算开跑价…懒 agent 靠删关键词把真 S3 写成 S0，仍由收口双跑按实际 diff 硬拦」；gates.js:676-697（现只有缺失时定价+escalate）；config-schema.js:232-234（「只升不降」表述同步点，setup 域）；api-matrix 变更档位文件实证（06:19:48 定价早于 06:31 design 修订，risk_level 未参与）
- 故障面: 重定价抖动（design 反复改声明 → 档位反复横跳）——每次迁移留 transitions 审计痕，评审可见；摩擦地板保证已付仪式价不白付。
- 退役判据: 若声明通道前移到定价时刻强制存在（如 brainstorm 门要求 frontmatter 先行），追赶重定价需求自然消失。

## D-004@v1: readDesignOwnFiles 认「## 文件变更清单」标题（解析器/模板漂移修复）
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: readDesignOwnFiles（gates.js:1642）只认 `^##\s+(\d+)\.` 数字标题，现行模板生成「## 文件变更清单」——8 行清单解析成 0，span 轴瞎。注释（gates.js:623「design §6『文件变更清单』」）与实现本就脱节。
- answer: 同时认 `## 6.` 数字标题与 `## 文件变更清单`（含带括注形态「## 文件变更清单（…）」）；阈值 SPAN_FILES_THRESHOLD=8 不动；旧数字标题行为不变。
- normalized_requirement: 现行模板 design 的清单行正确解析；`## 6.` 旧标题回归不变。
- impacts: [FR-03]
- 模块域: runtime
- evidence: 暂存版（定价时刻）design.md 已有「## 文件变更清单」+8 行而档位文件 span=S0（实证解析器瞎，非清单未写）；本仓 sillyspec-design-init 生成的模板即无编号标题
- 故障面: 标题形态再演进（如双语/别名）会再漂——接受双形态白名单，不做模糊匹配（宁窄勿宽，误解析面小于漏解析面）。
- 退役判据: design 迁结构化产物（yaml/json 清单）后文本标题解析整体退役。

## D-005@v1: 双跑高报 severity warn——只记账不阻断
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: reconcileDualRun（ceremony-tier.js:277）mismatch = fact > declared，只抓低报；高报（声明档高于事实档）severity 'none' 静默——「误伤粘住」与「收口再打回」之间的反向 token 损失不可见。
- answer: 增加高报态：事实档低于声明档 → severity 'warn'，写入 reasons/notes，verify 不回滚、archive 不阻断、不记 gate_rollback 摩擦；低报维持 error 硬拦。消费面（runCeremonyDualRunCheck 返回结构与 complete-handlers 接线）同步 'warn' 非阻断语义。
- normalized_requirement: declared > fact → warn 不阻断不记账；declared < fact → error 维持；severity 枚举扩为 'error'|'warn'|'none'。
- impacts: [FR-04]
- 模块域: core-engine
- evidence: ceremony-tier.js:277（mismatch 单向）；verify-postcheck.js:3011（severity 'error'|'none'|null 返回契约）、complete-handlers.js:2691（接线）
- 故障面: 高报免费化被滥用来「买保险」——高报自身代价是更重仪式（S3 两轮评审），自罚机制天然存在，无外部性。
- 退役判据: 无（单向低报硬拦是不可让步的诚实性门）。

## D-006@v1: 事实面内容扫描改 diff hunk ＋行；test/ 路径内容跳过
- type: architecture
- priority: P0
- status: superseded（superseded_by: D-008@v1，2026-09-19 重定范围——事实面不再扫内容，hunk 口径/test 跳过/自指验收随之失去对象）
- source: user
- question: readCeremonyFactContent（verify-postcheck.js:2941）读 diff 文件**全文件内容**——未改动行的历史关键词全部计入本次变更。实证：api-matrix 变更 8 文件全文件回放打出 deployment-critical（kept: entryPoint/backend/daemon/session/lease/lifecycle/claim——命中源是 verify.js:195-199 指引文案本身与 stage-contract.js:454 标识符注释），任何触碰门禁引擎文件的变更事实面天然 S3，降档通道被自家收口门封死。
- answer: 只拼本次新增/修改行（`git diff -U0` 的 `+` 行；新文件整篇算变更行；`-` 行不计——删除不引入风险面），复用 resolveReconcileActualFiles 既有三源锚定（B1 merge-base / worktree merge-base / audit tag），文件名仍走 changedFiles 路径模式（INTEGRATION_FILE_PATTERNS）。**test/ 路径内容跳过（Agent 自主选定，非用户确认——可否决：--reopen 重选）**：测试 fixture 里的关键词是测试语料非生产集成面（本仓 detectChangeRisk 自身的正负向用例必须含关键词句），跳过内容但文件名仍判——永久消解「定价引擎自指陷阱」；test 命名含关键词（daemon.test.js）仍由路径模式命中。超限截断（256KB/文件、4MB 总量、200 文件）沿用。
- normalized_requirement: 事实面内容＝变更行并集（非全文件）；test/ 路径只参与文件名判定不参与内容判定；锚不可得时降级语义落 design（整检查 degraded skip 沿用，不静默换口径）；本变更自身 + 行关键词回放零 kept 命中（自指验收）。
- impacts: [FR-05]
- 模块域: core-engine
- evidence: 用户原话「事实面应该扫变更行，不扫整文件…文件名仍走现有的 changedFiles 路径模式」；本会话全文件回放实证（deployment-critical + 命中词定位）；verify-postcheck.js:2586-2661（锚定机器已在）
- 故障面: ①锚不可得时的兜底方向（degraded skip vs 回退全文件）——design 定为 skip 沿用既有降级语义，防静默放宽；②test/ 跳过被用作藏关键词的通道——生产风险面在 src/，test 文件名路径模式仍是网，且 verify 亲测（commands.test）独立兜底。
- 退役判据: test/ 跳过若实证放走真实风险（测试文件内实现生产逻辑的反模式），收窄为仅 test/*.test.* 内容跳过。

## D-007@v1: entryPoint 词表不动（词汇碰撞非边界 bug）；在途 api-matrix 变更维持 S3
- type: architecture
- priority: P2
- status: superseded（superseded_by: D-007@v2——entryPoint 论断随词表退役作废，仅保留在途变更处置条款）
- source: agent
- question: `/\bentrypoint\b/i` 命中 stage-contract.js:454 注释裸词 entryPoint（变量名恰好拼出该词）——是否修词表？在途 api-matrix 变更档位如何处理？
- answer: 不修。边界本来就对：:481/:484 的 entryPointPatterns 因 t→P 无 \b 根本不命中，唯一命中源是 :454 注释裸词（后跟 / 有尾边界）——这是词汇碰撞，没有「词边界修法」，改词表或改标识符都是为不存在的 bug 动刀。hunk 口径（D-006）落地后 :454 是未改动行，事实面不再扫到，问题自然消解；回归钉记口径即可。在途变更维持 S3 跑完：五刀落地后重定价虽可守（hunk 事实面≈S2=声明 S2），但押在另一变更进度上是反向耦合——排期解耦选择，非门禁所迫；已付顶档仪式不追溯。
- normalized_requirement: 零实现动作；回归钉断言 entryPoint 命中口径（供 hunk 口径对照）。
- impacts: [FR-05]
- 模块域: core-engine
- evidence: 本会话边界分析（entryPointPatterns 不命中、:454 命中）；用户 06:57「entryPoint 词边界顺手修，作为回归钉，不单独当第五刀」→ 修正为连顺手修都不做（词汇碰撞，无处可修）
- 故障面: 无（零动作决策）。
- 退役判据: 若未来 hunk 口径下 entryPoint 类标识符在**新增行**大量出现，重审词表粒度（按词形上下文而非裸词）。

## D-001@v2: 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 用户 2026-09-19 深度审查指出 blast 轴地基问题：判级词表是 SillySpec 自用词汇硬编码、无项目配置、九消费点共用——「撞词」≠「危险」，换一个仓库全是噪声（HTTP session/lifecycle 回调/变量名 entryPoint 均良性）；risk_level 显式声明是补丁不是定价规则且受首定时序惩罚。五刀中的刀 1（枚举继承精修）与刀 5（事实面 hunk）是在给错误的仪器做精修。
- answer: 范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
- normalized_requirement: 四件事同一变更交付；detectChangeRisk 八消费点逐点定处置（grep 实证 8 处调用点）；词表/否定抑制/枚举继承整体退役。
- impacts: [FR-01, FR-02, FR-03, FR-04, FR-05]
- 模块域: core-engine, runtime, setup, docs-consistency
- evidence: 用户消息 2026-09-19（「重定范围可以做…可以 --reopen。范围收成四件事」）；change-risk-profile.js:18/:45（词表硬编码零配置入口）；九调用点 grep 实证（stage-contract×4/gates/review-tier/verify-quality-scan/verify-postcheck）
- 故障面: 范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
- 退役判据: 若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

## D-007@v2: 在途 api-matrix 变更不动档位文件（supersedes D-007@v1，entryPoint 论断随词表退役作废）
- type: architecture
- priority: P2
- status: accepted
- source: user
- question: 在途变更档位处置；entryPoint 词表是否修。
- answer: 只保留：在途 api-matrix-service-coverage 继续按已锁定的 S3 跑完（已付仪式不追溯，排期解耦）。entryPoint「词汇碰撞非边界 bug」论断随散文匹配退役失去对象（D-008）——新架构下该词不再被任何路径匹配。
- normalized_requirement: 零实现动作；不动 .runtime/ceremony-tier-2026-09-19-api-matrix-service-coverage.json。
- impacts: []
- 模块域: core-engine
- evidence: 用户 2026-09-19「在途那单继续按已经锁住的 S3 跑完，那是另一件事」
- 故障面: 无（零动作决策）。
- 退役判据: 无。

## D-008@v1: blast 轴项目化——map 路径声明主 + local 只升覆盖 + 词表硬退役
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: blast 危险面信号的合法来源。「local.yaml 当共享价目表」被否（.gitignore 每机一份）、「core-engine 整模块 S3」被否（模块内 datetime/constants/fs-atomic 与 stage-contract 不同价，整模块计价会把 api-matrix 再次变成 S3 且这次「看起来像算对了」）。
- answer: **主声明落进 git 的 `_module-map.yaml` 新增 blast 段：按路径前缀挂档**（tier S0~S3 + evidence 位，D-009）；`modules rebuild` 非 force 必须保留该手工段（paths 字段同款先例——实现+回归测试，不是免费假设）；`local.yaml ceremony.blast_surfaces` 只允许往上加档（与 map 声明逐前缀取 max），不能把共享声明压低。**未命中声明面 → blast S1；未配置的项目禁止回退到旧词表**。词表（INTEGRATION_CRITICAL_PATTERNS/INTEGRATION_FILE_PATTERNS）连同否定抑制（NEGATION_CUES/窗口）、枚举继承（ENUM_GAP_RE/collectLineTriggerStats）从定价与证据门默认路径**删除，不留默认开启的 legacy**。extractExplicitRiskLevel（frontmatter 显式声明）保留为人工通道（经 D-003 追赶重定价随时生效）。
- normalized_requirement: blast = 声明面前缀命中（复用 span 轴 matchModuleForFile 同款路径语义：字面量或目录前缀）；词表与散文匹配代码删除；_module-map.yaml 增 blast 段（自举声明表见 D-010）；rebuild 非_force 保留 blast 段有回归钉。
- impacts: [FR-01]
- 模块域: core-engine, docs-consistency, setup
- evidence: 用户 2026-09-19 三段裁定原话（local.yaml gitignore 第 6 行/主声明 _module-map.yaml 按路径前缀/只升不降/未配置禁止回退/不留 legacy）；change-risk-profile.js:161-181（否定抑制机器随散文匹配退役）；modules rebuild 手工字段保留先例（map 头注 paths 警告）
- 故障面: ①声明表无人维护 → 危险面漏网（span 结构信号与 friction 轴仍在，双跑低报门兜底路径面）；②rebuild 静默清 blast 段 → 回归测试钉死；③新项目零声明 → 全部 S1 起步（预期行为：项目自己的危险面自己声明）。
- 退役判据: 若声明面需要更细粒度（行级/符号级），blast 段 schema 升版而非回退词表。

## D-009@v1: 仪式档与证据门分离——证据只认显式标记，不从仪式档推断
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 「S3 只钉真正的会话、租约、worktree、dispatch 路径；门禁判定文件最多 S2；证据门如果跟着同一个 S3 走，这次纯函数改动还会被要求拿出 daemon 启动证据」——两个轴必须解耦。
- answer: blast 声明两项独立属性：`tier`（仪式档）与 `evidence: true`（需要真实集成证据）。**证据门只认显式标了 evidence 的路径，不从 tier S3 推断**；evidence 命中**不被 risk_level 显式声明豁免**（豁免=改 map，git 可见——今日显式短路「声明 doc-only 连证据门都免」的懒 agent 洞顺手收掉）；risk_level 仍可经 D-003 追赶压低仪式档。requiredVerification 生成源从 level 词汇推断改为 evidence 位直出。
- normalized_requirement: detectChangeRisk 返回结构重构为 tier 直出 + evidenceRequired 位；stage-contract 四消费点按新结构接线；evidence:true 命中 + risk_level: doc-only → 仪式档可降、证据要求保留。
- impacts: [FR-01]
- 模块域: core-engine
- evidence: 用户 2026-09-19「仪式档和证据门分开标…证据门只认显式标了『要集成证据』的路径，不从仪式 S3 推断」；change-risk-profile.js:247-256（现行显式短路连证据门一起豁免的洞）；:291-304（level→requiredVerification 推断链）
- 故障面: evidence 位滥用（全仓标 true）→ 证据门大面积误拦——自举声明表只挂真运行时域（D-010），map 评审可见。
- 退役判据: 无（分离是不可让步的语义边界）。

## D-010@v1: sillyspec 自举声明表口径——S3 钉真运行时域、门禁判定文件 S2、core-engine 不整模块标价
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 本仓自己的 blast 声明表怎么标。
- answer: **S3+evidence 只钉真正的会话/租约/worktree/dispatch 路径**（runtime 会话域文件、worktree 模块、dispatch 域）；**门禁判定文件最多 S2**（stage-contract/verify-postcheck/verify-probes/ceremony-tier/review-tier/change-risk-profile/quick-gate-profile/probe7-anchor-check/run/gates 等）；**core-engine 不整模块标价**（datetime/constants/fs-atomic/taskcard 等零声明）。按此口径 api-matrix 类变更新架构下 = S2（8 文件 span），不是 S3——「改门禁判定白名单」与「改会话租约」不同价。具体路径清单在 design 落全量表。
- normalized_requirement: _module-map.yaml blast 段随本变更交付本仓自举声明；覆盖核心场景验收——api-matrix 八文件面 → S2。
- impacts: [FR-01]
- 模块域: core-engine, docs-consistency
- evidence: 用户 2026-09-19「不要把整个 core-engine 标成 S3。这张表里有 stage-contract.js 也有 datetime.js…」；_module-map.yaml 现有模块划分（runtime/worktree/dispatch 域边界现成）
- 故障面: 声明表与模块演化脱节（新文件落错价）——map 评审流程可见，scan 层不自动改价（宁缺勿错）。
- 退役判据: 无。

## D-011@v1: QUICK_RISK_PATH_PATTERNS 同族登记——管道建好后迁，不单独立刀
- type: architecture
- priority: P2
- status: accepted
- source: user
- question: span 轴的 QUICK_RISK_PATH_PATTERNS（auth/permission/billing/migration/lock/scheduling 路径模式）也是硬编码通用表——同族问题。
- answer: 本变更只在 design 登记同族关系与迁移方向（blast 声明管道落地后，该表迁为项目可配置——本仓自举声明可吸收或保留为缺省种子待定），**不扩刀不单独立刀**。
- normalized_requirement: design 非目标+风险登记各一条；迁移决策留后续变更。
- impacts: []
- 模块域: core-engine
- evidence: 用户 2026-09-19「QUICK_RISK_PATH_PATTERNS 同变更登记，管道有了再迁，不单独立刀」；change-risk-profile.js:70-77
- 故障面: 遗忘——design 与归档蒸馏双登记（archive 时 decisions 提炼进知识库）。
- 退役判据: 迁移变更落地时本条 superseded。

## D-008@v2: rebuild 保留机制实证修正——--force 文本回插（supersedes D-008@v1 的 rebuild 表述，其余条款不变）
- type: architecture
- priority: P0
- status: accepted
- source: code
- question: Grill 实证推翻 v1 的 rebuild 假设：非 force 重建是 dry-run 不写盘（modules.js:181-185）、--force 是唯一写盘路径且 merge 重发射只覆盖 modules 段 per-module 白名单字段（:91-94/:166）——顶层 blast 段在 --force 写盘时必然丢失，「paths 同款先例」不成立（paths 靠段内白名单保留，顶层段无此机制）。
- answer: 修法改为：--force 重发射时从 existingMap 文本提取顶层 blast 段原样回插（未知顶层段通用回插）；回归钉断言「--force 写盘后 blast 段在场且字节不变」。v1 其余条款（map 主声明/local 只升/未命中 S1/禁回退词表/不留 legacy）不变。
- normalized_requirement: 同 D-008@v1，rebuild 机制条款按本条替换。
- impacts: [FR-01]
- 模块域: docs-consistency
- evidence: Grill 首轮 fail 项（modules.js:181-185/:91-94/:166/:416 源码实证）
- 故障面: 文本回插对坏形态 blast 段（手写残缺 yaml）的容错——提取失败时警告并丢弃该段（rebuild 本就是重建语义，宁失勿错），回归钉覆盖健康段。
- 退役判据: 同 D-008@v1。
