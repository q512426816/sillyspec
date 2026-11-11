# 决策知识 — cli-entry

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-cli-entry-002@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
原编号：D-003@v1
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-cli-entry-003@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-001@v1
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-cli-entry-004@v1 : 方案A——独立 CLI + archive 步骤自动生成双入口
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-002@v1
锚点：未记录
最近确认：f4db7c9
理由：预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。

## D-cli-entry-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
原编号：D-001@v1
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-cli-entry-005@v1 : 架构 = 纯函数单一真相 + 独立命令随时查 + 阶段点薄注入
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-003@v1
锚点：未记录
最近确认：3f22d6b
理由：用户提议「独立一个参数或者命令去展示，可以随时查看」。三层：computeChangeScopeAudit 纯函数（单一真相）；sillyspec scope-audit 命令（人类可读 + --json）；execute --done / verify --done / archive --confirm 三处薄注入调同一函数。对齐 verify-probes / module-impact 已验证的「纯函数 + 命令 + 阶段集成」三层模式。

## D-cli-entry-007@v1 scope-audit 命令增强为门禁画像独立出口（表格 + --json，可重放）
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-008@v1
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14 指定（设计确认轮顺带需求）：现有 `sillyspec scope-audit --change <变更名或quick会话id>` 增强为画像出口——表格与 `--json` 两条出口均含 gate 画像（文件数/模块跨度/模块清单/风险命中/门禁级别）与 L1/L2 advisory 发现；利用该命令既有的 quick 会话（quick-<8hex>）与归档变更重放能力，历史会话可回溯审计。与 D-006 校准任务打通：`--json` 批量重放 sillyhub 历史会话即真实图谱交叉表。维持命令 advisory 只读定位，不设门禁。

## D-cli-entry-008@v1 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-002@v1
锚点：未记录
最近确认：318e80c
理由：独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。

## D-change-management-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-002@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-cli-entry-006@v1 change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-001@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。

## D-cli-entry-009@v1 方案选择 = A（burst 交互折叠）
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-011@v1
锚点：未记录
最近确认：9f9450d0
理由：用户选 A（任务书冻结版）：渲染侧剩余步逐个调既有 outputStep + completeStepBurst 循环调 completeStep(printNext:false)，completeStep 本体零 diff；缺省 OFF 本仓自举。用户同时授权全程免询问（后续 requiresWait 决策点按任务书冻结口径自决并如实记录）。
故障面：无（方案选择记录）。
退役判据：无。

## D-cli-entry-011@v2 flow 翻转测试面完整枚举 + config-schema 文案
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-010@v2
锚点：未记录
最近确认：9f9450d0
理由：不完整（Grill P1-2）：调用 flow start/done 且依赖缺省 thin 的测试共三个文件——test/flow-protocol.test.mjs（makeRepo 缺省造法，受影响 ①②③⑤⑥ 五测，任务书原估 ①②③⑥ 漏 ⑤）、test/flow-route.test.mjs（:68 断言 flow start exit 0）、test/flow-draft.test.mjs（⑥ 真 CLI harness）。test/fr-index.test.mjs 核实不受影响（纯单测直调 indexRequirements，不经 flow start/done——本会话亲自核实）。另补 src/config-schema.js:170 flow.mode desc「thin（缺省）」→「legacy（缺省）」文案同步与 src/flow.js:18/:62/:124 三处文案。v1 核心面（缺省翻 legacy、断言本体不动）不变。
supersedes：D-010@v1
故障面：同 v1（未配置用户走厚档=intentional）。
退役判据：薄道转正时再翻回。

## D-cli-entry-010@v1 收口范围=方案B（读面闭环+遍历召回接线）
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-001@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：用户选方案B：读面闭环（本体表 + knowledge-graph.js 派生图 + knowledge graph 子命令 + doctor 图完整性检查）+ matchKnowledgeHybrid 新增 scope 遍历召回层与防复潮保底；平台侧 graph-search 端点与 stats 图维度指标不在本变更范围

## D-unmapped-150@v1 枚举开放世界是错误方向（任务面归还 agent）
状态：implemented
变更：2026-09-26-thin-agent-tasks
原编号：D-001@v1
锚点：未记录
文件：src/flow-draft.js, src/flow.js, test/flow-tick-prototype.test.mjs, test/thin-workunits.test.mjs, .sillyspec/changes/2026-09-26-thin-agent-tasks/design.md, .sillyspec/changes/2026-09-26-thin-agent-tasks/flow-state.yaml, .sillyspec/changes/2026-09-26-thin-agent-tasks/proposal.md, .sillyspec/changes/2026-09-26-thin-agent-tasks/requirements.md, .sillyspec/changes/2026-09-26-thin-agent-tasks/tasks.md
最近确认：replay2
理由：决策记录（本会话第三次同款错误，升格为显式教训防再犯）：用枚举/关键词表穷举开放世界是错误方向——①R17 评审否决「完整标点收尾自检」（标点形态枚举不全）；②复合拆分劈碎「；」分隔的枚举词表（狗粮实证）；③本变更回退 WORK_UNIT_BUCKETS 域分类表（用户指出：任务单元形态不可穷举）。正确模式：开放世界的分类/计划归 agent（人有上下文），机器只锚定可枚举的封闭面（验收标准文本、字段格式契约）。风险=假勾退化（自写自勾可写巨型任务骗进度）——接受：哨兵证据重心本在提交面+测试门（任务面降级为进度信号）；追溯锚在 requirements FR 区不依赖任务面。死路：枚举更多桶/更多关键词——穷举错误不因规模变小而变对，弃。

## D-unmapped-187@v1 知识注入只锚变更入口，设计时点新关键词零检索面——工具引导缺位
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-004@v1
锚点：未记录
最近确认：cb6fc0a0
理由：用户归因（采纳）：不是 agent 个人失误，是工具引导不到位——不然知识库没意义了。结构性缺口三处：① 自动注入只锚「变更入口」——轻量道按 input/FR/changed-files 关键词路由（src/flow.js:137），否决决策注入同源；brainstorm Step2 按 INDEX 路由行＋decisionHits（src/knowledge-match.js:6）；② 设计时点（方案步/设计步/decisions.md 落盘）新产生的机制词（枚举/词表——入口时刻不存在）没有任何强制检索面，knowledge search 在引导协议里零接线；③ AGENTS.md 速查行「命中知识 CLI 会自动注入 prompt，勿自行重复检索」反向劝退主动检索
故障面：--done 门自动检索的误命中（决策条目措辞与库内条目关键词偶然重叠）→ 回显噪音让 agent 习惯性无视所有命中（狼来了效应）——v1 只 warn 不阻断即为此留退路；检索查询串拼装质量差（标题短词）会放大命中噪音
退役判据：若归档遥测显示命中回显绝大多数未被 evidence 回应且未引发实际复潮拦截（信号无行为后果），说明该面无效——退化为纯指引面（去掉机器检索）或直接删除

## D-unmapped-188@v1 执行期裁决——testFailures 数据源从「flow-state substeps」改读 verify-runs 记录面
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-006@v1
锚点：未记录
最近确认：cb6fc0a0
理由：改读 .runtime/verify-runs/<ts>/test-result.json 既有记录面：按目录内 JSON 的 change 字段归属本变更（与归档回收 pruneArchivedChangeRuntime 同源口径），status='failed' 枚举计数——每次失败收口尝试各落一条（writeRunResult 既有落点）。同为既有记录面、同为封闭面计数（D-003 禁区不破），且天然支持多次失败累计；decisions 条目无时间戳，D-007 同理降级

## D-unmapped-189@v1 执行期裁决——--done 门检索查询串含 decisions.md 全部当前条目（非「自上次 --done 新增」）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-007@v1
锚点：未记录
最近确认：cb6fc0a0
理由：v1 查询串=--output 全文＋decisions.md 当前全部条目的「D-xxx 标题+question」拼串。命中面是超集（旧条目命中也会回显），由三层降噪兜底：① v1 恒 warn 不阻断（D-004 故障面自留退路）② rejected 条目优先展示（防复潮信号最相关）③ commands.knowledge-gate: off 可整体关。若归档遥测显示噪音占主导，按 D-004 退役判据收窄

## D-unmapped-190@v1 方案选择——Ⅱ 事后闭环主（前门弱盘问＋事后强信号）
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-005@v1
锚点：未记录
最近确认：cb6fc0a0
理由：用户选 Ⅱ。要点：需求清晰度是谱值且只能事后证伪——事前任何硬判定都是布尔处置（用户两次推进否决词表与声明硬门）；前门只做盘问重述（自检问题从「需求清晰吗」换成「还有没有必须问用户才能动手的问题」，不阻断不设新节），强信号放事后：归档时封闭面指标（design 重写比/tasks 改写率/盲维命中/返工次数——diff 比例与计数，非词表）判「疑似该走预段未走」落库，下次 flow start 渲染点名提示，形成每仓自我校准回路。FR-03（设计时点知识检索面，D-004）随行收进本变更
故障面：事后指标误标（用户中途合法改需求被记为「疑似该走预段未走」）→ 下次 start 提示成为噪音，agent 学会无视——「疑似」措辞与可无视设计是减压阀但也是衰减路径；指标快照时机错误（如 design 首快照取在收口后）会让重写比恒 0
退役判据：若遥测显示被标记变更的下一变更仍高频复现同形态（提示未改变选道行为），说明闭环无效——考虑退回纯指引或升为硬门（届时重新过方案轮）

## D-unmapped-316@v1 跨仓对账集成段收敛单一导出函数，轻量道接入真实三态
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
原编号：D-002@v1
锚点：src/flow-parity.js:buildThinSnapshotRows
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：内联段抽导出 `reconcileCrossRepoPlan`（scope-audit.js），heavy 改调用行为等价、thin（flow.js done 路径）同源接入；复用 collectRepoActual 共享内核（2026-09-20「单一真相源」哲学延续），跨仓行升级真实三态，降级仓诚实 ⊘+degradedReason。
故障面：轻量道新增跨仓 git 调用拉长 flow done 时延（R-03，仅有跨仓声明触发 + GIT_TIMEOUT 兜底 + fail-soft 不阻断）
退役判据：跨仓对账内核升级（如 A 档锡点全量覆盖轻量道）时随内核自然演进，本函数仅组装层

## D-unmapped-353@v1 极速模式触发权=仅用户显式触发
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-001@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：不能。仅用户显式表达极速意图（「极速/别验证/只要 spec 和代码」类原话）时 agent 才触发；agent 不得自行启用。

## D-unmapped-354@v1 极速跳过面=实测面+重仪式门，spec 面与 distill 必留
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-002@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：跳过=test+lint 实测（runQuickTestLintGate）、hunk 归属门、dirty 收口阻断门（降 advisory 留痕）、ui 视觉探针门、评审子步（凭用户声明豁免留痕）。必留=spec 文档结构校验（verifyThinDocsV2）、tasks 全勾门、ledger 门、distill（决策+FR 索引+模块回写）、archive。distill 判为核心：纯机械文件操作毫秒级、非验证而是知识复利进料口（knowledge search 自动注入未来 prompt + FR 索引支撑动态测试面推断）。

## D-unmapped-355@v1 双层承载——提示词面触发语义，CLI 侧 flag 硬承载
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-003@v1
锚点：未记录
文件：AGENTS.md
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：提示词与 CLI 分层：提示词面（AGENTS.md 选道表/flow 命令卡）负责让 agent 理解何时、如何请求极速并转达用户意图；CLI 侧 `flow start --turbo` flag 落 flow-state 留痕（声明即过），`flow done` 读态生效跳过面。纯提示词无法跳过 CLI 硬门，纯 CLI flag 无触发语义——两层缺一不可。
故障面：用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
退役判据：若实测极速模式使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-unmapped-356@v1 作用域=薄道+头脑风暴预段，厚道零改动
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-004@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：仅薄道（flow start/done）与头脑风暴预段（brainstorm 轻量跑通道+单轮合并问询+一次收口）；完整五阶段厚道明确不做极速版。

## D-unmapped-357@v1 方案取舍——选 A（--turbo flag + flow-state 留痕）
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-005@v1
锚点：未记录
文件：AGENTS.md
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：方案 A。flow start --turbo 落 flow-state 留痕（声明即过）+ flow done 读态按 D-002 跳过面早退逐项 skipped 留痕 + 提示词面（AGENTS.md 选道行/命令卡）同步教触发判据（禁 agent 自启）。理由：唯一同时满足提示词触发语义、跳过验证仪式、仅薄道、预段也极速四条原始需求且留痕可审计的形态。
故障面：用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
退役判据：实测极速使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-unmapped-358@v1 审计冻结件（change.patch/change-patch.json）极速模式保留
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-006@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：保留。生成是纯 git 机械操作（毫秒-秒级，无 agent 往返）；它们是 distill 模块对账回写（change-patch.json files[] 喂模块卡回写/extraDocs 推导）的单一时点数据源 + 归档审计件。极速跳的是「验证」不是「证据」。

## D-unmapped-359@v1 turbo 跳过面以 tier!=='thick' 为前提（升厚即失效）
状态：implemented
变更：2026-10-14-thin-turbo-mode
原编号：D-007@v1
锚点：未记录
最近确认：d49dd2b2cb7f870dcba1943e8e1309da49a3c714
理由：不生效。turbo 读态判定为 `turbo === true && st.tier !== 'thick'`——升厚即恢复全量仪式，turbo 残留不短路厚档；`--turbo --thick` 同给同理（留痕但不生效）。

## D-unmapped-432@v1 执行期用户决策落盘走提示级三触点纪律
状态：implemented
变更：2026-10-20-thin-user-decision-record
原编号：D-001@v1
锚点：未记录
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f
理由：提示级三触点：start 横幅纪律行＋断点②对账半句＋tick 条件提示（decisions.md 存在性 gating）。CLI 看不见会话，漏记是纯沉默面；漏记代价是防复潮资产价值漏损非正确性事故，按本仓分工原则（能验证据才上机器门，弱信号纯提示）提示级即正确档位

## D-unmapped-433@v1 收口机器门拦 decisions.md 缺席
状态：rejected
变更：2026-10-20-thin-user-decision-record
原编号：D-002@v1
锚点：未记录
最近确认：93533f6d70f1c0af1315ddfb5b6e6fe7527ac07f
理由：是否在 flow done 加 decisions.md 缺席拦截门？
否决理由：漏记本身不可检测——门只能看见文件缺席、看不见漏记；缺席合法是轻量道懒创建刻意设计（槽4收割/decisions add 按内容触发），硬门误伤合法缺席且制造假安全感
复潮条件：机器获得会话侧信道或可验证的用户决策事件源（如平台审批事件回流）使漏记可检测时

## D-cli-entry-012@v1 2026-11-04-sync-fail-silent-fix——三处小修：① index.js platform sync 全树分支补 `r.ok === false` 判定——失败行+exit 1（既有 warn 已含原因
状态：implemented
变更：2026-11-04-sync-fail-silent-fix
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-04-sync-fail-silent-fix/design.md
文件：src/index.js, src/spec-sync.js, test/sync-fail-silent.test.mjs
最近确认：cccdeb844f9bef0c44ac63b81acb1c926433bfdf
理由：三处小修：① index.js platform sync 全树分支补 `r.ok === false` 判定——失败行+exit 1（既有 warn 已含原因链，此处只补结果语义与退出码）；② spec-sync.js 清单 GET 超时按形态分档——全量（无 since）取 120s、增量维持 10s（对齐 bundle 端点大小超时先例：大响应体独立档，非拍脑袋放大）；③ POST !res.ok 的 detail 提取扩一层——响应体 detail 字段含 op 级文本（path=…）时透传进 warn 行。三处共同根治「失败被成功横幅掩盖」：生产实证缓存漂移+慢链路+422 连坐三因叠加时，用户只见「0 个文件差异」，漏推不可见（2026-11-04 知识索引漏推确诊回执）。

## D-cli-entry-013@v1 2026-11-06-knowledge-propose-body-file——在 `cmdPropose`（src/stages/knowledge.js:534-590）的参数解析段新增 `--body-file <路径>`：与既有 `
状态：implemented
变更：2026-11-06-knowledge-propose-body-file
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-06-knowledge-propose-body-file/design.md
文件：src/index.js, src/stages/knowledge.js, test/knowledge-propose-body-file.test.mjs
最近确认：f1acc9d4f35f45560109db808cbebb5ae5a603e8
理由：在 `cmdPropose`（src/stages/knowledge.js:534-590）的参数解析段新增 `--body-file <路径>`：与既有 `--title/--category/--body/--from` 同款 indexOf 取值，读文件（readFileSync utf8）作 body，后续 slug 生成/frontmatter 拼接/writeAtomicSync 落盘全部复用既有 --body 路径零改写。校验序前置：`--body` 与 `--body-file` 同给 → `body_source_conflict`；文件不存在 → `body_file_missing`；读抛错 → `body_file_read_failed`——三类错误全部在 `mkdirSync(proposedDir)` 之前返回，错误路径零目录创建零落盘。选该方案是因为它是平台会话工具反馈原话建议的形态（「支持 --body-file 从文件读正文，彻底绕开命令行传参」），且是唯一同时规避「命令行长度上限」与「策略层对命令行文本的误判」两个问题的通道——正文不经过 argv。

## D-cli-entry-014@v1 2026-11-11-push-shell-token-tolerance——两处代码修复，均在 `src/push.js`，加少量 `src/index.js` 渲染： 1. **参数容忍**：在 `parsePushArgs` 的现有
状态：implemented
变更：2026-11-11-push-shell-token-tolerance
原编号：D-000@v1
锚点：.sillyspec/changes/2026-11-11-push-shell-token-tolerance/design.md
文件：src/git-helper.js, src/index.js, src/push.js, test/push-cli.test.mjs, test/push-plan.test.mjs
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644
理由：两处代码修复，均在 `src/push.js`，加少量 `src/index.js` 渲染： 1. **参数容忍**：在 `parsePushArgs` 的现有循环内、flag 解析之后增加两级判定——遇到 `|`/`||`/`&&`/`;`/`&` 立即 `break`（shell 语义下当前命令参数到此结束，丢弃其后 token）；遇到 shell 重定向 token（`2>&1`、`1>&2`、`2>/dev/null`、`>nul`、裸 `>`/`>>`/`1>`/`2>` 及其目标文件等）则 `continue`（裸重定向符额外跳过后一个目标文件 token）。每次忽略/截断向 `warnings` 推一条可读告警。判定放在 flag 解析之后，保证 `--change <值>` 这类合法值不会被误剥离。返回结构增加 `warnings` 字段，由 `index.js` 在 human 模式打印。 2. **错误详情**：`pushBranch` 不再用 `stdio: inherit`（该模式让 `execFileSync` 拿不到 stderr，错误只剩 `Command failed` 首行）。改为默认 pipe 捕获，结束后把捕获的 stdout/stderr 转发到进程 stderr（human 模式）；失败时把 detail 合入错误信息，`--json` 模式保持 stdout 纯 JSON、不转发。 选择「循环内判定」而非「解析前整串预剥离」：预剥离会误吞 `--change 2>&1` 这类合法值（值位置还未被 flag 消费），内联判定天然尊重 flag 值消费顺序。
