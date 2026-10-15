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
