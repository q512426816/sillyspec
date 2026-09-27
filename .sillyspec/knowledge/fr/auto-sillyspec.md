---
author: sillyspec-fr-index
created_at: 2026-09-22T17:32:13.971Z
---

# FR 索引 — auto-sillyspec

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-sillyspec-001 known-issues 观察项登记
变更：2026-09-16-background-task-grace-timeout
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given hasBackgroundTaskGrace 无界宽限风险已被 R-01 接受但暴露差未文档化；When 本变更收尾（quick --linked-changes 落盘）；Then .sillyspec/knowledge/known-issues.md 新增观察项，含四要素：暴露差（stale-flip 60min 有界 vs bg-ta
全文：.sillyspec/changes/archive/2026-09-16-background-task-grace-timeout/requirements.md#FR-01
最近确认：83b402f6b

## FR-auto-sillyspec-002 test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
变更：2026-09-27-pushgate-birth-tests-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-pushgate-birth-tests-sync/requirements.md#FR-01
最近确认：48511fdc2075698795988139af8079b7001eb7bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-pushgate-birth-tests-sync:flow:FR-01
  tests: test/state-machine-guards.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-pushgate-birth-tests-sync
  status: active

## FR-auto-sillyspec-003 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
变更：2026-09-27-pushgate-birth-tests-sync
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-pushgate-birth-tests-sync/requirements.md#FR-02
最近确认：48511fdc2075698795988139af8079b7001eb7bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-pushgate-birth-tests-sync:flow:FR-02
  tests: test/stage-contract.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-pushgate-birth-tests-sync
  status: active
