---
author: qinyi
created_at: 2026-07-09 19:46:30
---

# 决策记录 — 机器接口 v1（P1）

> 背景：SillyHub 平台将做控制流反转（driver 模式，平台 spawn 子 agent 并驱动流程）。
> 前提：策略引擎只有一份，在 SillySpec CLI；SillyHub 只调用不重实现。
> 本变更是两仓库对账的接口地基。

## D-001@v1: 接口形态为纯 CLI 子命令，不做长驻进程
- type: architecture
- status: accepted
- source: user
- question: daemon 调用 SillySpec 走每次 exec 的 CLI 子命令，还是长驻 `sillyspec serve` 进程？
- answer: 纯 CLI 子命令。用户全权委托后按会话原则确认：与平台 scan 已有的 exec 模式一致；sql.js 每事务全量 export 写盘，单写者模型不适合长驻多请求；进程管理/生命周期复杂度不属于 P1。
- normalized_requirement: P1 不新增任何长驻进程；所有机器接口通过 `sillyspec <cmd> --json` 单次调用完成，进程退出码即结果信号。
- impacts: [FR-01, FR-02, task-01, task-02]
- evidence: 用户 2026-07-09 19:42 全权委托（"做吧！我相信你的能力"）；src/db.js 事务后 export() 写盘模型

## D-002@v1: gate 命令只读核验，不写状态
- type: architecture
- status: accepted
- source: user
- question: `sillyspec gate` 通过后是否顺带推进状态（写 db）？
- answer: 只读。沿用本仓库"诊断/写分离"先例（doctor D5 诊断只读、写操作由独立 alignExecuteToPlan 承担）。gate 只输出 JSON 结论；状态推进仍走 `run <stage> --done`（agent 模式）或平台显式调用（driver 模式）。避免 gate 成为绕过 completeStep 校验链的新写入路径。
- normalized_requirement: `gate`/`derive` 命令执行前后 sillyspec.db 内容不变（byte-identical，允许只读打开）；不写 gate-status.json、不 triggerSync。
- impacts: [FR-01, FR-03, verify-01]
- evidence: docs/sillyspec/file-lifecycle.md「诊断/写分离，D-001@v2」；本次会话确立的门控加固原则

## D-003@v1: 机器接口命令面 = `gate` + `derive` 两个子命令
- type: boundary
- status: accepted
- source: code
- question: 对外暴露哪些机器接口？粒度如何划分？
- answer: 两个顶层子命令。`gate <stage>`：聚合"该阶段现在能否标记完成"的全部门控（产物 validator + 阶段专项 postcheck + 转换检查），一次调用出综合结论——daemon 不需要理解内部校验链顺序。`derive <facet>`：暴露单项事实核验（execute-evidence / verify-test / task-reviews / artifacts），供平台细粒度查询与展示。不暴露内部函数级接口，保持演进自由度。
- normalized_requirement: 新增 `sillyspec gate <stage> --change <name> --json` 与 `sillyspec derive <facet> --change <name> --json`；facet 枚举 = execute-evidence | verify-test | task-reviews | artifacts。
- impacts: [FR-01, FR-02, task-01, task-02, task-03]
- evidence: src/stage-contract.js runValidators/checkTransition/checkExecuteCodeEvidence；src/verify-postcheck.js runVerifyTestCheck；src/task-review.js validateTaskReviews

## D-004@v1: 退出码契约 0/1/2 三值语义
- type: compatibility
- status: accepted
- source: code
- question: daemon 如何用退出码快速分流，不解析 JSON 也能判断？
- answer: 0 = 核验通过（可含 warnings）；1 = 核验失败（结论性阻断，JSON 含 errors）；2 = 无法核验（用法错误/环境错误/变更不存在/JSON 序列化失败）。区分 1 与 2 是关键：1 是"事实上不通过"，2 是"没得出结论"，daemon 对两者的重试策略完全不同。
- normalized_requirement: gate/derive 命令的 process.exit 只允许 0/1/2；stdout 只输出 JSON（--json 模式下无任何装饰性文本），日志走 stderr。
- impacts: [FR-03, task-01, verify-02]
- evidence: 现有 CLI exit(1) 语义混用（校验失败与用法错误同码），driver 模式必须区分

## D-005@v1: JSON 输出带 schema_version，演进只增不改
- type: compatibility
- status: accepted
- source: code
- question: 两仓库独立演进，JSON 契约如何不破裂？
- answer: 所有机器接口 JSON 顶层带 `schema_version: 1`（沿用 manifest.json / review.json 先例）。演进规则：新增字段随时可加；改语义/删字段必须 bump schema_version 且旧版本至少保留一个 minor 周期。契约文档（interface-contract.md）随本变更冻结 v1。
- normalized_requirement: gate/derive 输出顶层含 schema_version/ok/errors/warnings/generated_at 五个固定字段；interface-contract.md 为对账基准。
- impacts: [FR-04, task-04]
- evidence: src/task-review.js REVIEW_SCHEMA_VERSION=1；manifest.json schema_version:1 先例

## D-006@v1: 顺带补齐两个平台对接已知缺口
- type: boundary
- status: accepted
- source: docs
- question: known-implementation-gaps.md 中 platform approve/reject 未实现、workflow-runs runtimeRoot 未接通，是否纳入本变更？
- answer: 纳入。二者都是 driver 模式的直接前置：审批闭环是平台控制 execute 的抓手；workflow-runs 落平台目录是平台读取 postcheck 产物的前提。改动小且与接口层同域。
- normalized_requirement: `sillyspec platform approve/reject <change>` 真实调用平台 API 并更新 approvals 表；run.js 调 saveWorkflowRun 时透传 runtimeRoot/scanRunId。
- impacts: [FR-05, FR-06, task-05, task-06]
- evidence: src/sync.js:416-422 仅 warn；docs/sillyspec/file-lifecycle/known-implementation-gaps.md

## D-008@v1: gate 的 checks 允许受控重叠，一次调用一次核验
- type: consistency
- status: accepted
- source: code
- question: Design Grill X-001 发现：execute 的 stage validator（validateExecuteOutputs）内部已调用 checkExecuteCodeEvidence，gate execute 若再单列 execute-evidence check 会重复执行 git 核验。
- answer: 实现层去重：machine-interface 对 execute-evidence 只调用一次 checkExecuteCodeEvidence，结果同时用于 artifacts check（喂给 validator 的等价判断）与 execute-evidence check 的结构化 data 输出。若实现上难以注入，则接受重复执行（只读幂等、成本为数条本地 git 命令）——但 checks 数组语义必须保持"每个 check 独立可信"，不因重叠改变结论。
- normalized_requirement: gate 输出中 artifacts 与 execute-evidence 的结论不得互相矛盾；测试须含一致性断言。
- impacts: [FR-01, task-01, verify-07]
- evidence: src/stage-contract.js validateExecuteOutputs（2026-07-09 门控加固引入）；design.md §3.1

## D-009@v1: gate verify 的实测与 run --done 的实测允许各跑一次
- type: risk
- status: accepted
- source: code
- question: Design Grill X-002：driver 流程中 daemon 先 gate verify（跑测试），随后 run verify --done 又跑一次，测试执行翻倍。
- answer: P1 接受（幂等、取证文件各自落盘可追溯）。契约文档把 verify-test 标记为慢命令并声明该行为；优化（--reuse-last-run 或结果 TTL 复用）留到 P3 verify 反转试点按真实耗时数据决定，避免过早设计缓存失效策略。
- normalized_requirement: interface-contract.md 含"慢命令与重复执行"章节；不在 P1 实现结果复用。
- impacts: [FR-04, task-04]
- evidence: src/verify-postcheck.js TEST_TIMEOUT_MS=10min；design.md §8 风险表

## D-007@v1: 生命周期契约不涉及
- type: premise
- status: accepted
- source: code
- question: 本变更是否引入新的会话/租约/守护进程生命周期？
- answer: 不涉及生命周期契约（D-001 已否决长驻进程）。gate/derive 均为无状态单次调用，无 session/lease/heartbeat/state_transition 语义；approve/reject 只是对既有 approvals 表的一次性 HTTP 调用 + 落库，不引入状态机。
- normalized_requirement: 本变更不新增任何生命周期状态机；无需生命周期契约表。
- impacts: [verify-01]
- evidence: D-001@v1；src/sync.js checkApproval 既有单次拉取模型
