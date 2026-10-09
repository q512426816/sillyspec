---
author: sillyspec-fr-index
created_at: 2026-10-09T01:37:47.453Z
---

# FR 索引 — auto-sillyspec

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-sillyspec-008 package.json version=3.32.2；quick-retired 测试 R5 版本锚同步（assert + 注释）；历史事实锚不动
变更：2026-10-09-release-3-32-2
状态：active
摘要：R5 锚同步
全文：.sillyspec/changes/archive/2026-10-09-release-3-32-2/requirements.md#FR-01
最近确认：00d055829104a462706e76c956221b7f38cbb8bb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-release-3-32-2:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-release-3-32-2
  status: active

## FR-auto-sillyspec-009 quick-retired 测试绿 + lint 绿
变更：2026-10-09-release-3-32-2
状态：active
摘要：发版前实测
全文：.sillyspec/changes/archive/2026-10-09-release-3-32-2/requirements.md#FR-02
最近确认：00d055829104a462706e76c956221b7f38cbb8bb

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-release-3-32-2:flow:测试绑定FR-02
  tests: test/quick-retired.test.mjs「✅ 通过: 25 ❌ 失败: 0」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-release-3-32-2
  status: active

## FR-auto-sillyspec-010 npm publish 成功且 npm view sillyspec version=3.32.2（latest 核验）
变更：2026-10-09-release-3-32-2
状态：active
摘要：latest 核验
全文：.sillyspec/changes/archive/2026-10-09-release-3-32-2/requirements.md#FR-03
最近确认：00d055829104a462706e76c956221b7f38cbb8bb

## FR-auto-sillyspec-011 发版规格工件随归档留档，推送 origin/main
变更：2026-10-09-release-3-32-2
状态：active
摘要：推送核验
全文：.sillyspec/changes/archive/2026-10-09-release-3-32-2/requirements.md#FR-04
最近确认：00d055829104a462706e76c956221b7f38cbb8bb
