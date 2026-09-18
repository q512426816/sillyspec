---
author: qinyi
created_at: 2026-09-17 22:52:35
generated_by: sillyspec-fourpiece-init
change: 2026-09-18-fr-index-l1
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

<!-- 背景（三轮评审+战略定位轮定稿）：requirements.md 归档后浅解析零提炼、FR 无跨 change 稳定身份、
     被取代需求无人标记。L1 = 稳定 FR id + knowledge 索引 + 取代标记，同一变更做完（评审护栏：
     躲不掉稳定 id，无取代的索引是坟场）。战略定位：L1 是 L3 的证据发生器——跑 20-30 个 change
     后用遥测数据（注入命中/拦截重复/取代跟随）裁决「索引事实上是否已是真源候选」，L3 从抽象
     辩论变工程题。 -->

## D-001@v1: 稳定 FR id 归档发号，幂等键=全局 id
- type: architecture
- status: accepted
- 问题: FR-NN 是 change 局部编号（change A 的 FR-01 ≠ change B 的 FR-01），无跨 change 身份则索引/取代/召回全部无处着力。
- 选定: 全局 id = `FR-<域>-NNN`（域=_module-map 模块 id，unmapped 兜底沿用 decisions 先例）；archive 时 CLI 发号（同域计数器 max+1）；幂等键=全局 id（同变更重跑 no-op）；change 局部 FR-NN 仅作来源映射不做身份。
- alternatives: 保留 change 局部号+变更名前缀组合键（否决——消费方无法稳定引用，且号随变更名长）；brainstorm 期预发号（否决——未归档的 FR 半数会改名/删除，发号噪音大；归档=冻结=发号时机）。
- normalized_requirement: 归档后每条入选 FR 拥有全局稳定 id；同变更重复提炼零新增零漂移。
- impacts: [FR-01, FR-03]
- evidence: decision-distill.js 幂等先例（条目幂等键=号+变更）；评审「幂等键应是稳定 FR id，change 只做来源/取代链」裁决
- 故障面: 域归属误判把 FR 发进错域文件——域解析复用 moduleIndex 同源（design 文件清单×_module-map），unmapped 兜底可见可迁移。
- 退役判据: L3 活规格树落地时全局 id 平移为树内条目 id，本索引降级为检索面。

## D-002@v1: 取代靠显式承接引用，未声明删除 L1 无感知（只观察不门禁）
- type: architecture
- status: accepted
- 问题: 需求是活对象，后来 change 改掉/删掉某行为时旧条目需标记，否则索引腐烂成坟场（评审：无取代的索引就是坟场）。但「未声明的删除」检测是 L3 合并门禁领地。
- 选定: requirements.md 的 FR 块支持 `承接: FR-<域>-NNN[, ...]` 行（brainstorm 注入清单给全局 id 供引用）；archive 时承接引用→旧条目状态翻 superseded + superseded_by=新 id + 链注记（多承接=多旧条目同批翻）。未引用旧 FR 的删除/修改 L1 不判不断（设计显式声明边界，数据留给 L3 裁决）。
- alternatives: 标题相似度自动判取代（否决——误判率不可控且取代是语义裁决不是机械事实）；删除也强制声明否则阻断（否决——L3 门禁领地，L1 越界会复制 OpenSpec 未修的并行覆盖坑）。
- normalized_requirement: 承接行命中→旧条目 superseded+链完整；无承接→索引不动（观察到遥测即可）。
- impacts: [FR-01, FR-02]
- evidence: OpenSpec MODIFIED/REMOVED 手写 delta 先例（可照抄的已知设计）+其并行覆盖未修教训（openspec-parallel-merge-plan.md）
- 故障面: 承接行写错 id（域拼错/号不存在）→ 发号时校验：引用不存在=warn 留痕不阻断（typo 不该炸归档）。
- 退役判据: L3 合并门禁落地时承接升级为声明义务（undeclared deletion 拦截）。

## D-003@v1: 存储镜像 decision-distill（knowledge/fr/ 域文件+INDEX 路由），零新树
- type: architecture
- status: accepted
- 问题: L3 之前不该建活规格树（第三真相源冲突未裁决），但索引需要可注入可解析的落盘面。
- 选定: `knowledge/fr/<域>.md`，条目=「## FR-<域>-NNN 标题」+字段行（来源变更/状态/superseded_by/摘要=场景名列表/最近确认），docs-check 机械解析契约同 decisions 域文件；INDEX.md 路由行同步（关键词含 FR|需求|承接|<域>）；复用 splitKnowledgeSections/joinKnowledgeFile/syncIndexRoutingLines 底座函数（从 decision-distill 提取共享或参数化复用）。
- alternatives: 独立 specs/ 索引树（否决——L3 领地，提前建树=提前触礁真源裁决）；纯 DB 索引（否决——知识面要可读可 grep 可 docs-check，且 quick/brainstorm 注入管线已对接 knowledge 文件形态）。
- normalized_requirement: 索引条目可解析（机械契约）、可路由（INDEX）、可注入（knowledge-match 兼容）、可对账（parity/doctor 可扫）。
- impacts: [FR-01, FR-04]
- evidence: knowledge/decisions/<域>.md 格式先例 + INDEX.md 路由行先例 + decision-distill.js splitKnowledgeSections 底座
- 故障面: 与 decisions 域文件格式漂移——fr/ 子目录隔离 + 头注释钉契约；docs-check 覆盖面含 .sillyspec/docs 但 knowledge/ 是否在扫面按现行配置不动（不扩）。
- 退役判据: L3 落地时 fr/ 索引整体迁移进活规格树，路由行重指。

## D-004@v1: 注入=brainstorm step8 定向 digest，superseded 默认藏
- type: architecture
- status: accepted
- 问题: 防「写重复 FR」的前提是写作期能看见现行 FR；全量索引注入会撑爆 prompt。
- 选定: brainstorm step 8（生成规范文件）注入 `{FR_INDEX_DIGEST}`——按 design.md 文件变更清单×_module-map 解析触达域，注入这些域的 **active** 条目（id+标题+来源变更+场景名），superseded 默认藏（评审裁决）；无触达域或索引空→段不出现（同 knowledge 注入纪律）。注入动作记 fr-inject 遥测。
- alternatives: step 2 全库关键词匹配注入（否决——requirements 写作在 step 8，早期注入会掉出上下文窗口；且 knowledge-match 已覆盖泛关键词面，L1 增量是「触达域的确定性清单」不是又一层模糊匹配）；注入含 superseded（否决——评审裁决默认藏，防噪音；需要历史时 agent 自行读 fr/ 域文件）。
- normalized_requirement: step8 prompt 含触达域 active FR 清单；superseded 条目不出现在 digest；每次注入落 fr-inject 遥测（条数+域）。
- impacts: [FR-02, FR-04]
- evidence: prompt.js 占位符管线先例（{TASKS_CHECKBOX}/{DECISION_HITS} 等）+评审「注入是否默认藏 superseded」裁决
- 故障面: 触达域解析错（design 清单漏写文件）→ digest 缺域——digest 末行注记「域解析自 design 文件清单，漏域先核对清单」自纠。
- 退役判据: L2 模块卡挂指针后 digest 与卡片契约摘要合流。

## D-005@v1: 重复 FR 检测=advisory 词重叠启发式 + 计数（不硬拦）
- type: scope
- status: accepted
- 问题: 「拦截的重复 FR 数」是 L3 裁决的核心观察指标，但语义级重复判定 L1 做不了也不该做。
- 选定: 机械启发式——新 FR 标题与同域 active 条目标题的分词重叠率 ≥60% 且无承接行 → step8 --done 门禁 advisory warning（不阻断）+ fr-duplicate-warning 遥测计数。中文分词用轻量 bigram 切分（无依赖），阈值 60% 钉在常量可调。
- alternatives: 无检测纯人工（否决——指标无数据源，实验失效）；LLM 判重（否决——门禁层不许依赖模型判断，且成本不成比例）；硬拦（否决——误拦 new change 的正常演进，评审裁决 L1 只 advisory）。
- normalized_requirement: 重叠≥阈值且无承接→warning 文案（提示引用承接或改名）+遥测；其余零打扰。
- impacts: [FR-02, FR-03]
- evidence: 审查派发 advisory 先例 + change-risk-profile 同句否定抑制的分词先例（CJK 处理可参照）
- 故障面: 误报（正常同域相似标题）——advisory 不阻断+文案给两条出路（承接或改名）即自纠；漏报——启发式本就不求全，计数趋势比单次判定有价值。
- 退役判据: L3 门禁升级为语义对账时本启发式退役为预筛。

## D-006@v1: 观察指标是验收面——三指标进 design 进 verify
- type: process
- status: accepted
- 问题: L1 的战略价值=L3 证据发生器，指标若只是「以后看看」必然烂尾。
- 选定: 三指标为一等验收对象：①fr-inject（每次注入条数+域）②fr-supersede（承接链跟随事件）③fr-duplicate-warning（启发式命中）——全部走 appendKnowledgeHit 透传（type 字段自由，零底座改动）；verify 报告「Runtime Evidence」节须含三指标的实测序号；knowledge-stats 聚合面后续变更再接（本期只落事件流）。
- alternatives: 单独 metrics 文件（否决——knowledge-hits.jsonl 事件流底座现成，字段透传零成本）；指标等有数据再补（否决——评审「立项时就写进 design」裁决）。
- normalized_requirement: 三类事件在真实流程动作中各至少落一条（fixture 或本变更自身归档即首样本）；读回验证字段完整。
- impacts: [FR-03, FR-04]
- evidence: knowledge-hits.js appendKnowledgeHit 透传契约（type 字段自由原样序列化）+战略定位轮裁决
- 故障面: 事件流无人读——本期 verify 实测读回+knowledge-stats 接入列为后续变更钩子。
- 退役判据: L3 裁决完成日，三指标完成历史使命归档进裁决文档。

## D-008@v1: 证伪条款+指标可算性+删除缺口探针（审核三护栏）
- type: process
- status: accepted
- 问题: 三条护栏：①实验可能失败但「已有索引就不能不盖房」的沉没成本绑架无出口；②三指标中拦截/取代两项若无机制发生器，计数恒零实验失真；③L1 不许假装能拦漏删，但删除信号是 L3 裁决最缺的数据。
- 选定: ①**证伪条款**：20-30 个 epoch 后 change 观察期，若 fr-inject 注入后承接引用率趋零、fr-supersede 事件稀少、重复 FR 仍靠人眼发现——明确裁决**杀掉或冻结 L3**，fr 索引降级保留为检索面（L2 素材），此为合法结局非失败；②**指标可算性依赖声明**：fr-inject←step8 注入动作、fr-duplicate-warning←step8 --done 软门、fr-supersede←归档承接机制——三机制任一被移除对应指标归零即实验失真，机制与指标互为存在理由；③**删除缺口探针**：archive 时对触达域 active FR 未被本次承接引用的条目计数，一行 advisory 注记+fr-unreferenced 遥测——**显式标注「观察信号，不算 L3 门禁」**（L1 无删除声明义务，D-002 边界不变）。
- alternatives: 只写成功路径（否决——护栏①明确要求证伪出口）；探针做硬门（否决——护栏③上限就是 advisory，越界即偷渡）；探针不做（弃权——删除信号是 L3 最缺数据，advisory 零成本采集）。
- normalized_requirement: 证伪条款入 design 且裁决文档化；三指标×三机制对应关系写入验收；fr-unreferenced 事件流落盘且 archive 输出带「不算门禁」标注。
- impacts: [FR-03, FR-04]
- evidence: 审核三护栏原文（2026-09-18 立项审核）；D-002/D-006 边界与底座
- 故障面: fr-unreferenced 噪音大（触达域≠全量行为变更）——本就是趋势信号非判定，遥测字段带 domain+count 供 L3 裁决时按域加权。
- 退役判据: L3 裁决日无论成败，四类事件+本条款一起归档进裁决文档。

## D-007@v1: D14 第四检查=epoch 分界加行，存量豁免走既有账本
- type: architecture
- status: accepted
- 问题: 「归档 change 的 FR 索引条目在场+取代已标记」需要事后可查，但 93 份存量归档不回填（评审裁决不补历史）。
- 选定: FR_INDEX_EPOCH='2026-09-18' 常量；archive_integrity 维度加第四检查——日期前缀 ≥ epoch 的归档：其变更名必须在 fr 索引的「来源变更」字段出现（在场），且若该变更 requirements 含承接行则对应旧条目 superseded 已标（取代完整）；违者 warning 级并入现有 offenders 机制（豁免走既有 archive-integrity-exempt.yaml，机制零新增）。
- alternatives: 全量回填索引（否决——伪造历史同 plan.md 教训）；建独立豁免清单（否决——D14 豁免账本机制现成，加一类条目即可）；informational 不进 offenders（否决——评审预留口径就是第四条检查，warning 合适）。
- normalized_requirement: epoch 前归档零检查；epoch 后归档缺索引条目或取代未标→warning offender；机制复用零新账本。
- impacts: [FR-04]
- evidence: D14 预留口径（「到时候是加一行不是改架构」）+豁免账本先例（archive-integrity-exempt.yaml）
- 故障面: 本变更自身归档即首个 epoch 后样本——索引写入失败会当场被 D14 新检查抓到（自举验证）。
- 退役判据: L3 活规格落地后此检查并入树完整性检查。
