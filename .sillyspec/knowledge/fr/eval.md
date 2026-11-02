---
author: sillyspec-fr-index
created_at: 2026-10-15T12:09:39.989Z
---

# FR 索引 — eval

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/eval.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-eval-001 eval/tasks/004-phase-stats/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/events.log（承载五类隐含输入的固定 fixture）、verify.mjs（期望硬编码、fail 时可定位哪条隐含面挂了）、solution/bin/phase-stats.mjs（参考解过 verify）
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：四件套齐全；指令不泄露隐含面
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-01
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-planted-defect-probe:flow:测试绑定FR-01
  tests: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-planted-defect-probe
  status: active

## FR-eval-002 verify.mjs 判分独立于实现：期望值硬编码、逐断言可定位、输出契约严格
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：期望硬编码且可定位
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-02
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-planted-defect-probe:flow:测试绑定FR-02
  tests: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-planted-defect-probe
  status: active

## FR-eval-003 dry-run 双路径：solution 参考解过 verify（pass 路径）、占位产物被 verify 拒（fail 路径）
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：参考解通过；无实现被拒
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-03
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-planted-defect-probe:flow:测试绑定FR-03
  tests: test/eval-planted-defect-probe.test.mjs「FR-03 参考解过 verify / 无实现被 verify 拒」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-planted-defect-probe
  status: active

## FR-eval-004 判别力：naive 实现（按 phase 名配对、忽略 sessionId）verify 必拒
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：naive 被拒；判别力测试进仓库套件
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-04
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-planted-defect-probe:flow:测试绑定FR-04
  tests: test/eval-planted-defect-probe.test.mjs「FR-04 naive 实现被 verify 拒」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-planted-defect-probe
  status: active

## FR-eval-005 eval 管道集成：node eval/run.mjs --dry-run 含新任务零报错跑通
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：dry-run 全管道
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-05
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

## FR-eval-006 变更自身测试面与 lint
变更：2026-10-15-eval-planted-defect-probe
状态：active
摘要：lint 与测试面
全文：.sillyspec/changes/archive/2026-10-15-eval-planted-defect-probe/requirements.md#FR-06
最近确认：c4b4f1f02b47ee2b5b2411f345d3ead12bf2f198

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-planted-defect-probe:flow:测试绑定FR-06
  tests: test/eval-planted-defect-probe.test.mjs「FR-03/04 全部用例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-planted-defect-probe
  status: active

## FR-eval-007 prepareWorkdir 产出目录名不以数字字符开头（路径分隔符后首段非 [0-9]），且仍含 taskId 与 arm 标识
变更：2026-10-15-eval-workdir-naming
状态：active
摘要：命名安全
全文：.sillyspec/changes/archive/2026-10-15-eval-workdir-naming/requirements.md#FR-01
最近确认：6e5c15277fae5b77214ab18c12e2a4648215f616

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-workdir-naming:flow:测试绑定FR-01
  tests: test/eval-workdir-naming.test.mjs「workdir 命名不以数字开头」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-workdir-naming
  status: active

## FR-eval-008 命名断言进仓库测试套件，lint 通过
变更：2026-10-15-eval-workdir-naming
状态：active
摘要：断言双形态
全文：.sillyspec/changes/archive/2026-10-15-eval-workdir-naming/requirements.md#FR-02
最近确认：6e5c15277fae5b77214ab18c12e2a4648215f616

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-workdir-naming:flow:测试绑定FR-02
  tests: test/eval-workdir-naming.test.mjs「workdir 命名不以数字开头」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-workdir-naming
  status: active

## FR-eval-009 adapter command 追加 --dangerously-skip-permissions（两臂同旗标），headless 被测 agent 可写 workdir
变更：2026-10-15-eval-adapter-permissions
状态：active
摘要：旗标在场
全文：.sillyspec/changes/archive/2026-10-15-eval-adapter-permissions/requirements.md#FR-01
最近确认：cd059201772ee8e9f819019452c770f2cd04af70

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-adapter-permissions:flow:测试绑定FR-01
  tests: test/eval-adapter-config.test.mjs「adapter command 含 skip-permissions 旗标」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-adapter-permissions
  status: active

## FR-eval-010 配置漂移保护测试 + 根因修正留痕 + lint
变更：2026-10-15-eval-adapter-permissions
状态：active
摘要：漂移保护与留痕
全文：.sillyspec/changes/archive/2026-10-15-eval-adapter-permissions/requirements.md#FR-02
最近确认：cd059201772ee8e9f819019452c770f2cd04af70

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-adapter-permissions:flow:测试绑定FR-02
  tests: test/eval-adapter-config.test.mjs「adapter command 含 skip-permissions 旗标」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-adapter-permissions
  status: active

## FR-eval-011 adapter.maxTurns 60 → 120，B 臂流程获得完成空间
变更：2026-10-15-eval-b-arm-turn-budget
状态：active
摘要：轮数帽修正
全文：.sillyspec/changes/archive/2026-10-15-eval-b-arm-turn-budget/requirements.md#FR-01
最近确认：cd61cae0088f013ce491b99f0e0c88a1c29fce41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-b-arm-turn-budget:flow:测试绑定FR-01
  tests: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-b-arm-turn-budget
  status: active

## FR-eval-012 B 臂 promptTemplate 去除退役通道话术
变更：2026-10-15-eval-b-arm-turn-budget
状态：active
摘要：话术修正
全文：.sillyspec/changes/archive/2026-10-15-eval-b-arm-turn-budget/requirements.md#FR-02
最近确认：cd61cae0088f013ce491b99f0e0c88a1c29fce41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-b-arm-turn-budget:flow:测试绑定FR-02
  tests: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-b-arm-turn-budget
  status: active

## FR-eval-013 配置测试扩展 + lint
变更：2026-10-15-eval-b-arm-turn-budget
状态：active
摘要：测试扩展
全文：.sillyspec/changes/archive/2026-10-15-eval-b-arm-turn-budget/requirements.md#FR-03
最近确认：cd61cae0088f013ce491b99f0e0c88a1c29fce41

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-b-arm-turn-budget:flow:测试绑定FR-03
  tests: test/eval-adapter-config.test.mjs「maxTurns 轮数帽与 B 臂话术」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-b-arm-turn-budget
  status: active

## FR-eval-014 eval/tasks/005-orders-export/ 四件套在场：task.json（instruction 只命名表层契约）、files/data/orders.csv（五类隐含面的固定 fixture，字节精确）、verify.mjs（期望硬编码）、solution/bin/export-orders.mjs（参考解全对）
变更：2026-10-15-eval-probe2-orders-export
状态：active
摘要：四件套齐全且指令不泄露；fixture 字节精确
全文：.sillyspec/changes/archive/2026-10-15-eval-probe2-orders-export/requirements.md#FR-01
最近确认：ece303d0f2e84b1fefffff3427e826c919d71151

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-probe2-orders-export:flow:测试绑定FR-01
  tests: test/eval-probe2-orders.test.mjs「FR-02 参考解过 verify / naive 拒 / 无实现拒」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-probe2-orders-export
  status: active

## FR-eval-015 判别力：naive 实现（index 列位、不剥 BOM/CRLF/引号）verify 必拒；参考解必过
变更：2026-10-15-eval-probe2-orders-export
状态：active
摘要：三用例判别
全文：.sillyspec/changes/archive/2026-10-15-eval-probe2-orders-export/requirements.md#FR-02
最近确认：ece303d0f2e84b1fefffff3427e826c919d71151

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-probe2-orders-export:flow:测试绑定FR-02
  tests: test/eval-probe2-orders.test.mjs「FR-02 参考解过 verify / naive 拒 / 无实现拒」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-probe2-orders-export
  status: active

## FR-eval-016 eval 管道集成：node eval/run.mjs --dry-run 含 005 零报错跑通
变更：2026-10-15-eval-probe2-orders-export
状态：active
摘要：dry-run 全管道
全文：.sillyspec/changes/archive/2026-10-15-eval-probe2-orders-export/requirements.md#FR-03
最近确认：ece303d0f2e84b1fefffff3427e826c919d71151

## FR-eval-017 变更自身测试面与 lint
变更：2026-10-15-eval-probe2-orders-export
状态：active
摘要：测试与 lint
全文：.sillyspec/changes/archive/2026-10-15-eval-probe2-orders-export/requirements.md#FR-04
最近确认：ece303d0f2e84b1fefffff3427e826c919d71151

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-probe2-orders-export:flow:测试绑定FR-04
  tests: test/eval-probe2-orders.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-probe2-orders-export
  status: active

## FR-eval-018 spawnCapture 超时收敛绑定化——杀树同步化 + 宽限强制 settle
变更：2026-10-15-eval-timeout-enforcement
状态：active
摘要：超时上界
全文：.sillyspec/changes/archive/2026-10-15-eval-timeout-enforcement/requirements.md#FR-01
最近确认：bb08a72037849455c8313190af062749daed5e5a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-timeout-enforcement:flow:测试绑定FR-01
  tests: test/eval-timeout-enforcement.test.mjs「孤儿树超时强制收敛」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-timeout-enforcement
  status: active

## FR-eval-019 回归测试 + lint
变更：2026-10-15-eval-timeout-enforcement
状态：active
摘要：测试锁定
全文：.sillyspec/changes/archive/2026-10-15-eval-timeout-enforcement/requirements.md#FR-02
最近确认：bb08a72037849455c8313190af062749daed5e5a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-eval-timeout-enforcement:flow:测试绑定FR-02
  tests: test/eval-timeout-enforcement.test.mjs「正常路径零回归 / 孤儿树超时强制收敛」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-eval-timeout-enforcement
  status: active

## FR-eval-020 三源数据集：organic（遥测 query 去重池，本仓 110/平台 548，抽样人工 anchor 级标签 30 条起步）、self（211 条归档 input 回放，leave-one-out 防泄漏，只作 smoke 不作质量指标）、probes（合成缺陷 fixtures）
变更：2026-11-02-knowledge-eval
状态：active
摘要：organic 标签缺失；self 集泄漏
场景正文：
- 场景：organic 标签缺失 — Given 某 organic case 未填 expected 或 expected 为空数组；When runner 加载数据集；Then 该 case 必须被跳过并计入 skipped_cases，禁止静默当作零命中参与指标
- 场景：self 集泄漏 — Given self case 的查询来自归档 input 且期望命中的知识由同一变更蒸馏；When 计算指标；Then 该 case 必须仅出现在 smoke 段，且 leave-one-out 剔除自身变更蒸馏的知识后仍可检出链路是否连通
全文：.sillyspec/changes/archive/2026-11-02-knowledge-eval/requirements.md#FR-01
最近确认：50c240fc6125d0e81e9bb0f1b2de9edf6431e79f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-eval:flow:测试绑定FR-01
  tests: test/eval-knowledge-dataset.test.mjs「三源数据集加载与校验」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-eval
  status: active

## FR-eval-021 缺陷探针 fixtures 覆盖六类：score 输出契约（=命中标签数）、词边界（_/- 策略）、fr/decisions 路由行混入 entries 率、scope 层手工条目可达性、known-issues 已修复条目注入率、决策↔代码关联率
变更：2026-11-02-knowledge-eval
状态：active
摘要：缺陷存在时
场景正文：
- 场景：缺陷存在时 — Given 当前代码仍带某类缺陷；When 运行对应 probe fixture；Then 断言必须失败并给出缺陷类别与实测值，禁止 fail-open 跳过
全文：.sillyspec/changes/archive/2026-11-02-knowledge-eval/requirements.md#FR-02
最近确认：50c240fc6125d0e81e9bb0f1b2de9edf6431e79f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-eval:flow:测试绑定FR-02
  tests: test/eval-knowledge-probes.test.mjs「六类缺陷探针断言」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-eval
  status: active

## FR-eval-022 分面 runner 输出 Top-1/Top-3（entries@3、decisionHits@5、search@10、scope@3/20 四个核心面），raw 与 rendered 两套结果可区分引擎未召回与渲染截断
变更：2026-11-02-knowledge-eval
状态：active
摘要：渲染截断
场景正文：
- 场景：渲染截断 — Given 引擎在第 6 位命中了期望条目而消费面只取前 3；When 输出该 case；Then raw 段必须记录该条目的 rank=6，rendered 段必须记录未呈现，两者差异计入 truncated 计数
全文：.sillyspec/changes/archive/2026-11-02-knowledge-eval/requirements.md#FR-03
最近确认：50c240fc6125d0e81e9bb0f1b2de9edf6431e79f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-eval:flow:测试绑定FR-03
  tests: test/eval-knowledge-runner.test.mjs「分面指标与 raw/rendered 对比」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-eval
  status: active

## FR-eval-023 全流程零网络零遥测副作用（SILLYSPEC_KNOWLEDGE_VECTOR=off、SILLYSPEC_HITS_PUSH=0、临时 runtimeDir），结果带 git HEAD + knowledge 目录 hash 快照指纹
变更：2026-11-02-knowledge-eval
状态：active
摘要：副作用检测
场景正文：
- 场景：副作用检测 — Given runner 在真实仓上执行一轮评测；When 对比执行前后 knowledge-hits.jsonl 的行数与平台网络请求计数；Then 行数必须不变且零网络请求；缓存类写入仅允许出现在临时目录
全文：.sillyspec/changes/archive/2026-11-02-knowledge-eval/requirements.md#FR-04
最近确认：50c240fc6125d0e81e9bb0f1b2de9edf6431e79f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-eval:flow:测试绑定FR-04
  tests: test/eval-knowledge-isolation.test.mjs「零副作用与快照指纹」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-eval
  status: active

## FR-eval-024 baseline.json 可提交可 diff，npm run eval:knowledge 可复跑，附零网络 smoke test
变更：2026-11-02-knowledge-eval
状态：active
摘要：基线漂移
场景正文：
- 场景：基线漂移 — Given 当前快照指纹与 baseline.json 记录的指纹不同；When 默认运行（非 --set-baseline）；Then 输出必须显式标注 snapshot_mismatch 并同时给出两套指标，禁止静默覆盖基线
全文：.sillyspec/changes/archive/2026-11-02-knowledge-eval/requirements.md#FR-05
最近确认：50c240fc6125d0e81e9bb0f1b2de9edf6431e79f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-eval:flow:测试绑定FR-05
  tests: test/eval-knowledge-smoke.test.mjs「baseline 读写往返与 CLI 冒烟」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-eval
  status: active
