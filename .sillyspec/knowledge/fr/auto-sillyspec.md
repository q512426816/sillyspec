---
author: sillyspec-fr-index
created_at: 2026-10-20T01:19:37.412Z
---

# FR 索引 — auto-sillyspec

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-sillyspec-028 known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：删后全绿套件照常通过
场景正文：
- 场景：删后全绿套件照常通过 — Given 套件 exitCode===0（全绿）；When 门禁判定；Then 直接 passed（不扫行，豁免清单不参与）——删除零影响
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-01
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-01
  tests: test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 3 条」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active

## FR-auto-sillyspec-029 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：保留面逐字节不变
场景正文：
- 场景：保留面逐字节不变 — Given 上述保留条目；When 本变更落盘；Then 三条条目与注释原样保留
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-02
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-02
  tests: test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 3 条」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active

## FR-auto-sillyspec-030 既有判定相关测试套件零回归
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：回归面
场景正文：
- 场景：回归面 — Given known-failures.yaml 变更后；When 复跑判定相关套件；Then 全绿（纯配置变更，源码零改动）
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-03
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-03
  tests: test/cross-repo-tap-summary.test.mjs | test/verify-failure-ledger-noise.test.mjs「判定面回归全绿」 | test/verify-postcheck-known-failures.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active
