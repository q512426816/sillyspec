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

## FR-eval-025 score 契约：buildSearchMatches 接收 query、score=实际命中标签数，合成条目输出 channel 字段；probe score-contract 转 GREEN
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：表长不再冒充命中数；合成条目 channel
场景正文：
- 场景：表长不再冒充命中数 — Given 某路由行有 4 个关键词而 query 只命中其中 1 个；When 调 search 视图；Then score 必须为 1 且 matchedTags 长度为 1
- 场景：合成条目 channel — Given 词片回退返回的合成条目 keywords 为查询词片；When 输出 search 视图；Then 该行必须带 channel=fallback，score 按命中词片数计算
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-01
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-01
  tests: test/knowledge-rank-denoise.test.mjs「score 契约与 channel」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-026 词边界：两处统一 _ 为词字符、- 为边界（[^a-z0-9_]）；shingle 抽取保留 _- 整词并额外产出拆分片段；kebab-case 正反例单测（worktree 命中 2026-*-worktree-*、不命中 worktree_apply）
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：下划线不越界；kebab-case 仍可命中；snake_case 词片拆分
场景正文：
- 场景：下划线不越界 — Given 关键词 node 与上下文含 node_modules；When 匹配；Then 必须不命中；上下文含独立 node 时必须命中
- 场景：kebab-case 仍可命中 — Given 关键词 worktree 与上下文 2026-05-29-worktree-isolation；When 匹配；Then 必须命中；上下文 worktree_apply 时必须不命中
- 场景：snake_case 词片拆分 — Given 查询含 worktree_apply；When 抽取词片；Then 必须同时含 worktree_apply 与 worktree、apply 拆分片段
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-02
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-02
  tests: test/knowledge-rank-denoise.test.mjs「词边界与词片拆分」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-027 已修复过滤：known-issues 分类 + INDEX display/anchor 显式词（已修复/已解决/已退役）判定，fail-open；includeResolved 贯穿 search；resolvedFiltered 披露；probe fixed-entries 转 GREEN
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：默认排除与显式包含；非已修复不误杀
场景正文：
- 场景：默认排除与显式包含 — Given 一条 INDEX 行 display 含「已修复」；When 默认 query 命中该行；Then entries 必须不含它且 resolvedFiltered 含该文件；带 --include-resolved 时必须返回
- 场景：非已修复不误杀 — Given known-issues 中标题含 🟢 但 display/anchor 无显式词（现行事实/债务）；When 默认 query 命中；Then 必须保留（绿色标记不是唯一键）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-03
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-03
  tests: test/knowledge-rank-denoise.test.mjs「已修复过滤与 includeResolved」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-028 routeHits 分离：entries 只留手工条目、新增条件式 routeHits 键、decisionHits 内部全量保留；search/prompt/execute/flow/complete 不丢 routeHits 可见性（指针行）；空 entries 不渲染空知识段；probe route-rows 转 GREEN
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：entries 纯净且决策通道不受影响；空 entries 不渲染空段
场景正文：
- 场景：entries 纯净且决策通道不受影响 — Given 查询同时命中手工条目与 decisions 路由行；When 调 matchByRouting；Then entries 只含手工条目、routeHits 含 decisions 文件、decisionHits 非空
- 场景：空 entries 不渲染空段 — Given 查询只命中 fr/decisions 路由行；When 渲染知识注入段；Then 必须不出段头空段（只出 routeHits 指针行或整段省略）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-04
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-04
  tests: test/knowledge-rank-denoise.test.mjs「routeHits 分离」 | test/knowledge-tier-denoise.test.mjs「路由行移出 entries 且 decisionHits 保留」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-029 DF 排序：entries 可展示语料为分母、Σ(1/DF) 或命中数优先+DF 破平、合成单测锁泛词不主导；organic entries/search 对比基线并单列候选集缩小影响
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：泛词不主导；确定性
场景正文：
- 场景：泛词不主导 — Given 5 条路由行含泛词 sillyspec、1 条含长尾词（两条都命中 query）；When 排序；Then 长尾词条目必须排在泛词条目之前
- 场景：确定性 — Given 两条条目同分；When 重复运行；Then 顺序必须一致（INDEX 行序 tie-break）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-05
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-05
  tests: test/knowledge-rank-denoise.test.mjs「DF 泛词不主导」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-030 回归：knowledge 面 20 个测试文件全绿；eval 基线更新（version=1）；scope-manual 记录为变更 2 范围
变更：2026-11-02-knowledge-rank-denoise
状态：active
摘要：探针与基线
场景正文：
- 场景：探针与基线 — Given 变更完成；When 跑 eval --smoke 与全量；Then 四类转 GREEN、scope-manual 仍 RED（范围外留档）、baseline version=1
全文：.sillyspec/changes/archive/2026-11-02-knowledge-rank-denoise/requirements.md#FR-06
最近确认：18ab28b6313ad55ebae0f53b7f2cbf5d19878b79

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-rank-denoise:flow:测试绑定FR-06
  tests: test/eval-knowledge-probes.test.mjs「四类探针转绿」 | test/eval-knowledge-runner.test.mjs「基线指标与 details」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-rank-denoise
  status: active

## FR-eval-031 A 段：entry 节点补 category/anchor/display；section 级 doc-refs 建边（extractFilePaths + normalizeAnchorForCompare 前缀容忍，保持 medium 强度不动 graphPath/impact）；scopeRecall 显式收 doc-refs entry 且 entries-only 返回非 null；GRAPH_CACHE_VERSION 1→2 且 fingerprint 含 INDEX 引用的手工文档 stat
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：section 级隔离；entries-only 不短路
场景正文：
- 场景：section 级隔离 — Given 同一文档两个 section，只有 A 节正文含 src/foo.js；When 对 src/foo.js 做 scope 遍历；Then 只有 A 节对应的 entry 可达，B 节不得串入
- 场景：entries-only 不短路 — Given scopeFiles 只命中手工文档 doc-refs、无任何决策锚点；When scopeRecall + buildScopeRecallResult；Then 必须返回 matched 结果（不得因 decisionHits 空而 null）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-01
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「section 级 doc-refs 与 scopeRecall entry 收集」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-032 B 段：两跳 file→deliverables 反查 change→from-change 反查决策，只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；scope hit 设 score（direct=2/two-hop=1）保证渲染面过滤器可见；引擎 decision cap 保持 20
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：两跳只收防复潮；渲染面可见
场景正文：
- 场景：两跳只收防复潮 — Given 某文件被 100+ 变更交付过且两跳可达 144 条决策（139 implemented）；When scope 遍历；Then 输出只含 rejected/deathPath 条目，且 cap ≤20
- 场景：渲染面可见 — Given 两跳命中一条 rejected 决策；When 走 flow 防复潮过滤器（h.deathPath || (rejected && score>0)）；Then 该条目必须通过（score 在场）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-02
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-02
  tests: test/knowledge-graph.test.mjs「两跳 rejected/deathPath 与排序」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-033 C 段：平台 decisions 补 8~10 条（27 条非 parking rejected 中选、排除同文件重复 id、query 用「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case（平台用 fetch-sse/auth_deps/main.py 三个真实 doc-refs 路径）；validateLabels 扩展 scope_files 存在性与 anchor heading 归一化校验 + scope-unreachable 静态可达性警告
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：停车 reject 不可选
场景正文：
- 场景：停车 reject 不可选 — Given 平台 rejected 中有 24 条位于 decisions/unmapped.md（停车场）；When 构造 decisions case；Then 禁止选用这些条目（结构性不可命中）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-03
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-03
  tests: test/eval-knowledge-dataset.test.mjs「scope_files 校验与 scope-unreachable」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-034 探针：scope-manual GREEN（补 entries-only 正例与 section 隔离负例）；其余五类保持/转绿
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：探针升级
场景正文：
- 场景：探针升级 — Given 修复后的图谱与 scopeRecall；When 跑六类探针；Then 六类全 GREEN（scope-manual 含新正负例）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-04
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-04
  tests: test/eval-knowledge-probes.test.mjs「scope-manual entries-only 正例与 section 负例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-035 验收口径：原 5 条 scope 冻结子集单列如实报告（预计仍 0.2，不得用新增 case 掩盖）；新增 scope 子集单列 top3（平台 n≥6、本仓 n≥5）；entries/decisions/search/fr 旧 case 逐条 rank 不回归（平台 decisions n 扩大导致 top3 变化属预期）
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：子集单列
场景正文：
- 场景：子集单列 — Given scope 面数据集含 frozen 与 added 两组 case；When 跑评测；Then 输出含 scope.subsets.frozen 与 scope.subsets.added 两套指标，且 details 可按子集追溯
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-05
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-05
  tests: test/eval-knowledge-runner.test.mjs「scope 子集单列与 details」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-036 回归：knowledge 面全绿 + lint 绿；baseline 更新 version=1；organic 到每仓 50 推迟为独立数据变更
变更：2026-11-02-knowledge-scope-recall
状态：active
摘要：收口口径
场景正文：
- 场景：收口口径 — Given 变更完成；When flow done；Then knowledge 面测试全绿 + lint 绿 + baseline version=1 + 悬空增量已单列说明
全文：.sillyspec/changes/archive/2026-11-02-knowledge-scope-recall/requirements.md#FR-06
最近确认：d6113aa18cb942dc8ffd62f6797649fa63c44aef

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-scope-recall:flow:测试绑定FR-06
  tests: test/knowledge-graph.test.mjs | test/knowledge-hotpath-cache.test.mjs「手工文档编辑触发图缓存失效」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-scope-recall
  status: active

## FR-eval-037 结果契约：路由命中时融合只追加 scopeDecisionHits/scopeEntries（带 via provenance），不设 json.scope、不截断路由 raw 列表；scope 空/无命中时结果逐字段不变（deepEqual 保护）
变更：2026-11-02-knowledge-fusion
状态：active
摘要：无 scope 零变化；只追加不重排
场景正文：
- 场景：无 scope 零变化 — Given 调用方不传 scopeFiles；When 调 matchKnowledgeHybrid/matchKnowledgeWithScope；Then 返回结果与不融合实现逐字段 deepEqual（既有消费者零回归）
- 场景：只追加不重排 — Given 路由命中 5 条且 scope 命中 2 条独有决策；When 融合；Then decisionHits 保持原 5 条原序，scopeDecisionHits 含 2 条（via 标记），entries 原序不变
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-01
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-01
  tests: test/knowledge-fusion.test.mjs「结果契约与无 scope deepEqual」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-038 合并算法：决策键 file#id#change、条目键 file#anchor；路由优先保留、scope 按 scopeRecall 原序追加；上限沿用 20/3；不做跨通道 score 排序；ghost/缺 file/id 的畸形命中过滤
变更：2026-11-02-knowledge-fusion
状态：active
摘要：跨变更同号；幽灵节点
场景正文：
- 场景：跨变更同号 — Given 同一 file#id 在路由与 scope 各出现一次但 change 不同；When 融合；Then 两条都保留（键含 change），路由条在 decisionHits、scope 条在 scopeDecisionHits
- 场景：幽灵节点 — Given scope 遍历经 supersedes 链到达 ghost 决策（无 attrs.hit）；When 融合；Then 该畸形条目必须被过滤，不得产出 file/id 缺失的 hit
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-02
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-02
  tests: test/knowledge-fusion.test.mjs「合并去重/幽灵过滤/cap」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-039 展示：flow/complete 的 rejected 渲染 = 路由 top-5 + scope 独立小节（至多 3 条，带触达文件来源）；execute/Wave 走新增同步融合入口 matchKnowledgeWithScope（fuseScopeRecall 纯函数 + graph 正向依赖），prompt/execute 孪生渲染格式锁同步
变更：2026-11-02-knowledge-fusion
状态：active
摘要：展示隔离；同步融合入口
场景正文：
- 场景：展示隔离 — Given 路由已有 5 条 rejected 且 scope 有 3 条热文件否决；When flow 渲染；Then 前 5 条仍是路由条目，scope 3 条在独立「触达文件关联」小节
- 场景：同步融合入口 — Given buildKnowledgeInjection/Wave 传入 scopeFiles；When 调用同步入口；Then 段内出现 scope 手工条目指针行，且不传 scope 时与旧输出逐字节等价
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-03
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-03
  tests: test/knowledge-fusion.test.mjs「展示隔离与同步入口」 | test/knowledge-inject.test.mjs「孪生格式锁」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-040 键来源：execute step 用 design 交付清单；Wave 用 task card target_files/过滤后的 allowed_paths；quick 仅 guard.allowedFiles 存在时传；{DECISION_HITS} 与 cmdSearch 明确不传并写明理由；所有键规整为图内精确文件路径（目录前缀/glob 不传）
变更：2026-11-02-knowledge-fusion
状态：active
摘要：glob 不传
场景正文：
- 场景：glob 不传 — Given allowed_paths 含 `src/` 与 `src/**/*.js`；When 构造 scopeFiles；Then 两者都不进入（精确路径才传），实际传空则不分叉融合
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-04
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-04
  tests: test/knowledge-fusion.test.mjs「键规整与不传面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-041 性能与降级：图构建进程级 memo 或写明 45ms/次预算；scope 构建失败原样返回路由结果（不掉词片回退）；路由命中零平台调用
变更：2026-11-02-knowledge-fusion
状态：active
摘要：图构建失败
场景正文：
- 场景：图构建失败 — Given 图构建抛错；When 路由命中 + scopeFiles 在场；Then 返回路由结果（deepEqual），不降级到词片层
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-05
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-05
  tests: test/knowledge-fusion.test.mjs「fail-soft 与零平台」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-042 测试：RED-first 新增「路由命中 + scope 独有 rejected/手工条目/两跳」用例（禁用融合分支必红）、flow 集成、buildKnowledgeInjection/Wave 格式锁、幽灵过滤、cap/去重、零平台、fail-soft；回归全绿
变更：2026-11-02-knowledge-fusion
状态：active
摘要：空实现判据
场景正文：
- 场景：空实现判据 — Given 把 fuseScopeRecall 改成直接 return base；When 跑新增测试；Then 至少一条必须失败（证明测试不是空转）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-06
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-06
  tests: test/knowledge-fusion.test.mjs「RED-first 融合用例」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-043 eval：未改 engine 时五面指标与 baseline 逐位一致、六探针 GREEN、scope frozen/added 不变；新增 subset='fusion' 的「路由命中、expected 仅 scope 可达」case 单列报告
变更：2026-11-02-knowledge-fusion
状态：active
摘要：零回归不变式
场景正文：
- 场景：零回归不变式 — Given 融合实现完成；When 跑 eval 全量对比 baseline；Then 五面 raw 指标逐位一致、六探针 GREEN、scope frozen/added 不变
全文：.sillyspec/changes/archive/2026-11-02-knowledge-fusion/requirements.md#FR-07
最近确认：b86ec81ac1265b67ed44eeaf1df591d0b103c18f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-fusion:flow:测试绑定FR-07
  tests: test/eval-knowledge-runner.test.mjs「fusion 子集单列」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-fusion
  status: active

## FR-eval-044 FR-01 向量路径融合：matchKnowledgeHybrid 抽 fuseBaseWithScope 公共 helper（路由/向量两分支同源、catch 返回 base、scopeFiles 经 graphPathCandidates 规整）；测试钉 base 契约、去重、原序、json.vector 保留且 json.scope 不设、buildSearchMatches channel=vector、零额外网络
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：向量命中 + scope 独有；向量路径失败降级
场景正文：
- 场景：向量命中 + scope 独有 — Given 路由零命中、向量命中一条决策、scopeFiles 指向热文件；When matchKnowledgeHybrid（VECTOR=on + mock 平台）；Then 结果保留向量 decisionHits 原序，scopeDecisionHits 含 scope 独有条目；不设 json.scope
- 场景：向量路径失败降级 — Given 向量命中但图构建/遍历抛错；When 融合；Then 返回向量 built 原对象（不降级词片、不丢已得结果）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-01
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-engine-tail:flow:测试绑定FR-01
  tests: test/knowledge-fusion.test.mjs「向量路径融合对称（mock fetch + env on）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-engine-tail
  status: active

## FR-eval-045 FR-02 遥测 scope 可见性：flow/prompt/execute 三处注入点统一新增 scopeMatchedFiles（实际展示子集：rejected/deathPath top3 + scopeEntries top3，按 ref 去重）；matchedFiles 保持查询通道语义（entries+routeHits）；mentionedFiles 按实际展示集合构造；knowledge-stats 口径文档同步；standalone 与融合两形态不双记
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：三处口径一致；不双记
场景正文：
- 场景：三处口径一致 — Given 同一知识 fixture 分别走 flow/prompt/Wave 注入；When 读取 hits.jsonl；Then 三处事件都有 scopeMatchedFiles 且内容规则一致；matchedFiles 不含 scope 增量
- 场景：不双记 — Given standalone scope 命中（路由/向量零命中）；When 落遥测；Then matchedFiles 含 scopeEntries（经 entries），scopeMatchedFiles 不含重复项
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-02
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-engine-tail:flow:测试绑定FR-02
  tests: test/thin-inject-telemetry.test.mjs「scopeMatchedFiles 三处口径与不双记」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-engine-tail
  status: active

## FR-eval-046 FR-03 图卫生：sectionFilePaths 出口过滤「路径必须含 /」（只改 section 级 doc-refs，卡片/scan 不动）；GRAPH_CACHE_VERSION 3→4；删除 scopeRecall 的 frCount/frs 收集与测试字面量、注释改为 FR 召回由域路由 digest 承担；getKnowledgeGraph memo 只加注记（不统一 standalone）
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：散文 token 不建边；旧缓存失效
场景正文：
- 场景：散文 token 不建边 — Given section 正文含 Next.js、Node.js、local.yaml、model.py 与 src/a.js；When 建 section 级 doc-refs；Then 只对 src/a.js 建边（裸名词全部过滤）
- 场景：旧缓存失效 — Given 存量 cache 为 version 3；When 升级后首次构建；Then 不命中旧缓存（version 4 重建；边数按预期下降）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-03
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-engine-tail:flow:测试绑定FR-03
  tests: test/knowledge-graph.test.mjs「section doc-refs 裸名词过滤 + frCount 删除 + 版本 4」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-engine-tail
  status: active

## FR-eval-047 FR-04 测试：向量融合用例（mock fetch + 局仓 local.yaml platform + env on，未修复必红）、遥测两形态断言、doc-refs 过滤正反例（Next.js 不建边/src/a.js 建边）、frCount 删除后图谱测试全绿
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：空实现判据
场景正文：
- 场景：空实现判据 — Given 把向量分支恢复为 `if (built) return built`；When 跑向量融合用例；Then 必须失败（测试不是空转）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-04
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-engine-tail:flow:测试绑定FR-04
  tests: test/knowledge-fusion.test.mjs「向量融合空实现判据」 | test/thin-inject-telemetry.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-engine-tail
  status: active

## FR-eval-048 FR-05 回归：145 测试全绿 + lint 绿 + eval 五面不回归 + 六探针 GREEN；向量路径 eval 不覆盖（VECTOR=off）写入 verify-result 交付说明
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：验收口径
场景正文：
- 场景：验收口径 — Given 变更完成；When flow done；Then 测试全绿 + lint 绿 + eval 不回归 + 六探针 GREEN + 向量路径证据仅单测（已注明）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-05
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-02-knowledge-engine-tail:flow:测试绑定FR-05
  tests: test/knowledge-graph.test.mjs | test/thin-inject-telemetry.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-02-knowledge-engine-tail
  status: active

## FR-eval-049 FR-06 数据规划记录（不占 FR）：design/README 记「下一轮数据扩容必须 flow 形态带 scope_files + fusion 子集升主刻度，并混入非标题复述查询」
变更：2026-11-02-knowledge-engine-tail
状态：active
摘要：注记在场
场景正文：
- 场景：注记在场 — Given 变更完成；When 读 design/README；Then 数据规划注记在场（可检索）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-engine-tail/requirements.md#FR-06
最近确认：0dffc5eb666c759f523da6938e4a4b292ea3123a

## FR-eval-050 正文词片兜底——普通知识文件正文段落锚点级可召回
变更：2026-11-06-knowledge-body-recall
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given INDEX 引用的普通知识文件某 `##` 段落正文含查询词片且词片覆盖段落数落在段落覆盖窗内；When 路由零命中的查询经 `fallbackByBodyShingles` 检索；Then 该段落以锚点级 entry 命中（`{file, anchor, keywords:[落窗词片], display:"<标题>（正文词片命中）", catego
全文：.sillyspec/changes/archive/2026-11-06-knowledge-body-recall/requirements.md#FR-01
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-06-knowledge-body-recall:flow:测试绑定FR-01
  tests: test/knowledge-body-recall.test.mjs「T1: 正文词片主路径锚点级命中」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-06-knowledge-body-recall
  status: active

## FR-eval-051 弱命中并联——路由命中时 body 兜底结果追加不重排、零网络
变更：2026-11-06-knowledge-body-recall
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 路由层弱命中（泛词 tag 撞词）已返回结果；When `matchKnowledgeHybrid` 路由命中路径执行；Then 并联调用 body 兜底，命中的 entries 按 `file+anchor` 键去重后**追加**到顶层 `result.entries` 尾部（路由命中原
全文：.sillyspec/changes/archive/2026-11-06-knowledge-body-recall/requirements.md#FR-02
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-06-knowledge-body-recall:flow:测试绑定FR-02
  tests: test/knowledge-body-recall.test.mjs「T4: 弱命中并联追加不重排+零网络」 | test/knowledge-body-recall.test.mjs「T5: 去重无重复键」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-06-knowledge-body-recall
  status: active

## FR-eval-052 既有四通道零回归
变更：2026-11-06-knowledge-body-recall
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 既有路由 / 平台向量 / scope / decisions 词片回退四通道；When 本变更合入后按既有测试面运行；Then 四通道函数签名、输出结构、行为逐字段不变（`fallbackByQueryShingles` 原样保留；向量门行为不变，承接 FR-core-engine-21
全文：.sillyspec/changes/archive/2026-11-06-knowledge-body-recall/requirements.md#FR-03
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-06-knowledge-body-recall:flow:测试绑定FR-03
  tests: test/knowledge-body-recall.test.mjs「T6: decisions 通道与向量门零回归对照」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-06-knowledge-body-recall
  status: active

## FR-eval-053 窗判定与已修复段落过滤
变更：2026-11-06-knowledge-body-recall
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 词片覆盖段落数超出窗上限（泛在词，如本仓实测「目录」19.3%、「会话」11.9%）或段落含已修复状态行；When body 兜底检索执行；Then 泛在词片不参与命中；已修复段落被跳过（口径对齐 isResolvedRoute 正文状态行判据）。
全文：.sillyspec/changes/archive/2026-11-06-knowledge-body-recall/requirements.md#FR-04
最近确认：8758175eb0c52cc5318e1f62279ed9ea43fc8348

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-06-knowledge-body-recall:flow:测试绑定FR-04
  tests: test/knowledge-body-recall.test.mjs「T2: 段落覆盖窗泛在排除/稀有落窗」 | test/knowledge-body-recall.test.mjs「T3: 已修复段落跳过」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-06-knowledge-body-recall
  status: active
