---
author: zcode-pascap-batchC
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-api-coverage-smoke
---

# 决策记录（Decisions）

<!-- 背景（批次 C，防复发五层方案的第三批）：批次 A（2026-09-17-pass-cap-semantics，v3.28.11 已发布）封死了
     「已知未验证区静默 PASS」；批次 C 补「运行时验证的地板」——接口验证覆盖矩阵定「测什么」（表驱动），
     commands.smoke 定「怎么跑」（CLI 亲跑+回执核验）。EHS 复盘结论：5 个 P1 长在跨层契约漂移与运行时行为，
     唯一机械防线是接口级冒烟；批次 A 的 evaluatePassEligibility 纯函数已预留统一插位（加一个 facts 条件即可）。 -->

## D-001@v1: commands.smoke 配置键——CLI 亲跑与 commands.test 同哲学
- type: architecture
- status: accepted
- 问题: 运行时验证需要真实执行冒烟脚本，执行主体是谁？agent 自报无核验（EHS 实证「集成证据自报告、CLI 只校验字面存在」的坑）；CLI 亲跑才与「不信口头」一致。
- 选定: local.yaml 新增 `commands.smoke: <命令>`（string，缺省无行为变化）；执行点挂 `executeVerifyQualityScan`（src/run/verify-quality-scan.js，与 commands.test 同段亲测对账）——**指纹自动覆盖**（computeQualityScanFingerprint 已含 commands 段，新键零改动生效：代码与脚本未变 → 复用上次回执不重跑）。脚本自理服务生命周期（后台起服+轮询就绪+断言+finally 杀），CLI 视角=一条命令+exit code。
- alternatives: agent 跑+回执四条件核验（否决为主路径——伪造面大；保留为补充：agent 可在 verify-result 附额外回执，四条件照核）；全量测试框架（否决——EHS 实证 mvn test 被框架 parent 干掉，脚本冒烟是地板不是全家桶）。
- normalized_requirement: 配置 commands.smoke 后 verify 质量扫描步 CLI 亲跑该命令并记录 exit/log/mtime；未配置零行为变化；指纹命中复用不重跑。
- impacts: [FR-01, FR-02]
- evidence: src/run/verify-quality-scan.js:59-112（指纹与实测记录形态）、src/config-schema.js:65-75（commands 段登记位）、本会话批次 C 设计讨论（用户确认「接口冒烟为地板」）
- 故障面: 冒烟脚本起服慢拖累 verify——prompt 指引并行起服（脚本内部后台起+轮询，墙钟增量≈冒烟本体）；脚本挂死——CLI 亲跑超时帽（与 gate_snapshot.commands 同款 300s 先例）+ 失败即封顶信号。
- 退役判据: 若未来 E2E 平台化（浏览器 Tier 2）统一接管运行时验证，smoke 键并入彼处。

## D-002@v1: facts.smokeRan 第五事实条件——初版封顶不 fail
- type: architecture
- status: accepted
- 问题: 「smoke 缺失」如何进入批次 A 的封顶？直接 fail 过狠（存量变更无 smoke 基建会全炸）；不进封顶则键形同虚设。
- 选定: producer 侧写 `facts.smokeRan`（'ran'|'not-ran'|'not-configured'）；`evaluatePassEligibility` 加第五条件：**判级 integration/deployment-critical 且 smokeRan≠'ran'** 且无对应 handover → 触发封顶（PASS 不可写，出路=补跑 smoke 或 handover 承载）——与 runtimeEndpointExcluded 同款「判级限定」形态，复用批次 A 的 triggered 枚举与修复指引链。`not-configured`（未配 commands.smoke）在判级 critical 时同样触发（EHS 类变更没有借口不带冒烟），错误文案给配置指引。攒一轮实证（R 评估）后由后续变更评估升「无回执则 fail」。
- alternatives: 直接 fail（否决——初版假红风险未实证）；仅 advisory（否决——批次 A 已实证提示语无阻断力）。
- normalized_requirement: 判级 integration/deployment-critical + facts.smokeRan≠'ran' + 无 blocking handover 承载 ⇒ 结论=PASS 时 error；非判级零行为。
- impacts: [FR-02]
- evidence: 批次 A src/stage-contract.js evaluatePassEligibility（第五条件插位）、runtimeEndpointExcluded 附加条件同款先例、本会话「smoke 硬门先封顶不 fail」用户确认轮
- 故障面: 判级误伤（关键词误判 critical 的变更被要求 smoke）——既有显式 risk_level 降级逃生通道保留（unit-sufficient 不触发）。
- 退役判据: smoke 回执判定面稳定后升 fail 档（D-001@v1 退役判据同源）。

## D-003@v1: smoke 回执由 CLI 亲跑自动落盘——消灭 agent 手填伪造面
- type: architecture
- status: accepted
- 问题: EHS 实证三条 compile+单测 log 混过回执四条件（批次 A 已用 sourceTag 堵口径）；但回执本身仍是 agent 手填路径——CLI 亲跑 smoke 的 log/mtime/exit 应机器落盘。
- 选定: quality-scan 亲跑 commands.smoke 时自动写回执记录（log 路径=runtime verify-logs、mtime=执行时点、exit code 实录）——verify-result 回执槽由 CLI 预填机器段（agent 只可追加不可改写，同探针预填防篡改口径）；auditRuntimeReceipt 四条件核验照常。smoke 命令来源天然 'cross-layer'（D-001 判定表退役判据兑现）。
- normalized_requirement: 配置且实跑过 commands.smoke ⇒ 回执槽含 CLI 机器段（log/mtime/exit 实录）；缺配置/未跑 ⇒ 槽段标 not-configured/not-ran。
- impacts: [FR-03]
- evidence: change-risk-profile.js auditRuntimeReceipt（四条件）、verify-quality-scan.js 实测记录形态、探针预填防篡改先例（verify-probes 骨架注释）
- 故障面: CLI 亲跑与 agent 后续补跑的回执并存——机器段只认 CLI 记录（sourceTag='cross-layer' 标记），agent 追加段单独标注来源。
- 退役判据: 若回执槽整体重构为 facts-only，机器段并入 facts.smokeReceipt。

## D-004@v1: 接口验证覆盖矩阵——表驱动行数 fail-closed + 用例锚点
- type: architecture
- status: accepted
- 问题: 冒烟「测什么」无依据物则退回 agent 自由发挥（EHS 复盘：单测有转移表可依所以扎实，接口层无依据物所以没人派生用例——P1 全长在这层）。
- 选定: verify-result 骨架新增「接口验证覆盖矩阵」章节，行机械预填自 design 接口定义表（tolerant 解析，见 D-005）：每行 = 端点×方法；agent 填「用例依据 ID + 结果 + 证据锚点」。**行数对账 fail-closed**：接口表解析出 N 行 ⇒ 矩阵必须 N 行（缺行=error「该端点无接口验证覆盖」）。锚点校验同 probe7 三形态（依据 ID 形态：`design接口表#N` / `权限矩阵[角色×动作]` / `契约表@行` / `DDL@列` / `载荷@<payload构造点路径>`）。无依据 ID 的用例可存在但须标注「探索性」且**不算覆盖**（防拿发明用例充数/挑好测的测）。
- alternatives: 矩阵 advisory 起步（否决——批次 A 模式是存在性门槛先硬、逐行关联后软；行数对账是纯机械事实无假红面）。
- normalized_requirement: 接口表解析 N 行 ⇒ 矩阵 N 行全填且每行含依据 ID 与证据锚点，否则 verify gate error；探索性用例标注不计覆盖。
- impacts: [FR-04]
- evidence: probe7 骨架/预填/锚点三形态同构先例（verify-probes.js:916-956）、批次 C 设计讨论（五面依据+锚点对账用户确认轮）
- 故障面: 接口表写法千奇百怪解析不全 → 行数偏低漏覆盖——tolerant 解析 + 解析失败降级（D-005）；矩阵行与 probe7 行混淆——章节独立命名+骨架注释口径注记（同 probe3/probe7 并排先例）。
- 退役判据: 若接口定义迁入结构化产物（design-frontmatter/api.yaml 类），矩阵预填源切换。

## D-005@v1: 接口表 tolerant 解析 + 失败降级声明
- type: architecture
- status: accepted
- 问题: design 接口定义表无 normative 格式（批次 A 复盘确认「探针 1 解析的是文件清单不是接口表」），强格式契约会打爆存量变更。
- 选定: tolerant 解析器认常见形态（markdown 表格行含 `GET|POST|PUT|DELETE|PATCH` + 路径样式 token）；解析失败/零行 → **降级为 agent 手填行数声明**（「本变更接口面：N 端点」声明行，矩阵按声明行数对账）——fail-closed 不静默跳过；解析成功与声明并存时以解析为准并注记。设计侧同步在 design 骨架/指引补一句接口表建议列式（软引导不强校验）。
- alternatives: normative 格式硬契约（否决——存量兼容面大，先攒格式实证）。
- normalized_requirement: 接口表可解析 → 机械预填；零解析 → 声明行兜底对账；两者皆无且变更有接口面 → error。
- impacts: [FR-05]
- evidence: design-facts parseFileChangeListDetailed tolerant 先例、批次 C 设计讨论（「机械预填需接口表格式契约」风险登记 R 对应）
- 故障面: agent 声明行数造假（声明 0 端点躲矩阵）——与 fix.sql 声明门同理定位「防遗忘非防伪造」；判级 critical 变更声明零端点时 warning 提示复核。
- 退役判据: 格式实证充分后升 normative（存量豁免窗口关闭）。

## D-006@v1: 消费面维度——端点×消费端展开，payload 构造点为锚
- type: architecture
- status: accepted
- 问题: EHS 实证 P1-1/P1-2 抓不到的根因之一是「按 design 字段名发载荷接口当然通」——消费面（前端实际发的形状）才是字段漂移的暴露面；且提取点必须是 payload 构造处（model save effect/表单 handleSubmit），services 封装层零字段名（批次 C 设计讨论实证纠偏）。
- 选定: 矩阵行展开两级——级 1 = 端点（D-004）；级 2 = 消费端行（该端点的每个消费端一行：`web`/`mp`/`script` 等，来源=design 清单文件面 + task 卡 repo 声明机械归类）；消费端行证据锚点要求 `载荷@<构造点文件路径>`（指向 payload 构造代码，非 services 层）。第一版消费端行 **advisory**（未填 warning 提示，不阻断）——攒实证后升硬（同 D-003 批次 A 存在性门槛→逐行关联的节奏）。
- alternatives: 消费面直接硬门（否决——归类启发式假红未实证）。
- normalized_requirement: 端点行 fail-closed（D-004）；消费端行 advisory——有消费端的端点未填消费行 → warning 列出。
- impacts: [FR-04]
- evidence: EHS P1-1（RpForm/model.js 字段错位）与 P1-2（rpAdd handleSubmit 缺 reportOrgId）实证、批次 C 设计讨论纠偏轮
- 故障面: 消费端归类错（文件面启发式）→ advisory 仅提示无阻断，假红无害。
- 退役判据: 批次 B（probe8 代码级直比）落地后消费面维度由 probe8 机械覆盖，矩阵消费行退役。

## D-007@v1: 表间交叉完备性校验（advisory）——治「表缺行」型缺陷
- type: architecture
- status: accepted
- 问题: 派生框架忠实继承 design 表的洞——EHS P1-4（submit 越权）大概率是权限矩阵缺 submit 行而非「格没人派生」；表自身完备性无机械检查。
- 选定: advisory 探针（并入矩阵预填段输出）：接口表的每个**写端点**（POST/PUT/DELETE/PATCH）检查在 design 权限矩阵段有对应行（路径或动作 token 命中）或显式豁免标记（「无权限约束」）；缺 → warning「写端点 X 未在权限矩阵声明——补行或显式豁免（表缺行会让派生框架继承你的洞）」。第一版 advisory（权限矩阵段定位启发式弱，攒格式实证）。
- normalized_requirement: 写端点无权限矩阵行且无豁免标记 → verify 输出 warning（不阻断）。
- impacts: [FR-06]
- evidence: EHS P1-4 根因推断（批次 C 设计讨论「派生框架免疫力」轮）、verify-probes advisory 先例（probe8/probe9）
- 故障面: 权限矩阵段识别不准 → 误报/漏报 warning——advisory 无阻断，格式实证后收紧。
- 退役判据: 权限矩阵结构化后升硬门。

## D-008@v1: smoke 脚本纪律进 prompt——表驱动派生 + 负向下界 + 并行起服
- type: consistency
- status: accepted
- 问题: 脚本断言无依据物会退回自由发挥；起服串行会把 110s 冷启全算进墙钟。
- 选定: stages/verify.js prompt 补 smoke 纪律段（verify-precedents 注入点同挂）：①断言派生表——design 接口表每行≥1 happy-path（含出参形状断言）/权限矩阵每行≥1 反例（非授权操作应拒）/契约表必填每项≥1 空值反例/转移表每边≥1 状态断言/需求字面（单号格式等）→ 格式断言；②负向下界——每写端点≥1 权限反例（E4 类）+ 全链≥1 注错全量回滚断言（E5 类）；③执行口径——脚本后台起服+轮询就绪+finally 杀（墙钟增量≈冒烟本体）、DB 会话自设严格 sql_mode、载荷从消费端构造点导出（手写正确字段的测试抓不住字段漂移）；④断言锚点注释（每步挂依据 ID）与矩阵行对应。清单条目同步（stage-review-checklist 新增 smoke 纪律条目）。
- normalized_requirement: verify prompt 含四段纪律；checklist 新增对应条目；文档镜像三步流水线再生。
- impacts: [FR-07]
- evidence: EHS 复盘（「手写正确字段的接口测试对 E1 是盲的」）、批次 C 设计讨论（表驱动派生/负向下界/并行起服三轮确认）
- 故障面: prompt 膨胀——纪律段仅在配置 commands.smoke 或判级 critical 时注入（命中条件注入，同 D-009 批次 A 条目形态）。
- 退役判据: 冒烟模板脚手架化（sillyspec init 生成模板脚本）后纪律段指向模板。

## D-010@v1: 方案 A——CLI 亲跑 + 矩阵行数 fail-closed
- type: architecture
- status: accepted
- source: user
- question: smoke 执行主体 × 门硬度组合——A CLI 亲跑+行数 fail-closed / B agent 跑+回执核验 / C 全 advisory。
- answer: 用户选 A——commands.smoke 由 CLI 亲跑（回执机器段落盘零伪造面）；接口矩阵行数对账 fail-closed（纯机械事实无假红面）；消费端行/表间完备性 advisory（语义关联后软）。B 否决理由：回执文本层伪造面（EHS compile log 混门实证）；C 否决理由：批次 A 已实证 advisory 无阻断力。
- evidence: 本会话批次 C 方案选择轮（2026-09-17，用户答复"A"）
- impacts: [FR-01, FR-02, FR-04]
- normalized_requirement: smoke 执行面=CLI 亲跑机器实录；矩阵行数=fail-closed；消费面/表间=advisory。
- 故障面: CLI 亲跑超时/挂死——300s 超时帽（gate_snapshot.commands 先例）+ 失败定性为封顶信号非崩溃；存量 critical 变更首跑被拦——handover 承载出路。
- 退役判据: 执行面若平台化（SillyHub driver 统一跑命令），亲跑语义并入彼处。


## D-009@v1: 非目标（批次 C 边界）
- type: boundary
- status: accepted
- 问题: 范围蔓延风险——批次 C 是地板不是全家桶。
- 选定（非目标清单）: 不做浏览器 E2E（Tier 2 后续独立变更）；不做 probe8 代码级直比/Controller 校验器提取（批次 B）；不做 keep-alive 服务复用档与外部常驻实例档（优化项，指纹复用已覆盖主成本）；不引入接口测试框架/契约测试框架（脚本冒烟即可）；不动 probe7 既有矩阵（接口矩阵为独立章节并行存在）；smoke 不做 per-task 粒度（变更级一条命令）。
- impacts: [全部 FR 边界]
- evidence: 批次 C 设计讨论（「不要全家桶」用户反馈轮：Postman 回归库/契约框架/E2E 全否决）
