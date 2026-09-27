## FR-runtime-001 门禁前置失败清单注入
变更：2026-09-18-preflight-slimming
状态：active
摘要：失败清单前移
待复核：2026-09-28-archive-timeline-bake
场景正文：
- 场景：默认场景 — Given 产出型步骤（brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）的 prompt 渲染；When 该步骤 --done 将消费的 validator 存在当前失败项；Then prompt 含前置失败清单——只注本步相关 validator、条数帽 5、超时帽 3s/validator、异常静默不注（fail-open）、尾部固定「完
- 场景：失败清单前移 — Given design.md 清单有一行幻觉路径；When 进入 brainstorm 生成规范文件步；Then prompt 直接列出该 design_file_ref_invalid 项——agent 本轮即修，不再 --done 被打回重一轮
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-01
最近确认：29aa686

## FR-runtime-002 阶段感知注入瘦身
变更：2026-09-18-preflight-slimming
状态：active
摘要：摘要引用
待复核：2026-09-28-archive-timeline-bake
场景正文：
- 场景：默认场景 — Given .runtime/prompt-inject-<change>.json 账本（withFileLock 写入，archive 经 pruneArchivedC；When 同阶段非首步渲染；Then 模块上下文/scan 事实只注摘要行（digest 前 8 位+可 Read 路径引用）；账本读写异常回退每步全量（现状零回归）
- 场景：摘要引用 — Given brainstorm 已在第 2 步全量注入模块上下文；When 第 6 步渲染；Then 注入为「本阶段上下文已于步骤 2 注入（digest xxxxxxxx）；需要时 Read <路径>」一行
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-02
最近确认：29aa686

## FR-runtime-003 wait 继承盖章
变更：2026-09-18-preflight-slimming
状态：active
摘要：继承盖章
待复核：2026-09-28-archive-timeline-bake
场景正文：
- 场景：默认场景 — Given run <stage> --wait --inherit-from D-xxx@vN（解析在 src/run/command.js，落账在 src/run/co；When decisions.md 字面存在该 ID（hasDecisionId 机械校验）；Then 同命令落答案轮「由 D-xxx@vN 继承确认（CLI 盖章）」；不存在则 exit 2（fail-closed）；不带 --inherit-from 行为与现
- 场景：继承盖章 — Given 方案选择已由 D-005@v1 裁决；When run plan --wait --inherit-from D-005@v1；Then 同命令完成 wait 记录+盖章轮（省一次 --done --answer 往返）
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-03
最近确认：29aa686

## FR-runtime-004 测选路引导与守恒验收
变更：2026-09-18-preflight-slimming
状态：active
摘要：守恒验收
待复核：2026-09-28-archive-timeline-bake
场景正文：
- 场景：默认场景 — Given 任务卡规则模板（templates/prompts/taskcard-rules.md）与 execute 任务步 prompt；When 渲染；Then 含「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」；verify-re
- 场景：守恒验收 — Given 批 2 落地后的首个变更；When verify；Then 摩擦账对比拦截数守恒、noAI 亲测双绿、prompt 中位统计不反弹
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-04
最近确认：29aa686

## FR-runtime-005 薄通道蒸馏尾与 lite 归档
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
待复核：2026-09-28-archive-timeline-bake
依据决策：D-001@v1、D-002@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given quick --done 且 test+lint 门禁 action ≠ fail 且 linkedChanges 含真变更（非 quick-<hex>）；When 收尾段执行；Then requirements.md 有 FR 块 → fr-index 入账（幂等）；decisions.md 有条目 → decision-distill 入账；
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-01
最近确认：611b6890

## FR-runtime-006 FR needs_review 标记与清除
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
待复核：2026-09-28-archive-timeline-bake
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 纯 quick 或薄通道 quick 触达某域且该域有 active FR；When 钩子#1 命中
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-02
最近确认：611b6890

## FR-runtime-007 纯 quick 机械件
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
待复核：2026-09-28-archive-timeline-bake
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 纯 quick --done（无 linked 真变更）；When 收尾段执行；Then changedFiles×module-map 命中模块且边车存在 → changelog 追加一行 `- ql-id | 摘要`；--cause 原文 × I
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-03
最近确认：611b6890

## FR-runtime-008 指令指纹增量——同步骤复入只印指纹+路径
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-01
最近确认：c1d22063

## FR-runtime-009 gate 快照分叉态取 worktree 血统
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-02
最近确认：c1d22063

## FR-runtime-010 PLAN 粒度派发默认化
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
待复核：2026-09-26-task-review-retire
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-03
最近确认：c1d22063

## FR-runtime-011 execute direct 模式通道
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：默认场景
待复核：2026-09-26-task-review-retire
场景正文：
- 场景：默认场景 — Given 同一 (stage, step) 第二次渲染且静态段指纹一致；When run <stage> 复入输出步骤指引；Then 输出 ≤10 行（指纹+落盘路径+按需 Read 提示），动态段照常渲染，--json 模式全量输出不变
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-04
最近确认：c1d22063

## FR-runtime-012 gate 预检补全（--full 只读档）
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
待复核：2026-09-28-archive-timeline-bake
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-01
最近确认：27de9716

## FR-runtime-013 测试结果记账（fail-closed 复用）
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
待复核：2026-09-28-archive-timeline-bake
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-02
最近确认：27de9716

## FR-runtime-014 归档就绪度前置
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
待复核：2026-09-28-archive-timeline-bake
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-03
最近确认：27de9716

## FR-runtime-015 M1 缺省开
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：默认场景
待复核：2026-09-28-archive-timeline-bake
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 全量测试在同一（代码×测试面×环境）态下重复执行；When gate/verify --done/quick --done 再次触发实测检查；Then 三键全等即复用最近结果（不重跑），任一分量变化或不可得即真跑——失败永不来自缓存
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-04
最近确认：27de9716

## FR-runtime-016 readStageBurst 配置读取（三态）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 仓库 local.yaml 可读（或缺失/坏 YAML）；When 调 readStageBurst(cwd)
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-01
最近确认：9f9450d0

## FR-runtime-017 burst 渲染折叠（白名单阶段）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
依据决策：D-002@v2
场景正文：
- 场景：默认场景 — Given brainstorm/plan/execute 阶段存在剩余非 completed/skipped 步且 readStageBurst(cwd) 为 true，；When `sillyspec run <stage>`；Then noAI 步就地执行 _cliAction 并标 completed 落库；AI 步逐个按既有 outputStep 输出（首可渲染步带 persona 注入）
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-02
最近确认：9f9450d0

## FR-runtime-018 burst done 循环收口（守卫零改动）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
依据决策：D-003@v2、D-004@v2
场景正文：
- 场景：默认场景 — Given burst 开启且白名单阶段有待完成步；When `sillyspec run <stage> --done [--output ...] [--answer ...]`；Then completeStepBurst 循环调既有 completeStep（printNext:false、每轮 outputText=null 走 P0-2 事
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-03
最近确认：9f9450d0

## FR-runtime-019 env 逃生阀
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given local.yaml 配置 `stage: burst: true`；When 以 `SILLYSPEC_STAGE_BURST=0` 运行 `sillyspec run <stage>`；Then 走既有单步渲染路径（仅当前步说明书、无 burst 尾提示）
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-04
最近确认：9f9450d0

## FR-runtime-020 flow.mode 缺省翻回 legacy
变更：2026-09-22-stage-burst-fold
状态：superseded
superseded_by：FR-cli-entry-102
取代链：FR-runtime-020 ← FR-cli-entry-102（2026-09-25-fr-governance-sweep 承接）
摘要：默认场景
依据决策：D-010@v2
场景正文：
- 场景：默认场景 — Given 仓库 local.yaml 无 flow 配置（或读取失败）；When 调 readFlowConfig(specBase)；Then mode === 'legacy'；显式 `mode: thin` / `flow: thin` 照旧生效；受影响测试 fixture（test/flow-pr
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-05
最近确认：ba8068438a34437daead41adeccb72009c174423

## FR-runtime-021 command.js 两处 --done 分发接线
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given burst 开启且 stage ∈ 白名单；When 主 --done 分发（src/run/command.js:1727 一带）或 auto --done 路径（:2073 一带）执行；Then 走 completeStepBurst；burst 关闭或非白名单走 completeStep 原路径——两路径 options 透传语义不变
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-06
最近确认：9f9450d0

## FR-runtime-022 complete.js brainstorm small 完成文案改指 flow
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then complete.js brainstorm small 完成文案改指 flow start 收编（不再是 run quick --linked-changes
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-01
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-023 stages/brainstorm.js 两处 small 档 quick 指引
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then stages/brainstorm.js 两处 small 档 quick 指引改指轻量变更（步骤 prompt 与规范文件模板各一处）
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-02
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-024 run/complete.js 的 quick 末步四参数预告文案保留（存量 q
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then run/complete.js 的 quick 末步四参数预告文案保留（存量 quick 会话收尾仍需，不改）
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-03
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-025 测试面无行为断言依赖旧文案；flow 系全绿
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 测试面无行为断言依赖旧文案；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-04
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-026 豁免凭据三态
变更：2026-09-26-review-unsupervised-exit
状态：active
摘要：默认场景
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given 无嵌套派发能力环境需要诚实出口；When readReviewUnsupervisedWaiver 读变更目录 review-unsupervised.md 含 unsupervised 字样放行/不含
全文：.sillyspec/changes/archive/2026-09-26-review-unsupervised-exit/requirements.md#FR-01
最近确认：0675d7d76cbde1b21ef55d24dbe8f135048c78c0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-review-unsupervised-exit:flow:FR-01
  tests: test/review-unsupervised-exit.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-review-unsupervised-exit
  status: active

## FR-runtime-027 四消费点接线
变更：2026-09-26-review-unsupervised-exit
状态：active
摘要：默认场景
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given 评审门四处（doctor-align/review-json 硬门/Stage Review tier 分支/Execute Task Review）；When 豁免凭据在场 先于校验放行（warn+遥测 review-unsupervised-escape）；两凭据皆无照旧 fail-closed
全文：.sillyspec/changes/archive/2026-09-26-review-unsupervised-exit/requirements.md#FR-02
最近确认：0675d7d76cbde1b21ef55d24dbe8f135048c78c0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-review-unsupervised-exit:flow:FR-02
  tests: test/review-unsupervised-exit.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-review-unsupervised-exit
  status: active

## FR-runtime-028 生成侧豁免指引
变更：2026-09-26-review-unsupervised-exit
状态：active
摘要：默认场景
待复核：2026-09-27-ui-visual-guidance
场景正文：
- 场景：默认场景 — Given brainstorm Grill/plan/execute QA 三处 tier=independent 指引只教派发；When 插入豁免分支句 无派发能力→不产 review.json 不自审表演→写声明文件即豁免（含文件名与 unsupervised 字样要求）
全文：.sillyspec/changes/archive/2026-09-26-review-unsupervised-exit/requirements.md#FR-03
最近确认：0675d7d76cbde1b21ef55d24dbe8f135048c78c0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-review-unsupervised-exit:flow:FR-03
  tests: test/review-unsupervised-exit.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-review-unsupervised-exit
  status: active

## FR-runtime-029 gates.js 三处消费门退役
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given execute 阶段完成（或 doctor --align-execute-progress --confirm）；When 阶段完成门级联/align 前置门
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-01
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-01
  tests: test/align-execute-review-gate.test.mjs | test/review-unsupervised-exit.test.mjs | test/stage-completion-atomicity.test.mjs | test/task-review-retire.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-030 生成侧停写（勾选自动化迁移）
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given execute 任一步 --done 或 execute 阶段完成；When CLI 走 completeStep；Then 不再调 autoCheckPlan
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-02
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-02
  tests: test/execute-batch-endtoend-checkbox.test.mjs | test/execute-run-dir-fail-loud.test.mjs | test/run-complete-step-execute-batch.test.mjs | test/task-review-retire.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-031 execute 指引手动勾选语义
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given buildWavePrompt 渲染（main/dispatch 两模式）；When 注入执行方式/调度要求段；Then 指引为「手动勾选 tasks.md 对
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-03
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-03
  tests: test/dispatch-contract.test.mjs | test/execution-mode-render.test.mjs | test/task-review-retire.test.mjs | test/task-truth-unify.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-032 verify-required-evidence.json 兼容读
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given verify 阶段加载证据账；When 检查 verify-required-evidence.json；Then 该文件随 Task Review 退役停写—
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-04
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-04
  tests: test/task-review-retire.test.mjs | test/task-truth-unify.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-033 模块保留面
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 历史归档变更的 doctor/回放兼容读侧；When 引用 task-review.js / stage-review.js；Then 模块与既有导出保留不删（
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-05
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-05
  tests: test/backfill-reviews.test.mjs | test/execute-run-marker-drift.test.mjs | test/review-json-field-gate.test.mjs | test/task-done.test.mjs | test/task-review-retire.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-034 测试面（门拦截测试重写/删 + 退役钉）
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given 本变更交付的测试；When 跑受影响清单；Then align-execute-review-gate 场景①③语义翻转+⑤源码退役钉、review-unsup
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-06
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-task-review-retire:flow:FR-06
  tests: test/task-review-retire.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-task-review-retire
  status: active

## FR-runtime-035 全量测试绿
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given .sillyspec/local.yaml commands.test（npm run test:core）与 commands.lint；When 收口实测；
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-07
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

## FR-runtime-036 知识面收尾
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
待复核：2026-09-27-change-birth-stage-brainstorm
场景正文：
- 场景：默认场景 — Given R18 实证知识沉淀；When 收尾 knowledge 维护；Then known-issues.md 新增「Task Review 层已退役」条目（状态🟢
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-08
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5
