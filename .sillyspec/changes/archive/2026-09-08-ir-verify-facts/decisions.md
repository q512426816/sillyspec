---
author: qinyi
created_at: 2026-09-08T22:45:00+08:00
change: 2026-09-08-ir-verify-facts
---

# 决策记录（Decisions）

## D-001@v1: verify 证据链载体 = verify.facts.yaml sidecar 双层（方案 A，用户选定）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: verify 证据链 IR 化的载体形态——sidecar 双层（A）/ md 内嵌盖章段（B）/ 最小对账增强不动产物（C）？
- answer: 用户选 A：新增 verify.facts.yaml 机器真相层（结论/测试明细/探针结果/集成回执 CLI 写），verify-result.md 降为渲染层（模板渲染 + agent 判断散文），方向锁死 facts→md 单向。理由：单一真相源零双写；09-05「IR 是 md 的可验证投影」原则直接兑现；P3d（archive delta 回灌/增量 scan）拿到数据源；B/C 均为过渡态且 C 会返工。
- normalized_requirement: 机器数据（结论枚举/测试结果/探针指标/集成回执）只存在 verify.facts.yaml，CLI 全权写；verify-result.md 由模板渲染 facts + agent 填判断散文；禁止反向（md → facts）同步。
- impacts: [FR-01, FR-02, FR-05, task-01, task-02, task-05]
- evidence: 本变更 Step 4 方案对比（A/B/C 三案），用户回答「A」（2026-09-08 对话轮）；archify-ir-stage-proposal-2026-09-05.md §0 双层原则与 §4。

## D-002@v1: 本变更范围 = P3b 收口五件，其余 P3 大件排后续独立变更
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: P3 brainstorm 双输入后本变更实现范围——一次全量还是按 phase？
- answer: 沿 P3a/P3b/P3c 既有节奏一次一个 phase。本变更 = verify 域五件：① verify.facts.yaml sidecar；② evidence 对账从 includes 子串升级为 id→文件→diff 三元组；③ cannot_verify requiredEvidence 兑现闭环；④ 集成证据回执槽位（中间档）；⑤ 探针复跑抽查（09-05 P3b 另一半）。Wave 派生化、archive 收口机械化、doctor 折叠、decisions/四件套骨架预生成 → 各自独立后续变更。
- normalized_requirement: 本变更文件清单只含 verify 域（verify-probes/verify-postcheck/stage-contract/change-risk-profile/task-review/run-gates 接线/stages/verify.js prompt）；不触碰 plan.md Wave 段、archive 步骤、doctor 探测器。
- 模块域：core-engine,stages,runtime
- impacts: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
- evidence: 本会话三轮评审定稿（E → 三刀 quick → P3 brainstorm）；round-trip-economics-2026-09-08.md §3/§4 分工。

## D-003@v1: 集成证据 = 回执槽位中间档，CLI 代跑缓议
- type: risk
- priority: P1
- status: accepted
- source: user
- question: 集成证据从 literals 蹭词升级——直接 CLI 代跑集成命令，还是先结构化回执槽位？
- answer: 中间档：回执结构化槽位（命令、exit 枚举、日志路径），CLI 校验槽位存在 + 日志文件存在 + mtime 落 verify 窗口 + 日志失败签名扫描。代跑等 commands.integration 配置入口出现后再议（防环境起不来/超时/误伤无状态后端造成假确定性门禁）。
- normalized_requirement: checkIntegrationEvidence 从字面 literals 匹配改为读 facts 的 runtime_evidence[] 槽位并做一致性校验；无配置入口前 CLI 不启动任何集成进程。
- 模块域：core-engine
- impacts: [FR-04, task-04]
- evidence: 本会话第二轮评审「集成证据代跑过猛」修正，用户接受；round-trip-economics §3.3。

## D-004@v1: lint 门禁强度本变更不动
- type: boundary
- priority: P2
- status: accepted
- source: user
- question: lint advisory 是否随本变更升级硬门？
- answer: 不动。观察期计数器已随刀③落地（.runtime/verify-lint-tally.json，失败输出附累计 N/M），升级硬门先看失败率数据（防更硬换更吵）。
- normalized_requirement: 本变更不修改 runVerifyLintCheck 的 advisory 语义；只消费 tally 数据。
- 模块域：core-engine
- impacts: []
- evidence: ql-20260908-012（recordVerifyLintTally 已落地）；本会话第二轮评审「lint 要数据再动」。

## D-005@v1: facts schema 命名与结构跟 09-05，不另起
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 新事实层文件的命名与 schema 来源？
- answer: 文件名 verify.facts.yaml、字段结构沿 09-05 §4（每条 = 验证声明 + 探针命令 + 结果 exit/输出摘要）+ 本变更扩展（conclusion enum / per-task evidence map / failed tests / runtime_evidence 槽）。后续 design/tasks/delta facts 同族命名，禁止平行造第二套事实表。
- normalized_requirement: schema 定义单点放 stage-contract-spec.js manifest 或独立 facts-schema 模块；渲染/解析/校验三方同源。
- impacts: [FR-01, task-01]
- evidence: archify-ir-stage-proposal-2026-09-05.md §4/§6；本会话第二轮评审「IR schema 跟 09-05」。

## D-001@v2: 单向约束对象 = 机器数据；判断层经槽录入固化属正向流（supersede v1，Design Grill 首轮）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: v1 写「禁止反向（md → facts）同步」与结论枚举槽回填（md 槽 → facts 固化）是否矛盾？
- answer: 不矛盾但要写清边界：单向渲染约束的对象是**机器数据**（probes/tests/factsConsistency——只允许 CLI 产生，facts→md 渲染）；结论枚举/证据状态/回执声明是**判断层的结构化表达**，受控槽（行首锚定+枚举）是其录入界面，--done 时 CLI 解析槽并固化进 facts 属正向固化流，不是「反向同步」。v1 表述过宽被审查判偏离。
- normalized_requirement: facts schema 中标注每段写入方（cli-direct / slot-backfill）；除 slot-backfill 段外禁止从 md 提取数据写 facts。
- 模块域：core-engine
- impacts: [FR-01, task-01]
- evidence: 独立设计审查（brainstorm-review-2026-09-08-224234）P1-2；archify-ir-stage-proposal-2026-09-05.md §0 双层原则。
- 演进: v1 表述「机器数据只存 facts、禁 md→facts」未区分判断层录入界面 → v2 划清边界

## D-005@v2: 命名沿用 verify-facts.json + schema 单点 = 独立 verify-facts-schema 模块（supersede v1，Design Grill 首轮）
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: v1 要求「schema 单点放 stage-contract-spec.js manifest 或独立 facts-schema 模块」且隐含 verify.facts.yaml 命名——设计实际沿用已落地的 verify-facts.json（JSON）且单点选了独立模块，是否升版？
- answer: 升版确认两点：①文件名沿用 verify-facts.json——它是 09-05 verify.facts 概念的已落地形态（2026-09-07 ir-stage-p3b），改名是 churn 无增量，「不另起第二套事实表」的实质成立；②schema 单点 = 新增 src/verify-facts-schema.js（常量+校验函数），不进 stage-contract-spec.js（manifest 是产物校验规则族，facts schema 是数据形状，混放口径不清）。
- normalized_requirement: FACTS_SCHEMA_VERSION/EVIDENCE_STATUS/EXEMPTION_RE/classifyVerifiedFile/validateFactsV2 单点在 verify-facts-schema.js，builder/解析/对账/渲染四方 import 禁复制。
- 模块域：core-engine,NEW:verify-facts-schema
- impacts: [FR-01, FR-06, task-01, task-06]
- evidence: 独立设计审查（brainstorm-review-2026-09-08-224234）P1-2；verify-probes.js buildVerifyFacts 现状。
- 演进: v1 未定单点二选一且隐含 yaml 命名 → v2 定案
