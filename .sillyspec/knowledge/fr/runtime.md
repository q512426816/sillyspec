## FR-runtime-001 门禁前置失败清单注入
变更：2026-09-18-preflight-slimming
状态：active
摘要：失败清单前移
场景正文：
- 场景：默认场景 — Given 产出型步骤（brainstorm 写文档/生成规范、plan 生成计划、execute 任务步）的 prompt 渲染；When 该步骤 --done 将消费的 validator 存在当前失败项；Then prompt 含前置失败清单——只注本步相关 validator、条数帽 5、超时帽 3s/validator、异常静默不注（fail-open）、尾部固定「完
- 场景：失败清单前移 — Given design.md 清单有一行幻觉路径；When 进入 brainstorm 生成规范文件步；Then prompt 直接列出该 design_file_ref_invalid 项——agent 本轮即修，不再 --done 被打回重一轮
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-01
最近确认：29aa686

## FR-runtime-002 阶段感知注入瘦身
变更：2026-09-18-preflight-slimming
状态：active
摘要：摘要引用
场景正文：
- 场景：默认场景 — Given .runtime/prompt-inject-<change>.json 账本（withFileLock 写入，archive 经 pruneArchivedC；When 同阶段非首步渲染；Then 模块上下文/scan 事实只注摘要行（digest 前 8 位+可 Read 路径引用）；账本读写异常回退每步全量（现状零回归）
- 场景：摘要引用 — Given brainstorm 已在第 2 步全量注入模块上下文；When 第 6 步渲染；Then 注入为「本阶段上下文已于步骤 2 注入（digest xxxxxxxx）；需要时 Read <路径>」一行
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-02
最近确认：29aa686

## FR-runtime-003 wait 继承盖章
变更：2026-09-18-preflight-slimming
状态：active
摘要：继承盖章
场景正文：
- 场景：默认场景 — Given run <stage> --wait --inherit-from D-xxx@vN（解析在 src/run/command.js，落账在 src/run/co；When decisions.md 字面存在该 ID（hasDecisionId 机械校验）；Then 同命令落答案轮「由 D-xxx@vN 继承确认（CLI 盖章）」；不存在则 exit 2（fail-closed）；不带 --inherit-from 行为与现
- 场景：继承盖章 — Given 方案选择已由 D-005@v1 裁决；When run plan --wait --inherit-from D-005@v1；Then 同命令完成 wait 记录+盖章轮（省一次 --done --answer 往返）
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-03
最近确认：29aa686

## FR-runtime-004 测选路引导与守恒验收
变更：2026-09-18-preflight-slimming
状态：active
摘要：守恒验收
场景正文：
- 场景：默认场景 — Given 任务卡规则模板（templates/prompts/taskcard-rules.md）与 execute 任务步 prompt；When 渲染；Then 含「中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done」；verify-re
- 场景：守恒验收 — Given 批 2 落地后的首个变更；When verify；Then 摩擦账对比拦截数守恒、noAI 亲测双绿、prompt 中位统计不反弹
全文：.sillyspec/changes/archive/2026-09-18-preflight-slimming/requirements.md#FR-04
最近确认：29aa686

## FR-runtime-005 薄通道蒸馏尾与 lite 归档
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1、D-004@v1
场景正文：
- 场景：默认场景 — Given quick --done 且 test+lint 门禁 action ≠ fail 且 linkedChanges 含真变更（非 quick-<hex>）；When 收尾段执行；Then requirements.md 有 FR 块 → fr-index 入账（幂等）；decisions.md 有条目 → decision-distill 入账；
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-01
最近确认：611b6890

## FR-runtime-006 FR needs_review 标记与清除
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
依据决策：D-003@v1
场景正文：
- 场景：默认场景 — Given 纯 quick 或薄通道 quick 触达某域且该域有 active FR；When 钩子#1 命中
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-02
最近确认：611b6890

## FR-runtime-007 纯 quick 机械件
变更：2026-09-20-quick-asset-tail
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 纯 quick --done（无 linked 真变更）；When 收尾段执行；Then changedFiles×module-map 命中模块且边车存在 → changelog 追加一行 `- ql-id | 摘要`；--cause 原文 × I
全文：.sillyspec/changes/archive/2026-09-20-quick-asset-tail/requirements.md#FR-03
最近确认：611b6890

## FR-runtime-008 指令指纹增量——同步骤复入只印指纹+路径
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-01
最近确认：c1d22063

## FR-runtime-009 gate 快照分叉态取 worktree 血统
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-02
最近确认：c1d22063

## FR-runtime-010 PLAN 粒度派发默认化
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-03
最近确认：c1d22063

## FR-runtime-011 execute direct 模式通道
变更：2026-09-21-r5-efficiency-batch2
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 同一 (stage, step) 第二次渲染且静态段指纹一致；When run <stage> 复入输出步骤指引；Then 输出 ≤10 行（指纹+落盘路径+按需 Read 提示），动态段照常渲染，--json 模式全量输出不变
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch2/requirements.md#FR-04
最近确认：c1d22063

## FR-runtime-012 gate 预检补全（--full 只读档）
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
依据决策：D-002@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-01
最近确认：27de9716

## FR-runtime-013 测试结果记账（fail-closed 复用）
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
依据决策：D-001@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-02
最近确认：27de9716

## FR-runtime-014 归档就绪度前置
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-03
最近确认：27de9716

## FR-runtime-015 M1 缺省开
变更：2026-09-21-r5-efficiency-batch3
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 全量测试在同一（代码×测试面×环境）态下重复执行；When gate/verify --done/quick --done 再次触发实测检查；Then 三键全等即复用最近结果（不重跑），任一分量变化或不可得即真跑——失败永不来自缓存
全文：.sillyspec/changes/archive/2026-09-21-r5-efficiency-batch3/requirements.md#FR-04
最近确认：27de9716

## FR-runtime-016 readStageBurst 配置读取（三态）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 仓库 local.yaml 可读（或缺失/坏 YAML）；When 调 readStageBurst(cwd)
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-01
最近确认：9f9450d0

## FR-runtime-017 burst 渲染折叠（白名单阶段）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
依据决策：D-002@v2
场景正文：
- 场景：默认场景 — Given brainstorm/plan/execute 阶段存在剩余非 completed/skipped 步且 readStageBurst(cwd) 为 true，；When `sillyspec run <stage>`；Then noAI 步就地执行 _cliAction 并标 completed 落库；AI 步逐个按既有 outputStep 输出（首可渲染步带 persona 注入）
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-02
最近确认：9f9450d0

## FR-runtime-018 burst done 循环收口（守卫零改动）
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
依据决策：D-003@v2、D-004@v2
场景正文：
- 场景：默认场景 — Given burst 开启且白名单阶段有待完成步；When `sillyspec run <stage> --done [--output ...] [--answer ...]`；Then completeStepBurst 循环调既有 completeStep（printNext:false、每轮 outputText=null 走 P0-2 事
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-03
最近确认：9f9450d0

## FR-runtime-019 env 逃生阀
变更：2026-09-22-stage-burst-fold
状态：active
摘要：默认场景
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
场景正文：
- 场景：默认场景 — Given burst 开启且 stage ∈ 白名单；When 主 --done 分发（src/run/command.js:1727 一带）或 auto --done 路径（:2073 一带）执行；Then 走 completeStepBurst；burst 关闭或非白名单走 completeStep 原路径——两路径 options 透传语义不变
全文：.sillyspec/changes/archive/2026-09-22-stage-burst-fold/requirements.md#FR-06
最近确认：9f9450d0

## FR-runtime-022 complete.js brainstorm small 完成文案改指 flow
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then complete.js brainstorm small 完成文案改指 flow start 收编（不再是 run quick --linked-changes
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-01
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-023 stages/brainstorm.js 两处 small 档 quick 指引
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then stages/brainstorm.js 两处 small 档 quick 指引改指轻量变更（步骤 prompt 与规范文件模板各一处）
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-02
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-024 run/complete.js 的 quick 末步四参数预告文案保留（存量 q
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then run/complete.js 的 quick 末步四参数预告文案保留（存量 quick 会话收尾仍需，不改）
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-03
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-025 测试面无行为断言依赖旧文案；flow 系全绿
变更：2026-09-25-brainstorm-quick-remnant
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 平台按当前契约运行；When 本变更交付并运行；Then 测试面无行为断言依赖旧文案；flow 系全绿
全文：.sillyspec/changes/archive/2026-09-25-brainstorm-quick-remnant/requirements.md#FR-04
最近确认：0d126ee8f663f4091cceb58aff48d3f74554591f

## FR-runtime-026 豁免凭据三态
变更：2026-09-26-review-unsupervised-exit
状态：active
摘要：默认场景
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
场景正文：
- 场景：默认场景 — Given .sillyspec/local.yaml commands.test（npm run test:core）与 commands.lint；When 收口实测；
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-07
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

## FR-runtime-036 知识面收尾
变更：2026-09-26-task-review-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given R18 实证知识沉淀；When 收尾 knowledge 维护；Then known-issues.md 新增「Task Review 层已退役」条目（状态🟢
全文：.sillyspec/changes/archive/2026-09-26-task-review-retire/requirements.md#FR-08
最近确认：24260c180b447ccfdf55ae4feb4e0b01fea8dfa5

## FR-runtime-037 原则档案一——工具引导产物语言生态中立
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given sillyspec 面向任意技术栈的多仓；When 生成须知、探针文案、骨架、任务书等引导产物；Then 不绑定语言、框架、包管理器、构建工具；生态命令由仓与项目自描述，agent 就近发现
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-01
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

## FR-runtime-038 原则档案二——门位原则
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 设计检查与门禁的挂载时机；When 评估挂载位置；Then 与错误修复成本匹配：方向性错误开工引导、局部文本错误过程测试加收口兜底、累积性漂移三层都要；不把所有检查堆在收口
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-02
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

## FR-runtime-039 UI 执行须知改写为四条原则版
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given UI 触达变更开工；When 须知注入；Then 四条原则在位：定稿原型必须是可复跑真码产物、开工先就近发现本项目管线（多项目仓按触达路径就近）、手绘单文件仅限一次性粗选、视觉降级须用户裁决留痕；零生态词零命令
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-03
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-guidance-principles:flow:FR-03
  tests: test/ui-visual-guidance.test.mjs「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-guidance-principles
  status: active

## FR-runtime-040 brainstorm 阶段注入
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 头脑风暴方案对比步渲染 prompt；When 变更目录语料命中 UI 触达检测；Then 注入同一 UI 执行须知；无命中替换空串；异常 fail-soft 单行说明；占位符入指纹掩蔽清单
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-04
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-guidance-principles:flow:FR-04
  tests: test/prompt-placeholders.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-guidance-principles
  status: active

## FR-runtime-041 引导输出断言测试
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 引导构建函数输出；When 跑断言测试；Then 输出不含生态命令词形态（检查输出而非源码文本——源码为探测示教注释引用合法）
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-05
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-guidance-principles:flow:FR-05
  tests: test/guidance-output-neutrality.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-guidance-principles
  status: active

## FR-runtime-042 既有 ui-visual 测试同步
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 须知内容改写；When 跑既有测试；Then 新原则关键词断言在位（真码产物、就近发现、仅限一次性粗选、生态词零命中）
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-06
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-28-guidance-principles:flow:FR-06
  tests: test/ui-visual-guidance.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-28-guidance-principles
  status: active

## FR-runtime-043 过程与收口双时机触发
变更：2026-09-28-guidance-principles
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 引导文件被修改；When 动态测试推断；Then 断言测试自动入实测面（agent 写完即跑为过程拦、flow done 实测为收口拦）
全文：.sillyspec/changes/archive/2026-09-28-guidance-principles/requirements.md#FR-07
最近确认：9d9c822c27a8c0ff498061eecbd156f89aad3ab7

## FR-runtime-044 flow start/done/amend-draft 执行后，runtimeRoot 下 agen
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When flow start/done/amend-draft 执行后，runtimeRoot 下 agent-session-log.json 的本会话 own 条目；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-01
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-agent-log-report:flow:FR-01
  tests: test/flow-agent-log-report.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-agent-log-report
  status: active

## FR-runtime-045 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥语义复用，不另造轮子）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-02
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-agent-log-report:flow:FR-02
  tests: test/agent-session-log.test.mjs | test/flow-agent-log-report.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-agent-log-report
  status: active

## FR-runtime-046 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-03
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-agent-log-report:flow:FR-03
  tests: test/flow-agent-log-report.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-agent-log-report
  status: active

## FR-runtime-047 run 族既有行为不变（既有 run agent-log 测试全绿）
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When run 族既有行为不变（既有 run agent-log 测试全绿）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-04
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-agent-log-report:flow:FR-04
  tests: test/agent-session-log.test.mjs | test/cli-top-level-aliases.test.mjs | test/flow-parity.test.mjs | test/flow-protocol.test.mjs | test/flow-status-heartbeat.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-agent-log-report
  status: active

## FR-runtime-048 新增测试覆盖 flow 入口的登记调用面
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 新增测试覆盖 flow 入口的登记调用面；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-05
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-flow-agent-log-report:flow:FR-05
  tests: test/flow-agent-log-report.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-flow-agent-log-report
  status: active

## FR-runtime-049 全量测试绿 + lint 绿
变更：2026-09-29-flow-agent-log-report
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全量测试绿 + lint 绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-flow-agent-log-report/requirements.md#FR-06
最近确认：b66d2649e7d462508e6efcacd018266946a37e7d

## FR-runtime-050 A 层协议形状——spec 期任务面定稿 + openspec 式执行循环指令
变更：2026-09-29-batch-tick-gate
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-batch-tick-gate/requirements.md#FR-01
最近确认：79ea50cc7bbe0eee041650277633780416e309a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-batch-tick-gate:flow:FR-01
  tests: test/batch-tick-gate.test.mjs「③ A 层文案钉」 | test/flow-status-heartbeat.test.mjs「④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-batch-tick-gate
  status: active

## FR-runtime-051 单拍勾选门决策纯函数（resolveBatchTickAction 四态）
变更：2026-09-29-batch-tick-gate
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-batch-tick-gate/requirements.md#FR-02
最近确认：79ea50cc7bbe0eee041650277633780416e309a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-batch-tick-gate:flow:FR-02
  tests: test/batch-tick-gate.test.mjs「② 硬门接线钉」 | test/batch-tick-gate.test.mjs「②b 决策纯函数行为级」 | test/batch-tick-gate.test.mjs「②b 镜像-only 不拒钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-batch-tick-gate
  status: active

## FR-runtime-052 flow done ledger 接线——拒收/旁路留痕/降级
变更：2026-09-29-batch-tick-gate
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-batch-tick-gate/requirements.md#FR-03
最近确认：79ea50cc7bbe0eee041650277633780416e309a0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-batch-tick-gate:flow:FR-03
  tests: test/batch-tick-gate.test.mjs「② 硬门接线钉」 | test/batch-tick-gate.test.mjs「②c autopilot 交互钉」 | test/batch-tick-gate.test.mjs「②」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-batch-tick-gate
  status: active

## FR-runtime-053 测试与零回归
变更：2026-09-29-batch-tick-gate
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-09-29-batch-tick-gate/requirements.md#FR-04
最近确认：79ea50cc7bbe0eee041650277633780416e309a0

## FR-runtime-054 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-01
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-055 verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑，输出明示 cac；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-02
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-056 verify --done 的 lint 实测同指纹复用（同上口径）
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When verify --done 的 lint 实测同指纹复用（同上口径）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-03
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-057 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-04
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-058 全量测试回归绿，含新增的文案断言与复用命中
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全量测试回归绿，含新增的文案断言与复用命中；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-05
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-059 未命中用例
变更：2026-09-30-verify-done-green-reuse
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 未命中用例；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-verify-done-green-reuse/requirements.md#FR-06
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b

## FR-runtime-060 shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When shouldReuseLastPassedScan 纯函数：passed+dedupKey 全等+快照口径一致；Then reuse:true
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-01
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-061 lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forc
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When lint failed 记录 / dedupKey 失配 / 快照口径变化 / 无记录 / forceRerun；Then 各自 reason 不复用
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-02
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-062 executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/s
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 幂等 相关模块就绪；When executeVerifyQualityScan 幂等命中时：不建快照、不跑 test/lint/smoke/coverage、不重写扫描记录，打印 ♻️ 披露；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-03
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-063 码态/known_failures/commands/test_strategy 任一变化 → de
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 码态/known_failures/commands/test_strategy 任一变化；Then dedupKey 失配自动重测（既有指纹语义零变化）
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-04
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-064 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 pass
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN=1/force 时 passed 闸旁路（与失败闸同阀）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-05
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-065 全量测试回归绿 + lint 绿
变更：2026-09-30-quality-scan-passed-idempotent
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全量测试回归绿 + lint 绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-quality-scan-passed-idempotent/requirements.md#FR-06
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea

## FR-runtime-066 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile
变更：2026-09-30-snapshot-symlink-store-subdir
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 lockfile 判据时，detectSymlinkStoreLayout；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-snapshot-symlink-store-subdir/requirements.md#FR-01
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-30-snapshot-symlink-store-subdir:flow:FR-01
  tests: test/gate-snapshot-layout-guard.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-30-snapshot-symlink-store-subdir
  status: active

## FR-runtime-067 根目录判据行为零变化（根命中优先，标签不带 subdir）
变更：2026-09-30-snapshot-symlink-store-subdir
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 根目录判据行为零变化（根命中优先，标签不带 subdir）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-snapshot-symlink-store-subdir/requirements.md#FR-02
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-30-snapshot-symlink-store-subdir:flow:FR-02
  tests: test/gate-snapshot-layout-guard.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-30-snapshot-symlink-store-subdir
  status: active

## FR-runtime-068 createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（
变更：2026-09-30-snapshot-symlink-store-subdir
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返回 null（回退主仓实测），既有调用方（质量扫描/verify 门）零改；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-snapshot-symlink-store-subdir/requirements.md#FR-03
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-30-snapshot-symlink-store-subdir:flow:FR-03
  tests: test/gate-snapshot-layout-guard.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-30-snapshot-symlink-store-subdir
  status: active

## FR-runtime-069 非仓目录/无子目录/子目录全空的行为零变化（null）
变更：2026-09-30-snapshot-symlink-store-subdir
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 非仓目录/无子目录/子目录全空的行为零变化（null）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-snapshot-symlink-store-subdir/requirements.md#FR-04
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-30-snapshot-symlink-store-subdir:flow:FR-04
  tests: test/gate-snapshot-layout-guard.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-30-snapshot-symlink-store-subdir
  status: active

## FR-runtime-070 全量测试回归绿 + lint 绿
变更：2026-09-30-snapshot-symlink-store-subdir
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全量测试回归绿 + lint 绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-30-snapshot-symlink-store-subdir/requirements.md#FR-05
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77

## FR-core-engine-106 空仓库跑 sillyspec status 与 sillyspec run status 均输出引导行（含 flow start 字样）且 exit 0 不变
变更：2026-10-05-status-empty-guide
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-status-empty-guide/requirements.md#FR-01
最近确认：a1b0bb6ec15b9aabbf7429bd6c789a2ddc8f818c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-status-empty-guide:flow:测试绑定FR-01
  tests: test/status-empty-guide.test.mjs「空仓库 run status 与顶层 status 均输出引导行且 exit 0 不落盘」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-status-empty-guide
  status: active

## FR-core-engine-107 有活跃变更时输出与现状逐字节一致（不回归）
变更：2026-10-05-status-empty-guide
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-status-empty-guide/requirements.md#FR-02
最近确认：a1b0bb6ec15b9aabbf7429bd6c789a2ddc8f818c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-status-empty-guide:flow:测试绑定FR-02
  tests: test/status-empty-guide.test.mjs「有活跃变更时 status 展示不含空态引导行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-status-empty-guide
  status: active

## FR-core-engine-108 新增测试断言空态引导行，全量测试绿
变更：2026-10-05-status-empty-guide
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-status-empty-guide/requirements.md#FR-03
最近确认：a1b0bb6ec15b9aabbf7429bd6c789a2ddc8f818c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-status-empty-guide:flow:测试绑定FR-03
  tests: test/status-empty-guide.test.mjs「三面断言齐全（空态/别名同构/不回归）+ 全量测试绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-status-empty-guide
  status: active

## FR-runtime-071 AGENTS.md 轻量变更行的 --input 提法包含「成功标准：独立成行＋每行一条 - 可验证标准」格式要点
变更：2026-10-05-guidance-consistency
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-guidance-consistency/requirements.md#FR-01
最近确认：7d5e3de151ca53ff4b4ed2d6a185e510347bf8df

## FR-runtime-072 command.js READONLY 短路注释与 constants.js 实态一致（只列 status，注明 doctor 已移出）
变更：2026-10-05-guidance-consistency
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-guidance-consistency/requirements.md#FR-02
最近确认：7d5e3de151ca53ff4b4ed2d6a185e510347bf8df

## FR-runtime-073 纯文档/注释改动零行为面，全量测试绿
变更：2026-10-05-guidance-consistency
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-guidance-consistency/requirements.md#FR-03
最近确认：7d5e3de151ca53ff4b4ed2d6a185e510347bf8df

## FR-runtime-074 --detect 空态提示覆盖全部已注册 harness，且从 HARNESS_DETECTORS 派生（注册表新增 harness 时提示自动跟上，不再手工同步）
变更：2026-10-06-agent-log-detect-hint
状态：active
摘要：空态提示与注册表一致；注册表扩项提示自动跟上
全文：.sillyspec/changes/archive/2026-10-06-agent-log-detect-hint/requirements.md#FR-01
最近确认：a39154be47e8c14fb3b00b2935218208c46400fb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-agent-log-detect-hint:flow:测试绑定FR-01
  tests: test/agent-session-log.test.mjs「§14 空态提示派生——注册表全项含于提示 / 注入假注册表项自动跟上 / CLI 空态输出走派生提示」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-agent-log-detect-hint
  status: active

## FR-runtime-075 新增单元测试：断言提示含全部已注册 harness 名（现零覆盖）
变更：2026-10-06-agent-log-detect-hint
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-agent-log-detect-hint/requirements.md#FR-02
最近确认：a39154be47e8c14fb3b00b2935218208c46400fb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-agent-log-detect-hint:flow:测试绑定FR-02
  tests: test/agent-session-log.test.mjs「§14 空态提示派生——注册表全项含于提示 / 注入假注册表项自动跟上 / CLI 空态输出走派生提示」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-agent-log-detect-hint
  status: active

## FR-runtime-076 npm test 全绿
变更：2026-10-06-agent-log-detect-hint
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-agent-log-detect-hint/requirements.md#FR-03
最近确认：a39154be47e8c14fb3b00b2935218208c46400fb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-agent-log-detect-hint:flow:测试绑定FR-03
  tests: test/run-tests.mjs「全量套件（npm test）——本变更改动面无回归、新用例通过」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-agent-log-detect-hint
  status: active

## FR-runtime-077 complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致
变更：2026-10-06-archive-stage-claim
状态：active
摘要：add 失败（实测形态：2026-10-06-module-map-list-leak 收口声称补暂存 1 项但暂存面无该删除）
全文：.sillyspec/changes/archive/2026-10-06-archive-stage-claim/requirements.md#FR-01
最近确认：04fcb08208bc2ed0a411e8c9d69d1cbc35b75ecf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-stage-claim:flow:测试绑定FR-01
  tests: test/archive-stage-claim.test.mjs「add 失败告警不打成功提示」
  reason: spec
  state: active
  discovery: machine
  confirmed_by: agent
  confirmed_at: 03dec3f5369edc9967084be5ace7d83860ed25a7
  source_change: 2026-10-06-archive-stage-claim
  status: active

## FR-runtime-078 全部成功时维持既有成功提示不变（含 N 项计数）
变更：2026-10-06-archive-stage-claim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-archive-stage-claim/requirements.md#FR-02
最近确认：04fcb08208bc2ed0a411e8c9d69d1cbc35b75ecf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-stage-claim:flow:测试绑定FR-02
  tests: test/archive-stage-claim.test.mjs「add 成功提示与暂存实态」
  reason: spec
  state: active
  discovery: machine
  confirmed_by: agent
  confirmed_at: 03dec3f5369edc9967084be5ace7d83860ed25a7
  source_change: 2026-10-06-archive-stage-claim
  status: active

## FR-runtime-079 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归
变更：2026-10-06-archive-stage-claim
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-archive-stage-claim/requirements.md#FR-03
最近确认：04fcb08208bc2ed0a411e8c9d69d1cbc35b75ecf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-archive-stage-claim:flow:测试绑定FR-03
  tests: test/archive-stage-claim.test.mjs「全量用例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-archive-stage-claim
  status: active

## FR-runtime-080 删除 brainstorm-auto 自动道并让 run auto 回退主模式表（必须）
变更：2026-10-14-brainstorm-auto-retire
状态：active
摘要：主路径——run auto 新变更
场景正文：
- 场景：主路径——run auto 新变更 — Given 全新变更以 `run auto` 进入 brainstorm；When runAutoMode 种步骤表；Then 种入主模式 8 步表（首步名「进度确认」），不再存在 4 步 auto 表形态。
全文：.sillyspec/changes/archive/2026-10-14-brainstorm-auto-retire/requirements.md#FR-01
最近确认：b9b72ee1e85b0c5000a535974b2dc688013bebe3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-brainstorm-auto-retire:flow:测试绑定FR-01
  tests: test/brainstorm-auto-retire.test.mjs「run auto 新变更种主模式 8 步表」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-brainstorm-auto-retire
  status: active

## FR-runtime-081 存量 auto 表退役指引（必须）
变更：2026-10-14-brainstorm-auto-retire
状态：active
摘要：主路径——存量 auto 表
场景正文：
- 场景：主路径——存量 auto 表 — Given 变更进度库 stages.brainstorm.steps 为 4 步 auto 形态；When run brainstorm --done / run auto 触达；Then exit 非零 + 退役报错文案（含已删除说明与 reset/doctor 指引），进度未被重种。
全文：.sillyspec/changes/archive/2026-10-14-brainstorm-auto-retire/requirements.md#FR-02
最近确认：b9b72ee1e85b0c5000a535974b2dc688013bebe3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-brainstorm-auto-retire:flow:测试绑定FR-02
  tests: test/brainstorm-auto-retire.test.mjs「存量 auto 表触达报错且进度未重种」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-brainstorm-auto-retire
  status: active

## FR-runtime-082 引用面清理（必须）
变更：2026-10-14-brainstorm-auto-retire
状态：active
摘要：主路径——全仓零悬挂引用
场景正文：
- 场景：主路径——全仓零悬挂引用 — Given 改动落盘；When 全仓 grep brainstorm-auto（排除 .sillyspec 归档与 docs/sillyspec 历史评审件）；Then src/test/docs/prompt 现行文件零引用。
全文：.sillyspec/changes/archive/2026-10-14-brainstorm-auto-retire/requirements.md#FR-03
最近确认：b9b72ee1e85b0c5000a535974b2dc688013bebe3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-brainstorm-auto-retire:flow:测试绑定FR-03
  tests: test/brainstorm-auto-retire.test.mjs「现行文件零悬挂引用（grep 面）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-brainstorm-auto-retire
  status: active

## FR-runtime-083 测试覆盖与全绿（必须）
变更：2026-10-14-brainstorm-auto-retire
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量；Then 断言全过、既有测试零失败、lint 零错误、docs gate 通过。
全文：.sillyspec/changes/archive/2026-10-14-brainstorm-auto-retire/requirements.md#FR-04
最近确认：b9b72ee1e85b0c5000a535974b2dc688013bebe3

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-brainstorm-auto-retire:flow:测试绑定FR-04
  tests: test/brainstorm-auto-retire.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-brainstorm-auto-retire
  status: active

## FR-runtime-084 lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）
变更：2026-10-15-lint-triage-path-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given lint 失败文件全部在本变更文件集外；When lintOwnershipDowngrade；Then 返回 true + warning 列出存量债文件。G
全文：.sillyspec/changes/archive/2026-10-15-lint-triage-path-unify/requirements.md#FR-01
最近确认：0a916a84b0c0132c85eced89d8c487010ff1a006

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-lint-triage-path-unify:flow:测试绑定FR-01
  tests: test/lint-ownership-path.test.mjs「鉴定链异常（importer 抛错）→ 返回 false 保守硬拦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-lint-triage-path-unify
  status: active

## FR-runtime-085 gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）
变更：2026-10-15-lint-triage-path-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 两源文件；When 源级断言；Then gates.js/verify-quality-scan.js 均含 helper 调用、gates 无 `let li
全文：.sillyspec/changes/archive/2026-10-15-lint-triage-path-unify/requirements.md#FR-02
最近确认：0a916a84b0c0132c85eced89d8c487010ff1a006

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-lint-triage-path-unify:flow:测试绑定FR-02
  tests: test/lint-ownership-path.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-lint-triage-path-unify
  status: active

## FR-runtime-086 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿
变更：2026-10-15-lint-triage-path-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 注入式 importer 四态与两源文件；When node --test test/lint-ownership-path.test.mjs；Then 5/5
全文：.sillyspec/changes/archive/2026-10-15-lint-triage-path-unify/requirements.md#FR-03
最近确认：0a916a84b0c0132c85eced89d8c487010ff1a006

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-lint-triage-path-unify:flow:测试绑定FR-03
  tests: test/lint-ownership-path.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-lint-triage-path-unify
  status: active

## FR-runtime-087 flow done 实测门（npm test + npm run lint）通过
变更：2026-10-15-lint-triage-path-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更触及 src/run 与 test/；When flow done；Then npm test 与 npm run lint 全绿放行。
全文：.sillyspec/changes/archive/2026-10-15-lint-triage-path-unify/requirements.md#FR-04
最近确认：0a916a84b0c0132c85eced89d8c487010ff1a006

## FR-runtime-088 全部裸 split/join 注入点收编进 dynSegments（新增 substituteRaw 助手），复入附录不再漏块
变更：2026-10-16-step-guide-dyn-completeness
状态：active
摘要：复入附录含评审六值；首见渲染出真值
全文：.sillyspec/changes/archive/2026-10-16-step-guide-dyn-completeness/requirements.md#FR-01
最近确认：d3d36152b1e6dda1e66a50640d0c1d85c9f7b2c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-step-guide-dyn-completeness:flow:测试绑定FR-01
  tests: test/step-guide-dyn-completeness.test.mjs「复入附录含评审六值」 | test/step-guide-dyn-completeness.test.mjs「首见渲染出真值」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-step-guide-dyn-completeness
  status: active

## FR-runtime-089 VOLATILE_PLACEHOLDER_RES 补 3 个漏登 token
变更：2026-10-16-step-guide-dyn-completeness
状态：active
摘要：掩码表覆盖
全文：.sillyspec/changes/archive/2026-10-16-step-guide-dyn-completeness/requirements.md#FR-02
最近确认：d3d36152b1e6dda1e66a50640d0c1d85c9f7b2c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-step-guide-dyn-completeness:flow:测试绑定FR-02
  tests: test/step-guide-dyn-completeness.test.mjs「掩码表覆盖三 token」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-step-guide-dyn-completeness
  status: active

## FR-runtime-090 stage-review 路径警告措辞覆盖双向错法
变更：2026-10-16-step-guide-dyn-completeness
状态：active
摘要：措辞覆盖
全文：.sillyspec/changes/archive/2026-10-16-step-guide-dyn-completeness/requirements.md#FR-03
最近确认：d3d36152b1e6dda1e66a50640d0c1d85c9f7b2c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-step-guide-dyn-completeness:flow:测试绑定FR-03
  tests: test/step-guide-dyn-completeness.test.mjs「路径警告双向覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-step-guide-dyn-completeness
  status: active

## FR-runtime-091 测试钉死 + 既有面零回归 + lint
变更：2026-10-16-step-guide-dyn-completeness
状态：active
摘要：新测试与既有面
全文：.sillyspec/changes/archive/2026-10-16-step-guide-dyn-completeness/requirements.md#FR-04
最近确认：d3d36152b1e6dda1e66a50640d0c1d85c9f7b2c5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-step-guide-dyn-completeness:flow:测试绑定FR-04
  tests: test/step-guide-dyn-completeness.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-step-guide-dyn-completeness
  status: active

## FR-runtime-092 test/backlog-batch-a.test.mjs 在 linux 与 windows 双端退出码 0（12/12 通过）
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：mock 装载 CJS 内置模块（新 node）；老 node / windows 行为零回退
场景正文：
- 场景：mock 装载 CJS 内置模块（新 node） — Given 容器 node 24.22（linux；CI 为 24.21）下 mock exports 含 `default` 与 `constants`；When 测试注册 mock 后动态 import `../src/quicklog.js?spin-test=…` 触发 CJS `'fs'` 装载；Then 不再抛 `Cannot redefine property: constants`，偷锁分支断言（attempts≥2、按 timeoutMs 抛错）全绿、退出
- 场景：老 node / windows 行为零回退 — Given node 24.15（win 或 linux 四象限任一）——该版本 mock 装载不炸（与平台无关）；When 本地跑同一文件；Then 仍 12/12 通过——quicklog 的 fs 使用面（openSync/renameSync/appendFileSync 等）不含 `constants
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-01
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-01
  tests: test/backlog-batch-a.test.mjs「③b 偷锁 rename 持续失败 → 按超时抛错（不忙等自旋）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-093 test/feedback-batch2-hardening.test.mjs 双端退出码 0；⑥ 段 linux 钉「大小写不符如实落②类不放水」、win32/darwin 钉「折叠命中」，./ 前缀+尾部注记与 NEW 未建两项跨平台钉死
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：linux 大小写敏感；win32/darwin 大小写不敏感；注记与前缀归一跨平台
场景正文：
- 场景：linux 大小写敏感 — Given linux 磁盘/git 实为 `src/foo.js`，声明写 `Src/Foo.js（入口）`；When `reconcileTargetFiles` 归一比对；Then 该声明如实落②类（missing 含 `Src/Foo.js（入口）`）——禁止全局折叠把写错的路径放水
- 场景：win32/darwin 大小写不敏感 — Given 同为不敏感文件系统平台；When 同一比对；Then 折叠命中（missing 空、matched 含 `foo.js`）
- 场景：注记与前缀归一跨平台 — Given 声明写 `./src/foo.js（入口）`（parseTargetFiles 剥 `./`，尾部注记由对账键剥）；When 比对磁盘已改的 `src/foo.js`；Then missing 空、status=ok、matched 命中；随后 `NEW: src/never-made.js` 仍落②类且 isNew=true
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-02
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-02
  tests: test/feedback-batch2-hardening.test.mjs「⑥ target_files 对账路径键归一」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-094 本地 Linux 容器内全量 npm test 零失败（818 文件）
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：全量池本地跑
场景正文：
- 场景：全量池本地跑 — Given 容器可读仓工作树（含 node_modules 纯 JS 依赖）与 git；When 容器内 `npm test --silent`；Then 汇总行失败数为 0（文件数随 HEAD 增长 ≥818）
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-03
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-03
  tests: test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-095 推送后 CI test job 转绿（lint/docs-gate 维持绿）
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：推 CI 回执
场景正文：
- 场景：推 CI 回执 — Given 本地双端（容器 linux + windows）已全绿；When 推送并等 run 结束；Then `gh run view <id>` 三 job 均 success
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-04
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

## FR-runtime-096 零回归：两文件其余断言、src 实现（quicklog.js/verify-postcheck.js）行为不改
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：其余段全绿
场景正文：
- 场景：其余段全绿 — Given 两文件除⑥/③b 外各段断言未改；When 双端跑；Then 全部分段通过（backlog-batch-a 12/12；feedback-batch2 六段全通过）
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-05
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-05
  tests: test/backlog-batch-a.test.mjs「①②③a 各段」 | test/feedback-batch2-hardening.test.mjs「①②③④⑤段」 | test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-097 src/verify-postcheck.js 不嵌裸 NUL 字节（源码可被 grep/rg 检索）
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：检索面
场景正文：
- 场景：检索面 — Given 裸 NUL 已替换为 6 字节转义序列；When `grep -n "foldCase" src/verify-postcheck.js`；Then 正常输出命中行（不再被当二进制）；`node --check` 通过且全量套件零失败
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-06
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-06
  tests: test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-098 quick 审计 EOL 假 M 过滤在 git ≤2.43 上不得静默失效（探测走 --numstat -z）
变更：2026-10-16-ci-linux-residual-fix
状态：active
摘要：老 git 假 M 剔除；rename 不误剔；字面 ` => ` 文件名不误剔（非 windows）
场景正文：
- 场景：老 git 假 M 剔除 — Given git 2.39.5 容器 / 2.43 WSL 下 tracked 文件仅行尾 LF→CRLF；When auditQuickCompletion 审计；Then 该文件归 eolOnlyFiles 且不进 changedFiles（EOL 用例红→绿，修复前容器实证）
- 场景：rename 不误剔 — Given 已暂存重命名 `a.js → b.js` 叠加行尾重写；When 同一审计；Then b.js 留在 changedFiles、eolOnlyFiles 为空（-z 流取新名字段）
- 场景：字面 ` => ` 文件名不误剔（非 windows） — Given POSIX 仓内 tracked 文件 `src/sub/a => b.js` 发生真实内容修改；When 同一审计；Then 该文件留在 changedFiles、不被误归 eolOnlyFiles（非 -z 解析下曾误剔，已锁回归用例；windows 文件名禁用 `>` 故跳过）
全文：.sillyspec/changes/archive/2026-10-16-ci-linux-residual-fix/requirements.md#FR-07
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-ci-linux-residual-fix:flow:测试绑定FR-07
  tests: test/quick-audit-foreign-residue.test.mjs「EOL-only 假 M 剔出审计；真实修改保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-ci-linux-residual-fix
  status: active

## FR-runtime-099 默认同步路径（无 syncImpl 注入）回归单测绿：连接态 + 平台不可达时告警详情不含 AbortSignal 套娃 TypeError
变更：2026-10-17-strict-sync-signal-shape
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-17-strict-sync-signal-shape/requirements.md#FR-01
最近确认：560af6a23a038e6ee6118a7bcce7b6b3d2481e22

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-strict-sync-signal-shape:flow:测试绑定FR-01
  tests: test/terminal-sync-strict.test.mjs「终态默认同步路径（无 syncImpl 注入）→ raceWithAbort 的 {signal} 形状对象原样透传（套娃 TypeError 回归钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-strict-sync-signal-shape
  status: active

## FR-runtime-100 test/terminal-sync-strict.test.mjs 全绿（10 用例）
变更：2026-10-17-strict-sync-signal-shape
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-17-strict-sync-signal-shape/requirements.md#FR-02
最近确认：560af6a23a038e6ee6118a7bcce7b6b3d2481e22

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-17-strict-sync-signal-shape:flow:测试绑定FR-02
  tests: test/terminal-sync-strict.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-17-strict-sync-signal-shape
  status: active

## FR-runtime-101 dogfood 本变更 flow done 收尾强校验静默 confirmed（无 🚨 行、退出码干净）——修复后真实 E2E
变更：2026-10-17-strict-sync-signal-shape
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-17-strict-sync-signal-shape/requirements.md#FR-03
最近确认：560af6a23a038e6ee6118a7bcce7b6b3d2481e22

## FR-runtime-102 createGateSnapshot 增可选 carriedFiles：与 files 同款 overlay 语义（三态源判定/运行时面跳过/import 冒烟），计数与清单入返回值（carriedFiles），不进判定面
变更：2026-10-20-gate-snapshot-carried-deps
状态：active
摘要：携带文件与判定面文件同款源判定
场景正文：
- 场景：携带文件与判定面文件同款源判定 — Given worktree 模式下某他者声明文件在主仓与 worktree 有不同修改；When 以 carriedFiles 携带；Then 走同一三态判定（陈旧取主仓/正常取 worktree/分叉取 worktree 血统并警告）
全文：.sillyspec/changes/archive/2026-10-20-gate-snapshot-carried-deps/requirements.md#FR-01
最近确认：4badee475860d096a9770d50d1f936f922715640

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-gate-snapshot-carried-deps:flow:测试绑定FR-01
  tests: test/gate-snapshot-carried.test.mjs「carriedFiles 同款 overlay 语义与零回归契约」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-gate-snapshot-carried-deps
  status: active

## FR-runtime-103 createVerifyGateSnapshot 的 foreign 剔除改为「判定面剔除+物理携带」，控制台提示携带 N 个他者声明文件；全部被剔仍回退主仓的既有语义不变
变更：2026-10-20-gate-snapshot-carried-deps
状态：active
摘要：坑文主场景（快照依赖自洽）；全部被剔回退语义不变
场景正文：
- 场景：坑文主场景（快照依赖自洽） — Given quick（他者活跃变更）声明并修改 src/util.js 新增导出 stripPathPrefix（主仓工作区在场），本变更（full，worktree）文；When verify 门建快照；Then src/util.js 从判定面剔除（归属语义不变）但物理携带 worktree/工作区版本进快照——快照内本变更测试不再因缺导出 TypeError
- 场景：全部被剔回退语义不变 — Given 本变更 diff 文件全部被他者声明过滤；Then 判定面为空 → 回退主仓（既有 failRef 原因文案不变，不因携带面存在而改变）
全文：.sillyspec/changes/archive/2026-10-20-gate-snapshot-carried-deps/requirements.md#FR-02
最近确认：4badee475860d096a9770d50d1f936f922715640

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-gate-snapshot-carried-deps:flow:测试绑定FR-02
  tests: test/verify-gate-snapshot.test.mjs「坑文主场景：他者声明依赖携带自洽」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-gate-snapshot-carried-deps
  status: active

## FR-runtime-104 未声明的无主脏文件在 worktree 模式照旧不进快照（隔离核心不动）；in-place 无主文件 fail-closed 保留语义不变
变更：2026-10-20-gate-snapshot-carried-deps
状态：active
摘要：未声明脏文件隔离不回退
场景正文：
- 场景：未声明脏文件隔离不回退 — Given worktree 模式主仓 src/foreign-wip.js 为坏语法脏文件且无任何变更声明它；When 快照建立；Then 该文件不进快照（不进判定面也不进携带面——携带面只收「被剔除的他者声明文件」）
全文：.sillyspec/changes/archive/2026-10-20-gate-snapshot-carried-deps/requirements.md#FR-03
最近确认：4badee475860d096a9770d50d1f936f922715640

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-gate-snapshot-carried-deps:flow:测试绑定FR-03
  tests: test/verify-gate-snapshot.test.mjs「native worktree：快照含本变更 worktree 版本 + 变更文档，不含主仓他者脏文件」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-gate-snapshot-carried-deps
  status: active

## FR-runtime-105 坑文场景钉测试：本变更文件依赖他者声明文件的新导出 → 快照含他者文件工作区版本（依赖自洽）；既有快照套件语义变化处（他者声明文件物理在场断言）同步改钉
变更：2026-10-20-gate-snapshot-carried-deps
状态：active
摘要：改钉而非放松
场景正文：
- 场景：改钉而非放松 — Given in-place 用例的 declared-foreign.js；Then 新断言：快照内存在（携带，内容=主仓工作区版本）且返回值 carriedFiles 含它——判定面语义由 FR-02 场景钉定
全文：.sillyspec/changes/archive/2026-10-20-gate-snapshot-carried-deps/requirements.md#FR-04
最近确认：4badee475860d096a9770d50d1f936f922715640

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-gate-snapshot-carried-deps:flow:测试绑定FR-04
  tests: test/verify-gate-snapshot.test.mjs「in-place meta：…他者声明文件物理携带改钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-gate-snapshot-carried-deps
  status: active

## FR-runtime-106 既有 gate-snapshot 全家族测试与 verify 门相关回归全绿
变更：2026-10-20-gate-snapshot-carried-deps
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-20-gate-snapshot-carried-deps/requirements.md#FR-05
最近确认：4badee475860d096a9770d50d1f936f922715640

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-gate-snapshot-carried-deps:flow:测试绑定FR-05
  tests: test/gate-snapshot-lineage.test.mjs「全家族回归」 | test/quick-gate-snapshot.test.mjs | test/verify-gate-snapshot.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-gate-snapshot-carried-deps
  status: active

## FR-unmapped-724 快照口径复用闸按「实际口径」收敛——快照创建慢性失败时 passed 幂等复用第二轮起命中（死循环断根）
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：死循环断根
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-01
最近确认：84407be4

## FR-unmapped-725 快照创建失败/跳过高可见 + 摩擦记账
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：可见性
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-02
最近确认：84407be4

## FR-unmapped-726 复用指纹代码树内容键化——纯文档提交不击穿、代码提交必击穿；口径单点
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：文档提交存活 / 代码提交击穿
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-03
最近确认：84407be4

## FR-unmapped-727 复用判定落盘可观测
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：取证直读
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-04
最近确认：84407be4

## FR-unmapped-728 verify 收口纯事实门前移——声明缺失时零测试执行秒级失败
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：秒级失败
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-05
最近确认：84407be4

## FR-unmapped-729 trace 行 repo 归属——写侧透传、读侧按行解析
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：跨仓行不再悬空
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-06
最近确认：84407be4

## FR-unmapped-730 跨仓对账锚点窗口覆盖多笔提交
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：多笔提交对上
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-07
最近确认：84407be4

## FR-unmapped-731 wt-commit 跨仓 worktree 识别
变更：2026-10-09-verify-reuse-friction
状态：active
摘要：跨仓推断
全文：.sillyspec/changes/archive/2026-10-09-verify-reuse-friction/requirements.md#FR-08
最近确认：84407be4

## FR-runtime-107 有缓存时 GET 带 ?since=<spec_version>，响应增量行合并进缓存（含墓碑行）
变更：2026-10-21-cli-manifest-since-cache
状态：active
摘要：增量主路径；墓碑行经增量流合并
全文：.sillyspec/changes/archive/2026-10-21-cli-manifest-since-cache/requirements.md#FR-01
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-cli-manifest-since-cache:flow:测试绑定FR-01
  tests: test/spec-sync-manifest-cache.test.mjs「增量主路径合并+缓存推进 / 墓碑行合并」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-cli-manifest-since-cache
  status: active

## FR-runtime-108 无缓存/对账轮/环境变量 SILLYSPEC_SPEC_SYNC_FULL=1 走全量并落缓存
变更：2026-10-21-cli-manifest-since-cache
状态：active
摘要：首次同步；对账轮
全文：.sillyspec/changes/archive/2026-10-21-cli-manifest-since-cache/requirements.md#FR-02
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-cli-manifest-since-cache:flow:测试绑定FR-02
  tests: test/spec-sync-manifest-cache.test.mjs「首拉全量落缓存 / 对账轮全量 / SILLYSPEC_SPEC_SYNC_FULL 强制全量」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-cli-manifest-since-cache
  status: active

## FR-runtime-109 旧平台响应（无 spec_version）自动作废缓存回退全量，行为与现状一致
变更：2026-10-21-cli-manifest-since-cache
状态：active
摘要：旧平台兼容
全文：.sillyspec/changes/archive/2026-10-21-cli-manifest-since-cache/requirements.md#FR-03
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-cli-manifest-since-cache:flow:测试绑定FR-03
  tests: test/spec-sync-manifest-cache.test.mjs「旧平台无 spec_version 回退全量并作废缓存」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-cli-manifest-since-cache
  status: active

## FR-runtime-110 服务端 spec_version 倒退（重建）时一次性全量重拉对账
变更：2026-10-21-cli-manifest-since-cache
状态：active
摘要：服务端重建
全文：.sillyspec/changes/archive/2026-10-21-cli-manifest-since-cache/requirements.md#FR-04
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-cli-manifest-since-cache:flow:测试绑定FR-04
  tests: test/spec-sync-manifest-cache.test.mjs「spec_version 倒退全量对账 / 对账请求失败 fail-closed」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-cli-manifest-since-cache
  status: active

## FR-runtime-111 稳态清单请求 <1s（本地 mock e2e 实证）
变更：2026-10-21-cli-manifest-since-cache
状态：active
摘要：稳态 e2e
全文：.sillyspec/changes/archive/2026-10-21-cli-manifest-since-cache/requirements.md#FR-05
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-cli-manifest-since-cache:flow:测试绑定FR-05
  tests: test/spec-sync-manifest-cache.test.mjs「稳态无差异端到端 <1s 且零 POST」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-cli-manifest-since-cache
  status: active

## FR-runtime-112 pytest 运行器提取保留尾随 flag（必须）
变更：2026-10-21-deps-batch-runner-flags
状态：active
摘要：模块命令含并行 flag；无尾随 flag 的命令零变化
全文：.sillyspec/changes/archive/2026-10-21-deps-batch-runner-flags/requirements.md#FR-01
最近确认：1ba462e5a93816d1ed674acb9d26ff550b5d92af

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-deps-batch-runner-flags:flow:测试绑定FR-01
  tests: test/deps-batch-runner-flags.test.mjs「extractRunnerTrailingFlags：裸 flag/含等号 flag/吃值 flag 值/位置参数丢弃矩阵」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-deps-batch-runner-flags
  status: active

## FR-runtime-113 批命令形态钉死 + 既有语义面零回归（必须）
变更：2026-10-21-deps-batch-runner-flags
状态：active
摘要：重定基保持
全文：.sillyspec/changes/archive/2026-10-21-deps-batch-runner-flags/requirements.md#FR-02
最近确认：1ba462e5a93816d1ed674acb9d26ff550b5d92af

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-deps-batch-runner-flags:flow:测试绑定FR-02
  tests: test/deps-batch-runner-flags.test.mjs「buildDepsBatches：-n auto 保留 + 重定基不破 + 无 flag 命令逐字不变 + jsx 路径不动」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-deps-batch-runner-flags
  status: active

## FR-runtime-114 纯函数导出 + 直测（必须）
变更：2026-10-21-deps-batch-runner-flags
状态：active
摘要：测试面
全文：.sillyspec/changes/archive/2026-10-21-deps-batch-runner-flags/requirements.md#FR-03
最近确认：1ba462e5a93816d1ed674acb9d26ff550b5d92af

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-21-deps-batch-runner-flags:flow:测试绑定FR-03
  tests: test/deps-batch-runner-flags.test.mjs「回归面：verify-postcheck 既有相关用例复跑 0 失败」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-21-deps-batch-runner-flags
  status: active

## FR-runtime-115 appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）
变更：2026-10-28-knowledge-hits-cli-push
状态：active
摘要：写后直报；端点失败静默
全文：.sillyspec/changes/archive/2026-10-28-knowledge-hits-cli-push/requirements.md#FR-01
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-knowledge-hits-cli-push:flow:测试绑定FR-01
  tests: test/knowledge-hits-push.test.mjs「端点失败静默：非 2xx/网络错 warn 一行不抛、本地行完好」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-knowledge-hits-cli-push
  status: active

## FR-runtime-116 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底
变更：2026-10-28-knowledge-hits-cli-push
状态：active
摘要：主流程不阻塞
全文：.sillyspec/changes/archive/2026-10-28-knowledge-hits-cli-push/requirements.md#FR-02
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-knowledge-hits-cli-push:flow:测试绑定FR-02
  tests: test/knowledge-hits-push.test.mjs「直报不阻塞：appendKnowledgeHit 同步返回不等待 fetch」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-knowledge-hits-cli-push
  status: active

## FR-runtime-117 env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）；未配置 platform（未连接平台）静默跳过零日志
变更：2026-10-28-knowledge-hits-cli-push
状态：active
摘要：开关关闭；未连接平台
全文：.sillyspec/changes/archive/2026-10-28-knowledge-hits-cli-push/requirements.md#FR-03
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-knowledge-hits-cli-push:flow:测试绑定FR-03
  tests: test/knowledge-hits-push.test.mjs「未配置静默跳过零日志 / SILLYSPEC_HITS_PUSH=0 关闭」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-knowledge-hits-cli-push
  status: active

## FR-runtime-118 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响
变更：2026-10-28-knowledge-hits-cli-push
状态：active
摘要：收口实测
全文：.sillyspec/changes/archive/2026-10-28-knowledge-hits-cli-push/requirements.md#FR-04
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0

## FR-runtime-119 跨平台兼容（Windows/Linux/macOS 路径与编码）
变更：2026-10-28-knowledge-hits-cli-push
状态：active
摘要：Windows 路径形态
全文：.sillyspec/changes/archive/2026-10-28-knowledge-hits-cli-push/requirements.md#FR-05
最近确认：630392b1ae1c981f23eb714630d3a2c08496bfb0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-knowledge-hits-cli-push:flow:测试绑定FR-05
  tests: test/knowledge-hits-push.test.mjs「specBase 反推跨平台路径形态（反斜杠/尾分隔符）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-knowledge-hits-cli-push
  status: active

## FR-runtime-120 test/r5-wiring-three.test.mjs 单独直跑不再抛 TDZ，原用例全绿
变更：2026-10-28-stages-cycle-root-fix
状态：active
摘要：TDZ 入口形态直跑
全文：.sillyspec/changes/archive/2026-10-28-stages-cycle-root-fix/requirements.md#FR-01
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-stages-cycle-root-fix:flow:测试绑定FR-01
  tests: test/r5-wiring-three.test.mjs | test/stages-cycle-regression.test.mjs「TDZ 入口形态直跑绿（r5-wiring 同入口 import 完整进程）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-stages-cycle-root-fix
  status: active

## FR-runtime-121 run/shared.js 静态 import 面不再含 stages/index.js（测试断言锁死，防回边复潮）
变更：2026-10-28-stages-cycle-root-fix
状态：active
摘要：断言锁死
全文：.sillyspec/changes/archive/2026-10-28-stages-cycle-root-fix/requirements.md#FR-02
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-stages-cycle-root-fix:flow:测试绑定FR-02
  tests: test/stages-cycle-regression.test.mjs「run/shared 静态 import 面断言 + 点用动态 import 存在」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-stages-cycle-root-fix
  status: active

## FR-runtime-122 local.yaml 的 r5-wiring-three known_failures 机器豁免撤销（该测试回归默认验证面）
变更：2026-10-28-stages-cycle-root-fix
状态：active
摘要：豁免撤销
全文：.sillyspec/changes/archive/2026-10-28-stages-cycle-root-fix/requirements.md#FR-03
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-stages-cycle-root-fix:flow:测试绑定FR-03
  tests: test/stages-cycle-regression.test.mjs「known_failures 清单不含 r5-wiring 锚定键」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-stages-cycle-root-fix
  status: active

## FR-runtime-123 CLI 既有入口零回归（受影响面测试绿）
变更：2026-10-28-stages-cycle-root-fix
状态：active
摘要：注册表消费面回归
全文：.sillyspec/changes/archive/2026-10-28-stages-cycle-root-fix/requirements.md#FR-04
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-28-stages-cycle-root-fix:flow:测试绑定FR-04
  tests: test/stages-cycle-regression.test.mjs「getStageSteps 注册表消费回归（quick/standard 两档）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-28-stages-cycle-root-fix
  status: active

## FR-runtime-124 零新依赖
变更：2026-10-28-stages-cycle-root-fix
状态：active
摘要：依赖面断言
全文：.sillyspec/changes/archive/2026-10-28-stages-cycle-root-fix/requirements.md#FR-05
最近确认：3995056145c880fe9bf3fb41ce47ab7a9ef45fd7
