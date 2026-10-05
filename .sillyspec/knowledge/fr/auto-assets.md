---
author: sillyspec-fr-index
created_at: 2026-10-05T15:17:06.998Z
---

# FR 索引 — auto-assets

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-assets-001 CLAUDE.md、assets/command-cards/flow.md、run-quick.md 三处逐字可照抄分号形态清零，给出含「成功标准：」独立行与「- <可验证标准>」条目行的多行实例
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-01
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-01
  tests: test/input-teach-copyable.test.mjs「①b 非 src 教学面分号形态零残留（逐字三处）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-002 AGENTS.md 与 SKILL.md 两处描述式教学升级为可照抄实例；AGENTS.md 与模板源倒推行引号内联模糊形态改为引用过门格式的表述
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-02
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-02
  tests: test/input-teach-copyable.test.mjs「②b 非 src 教学面实例在场与模糊形态清零」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-003 零残留断言升级为 src 目录递归遍历，新增非 src 教学面零残留与实例在场断言
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-03
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-03
  tests: test/input-teach-copyable.test.mjs「① 分号内联教学形态零残留（src 递归遍历升级）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active

## FR-auto-assets-004 相关测试全部通过
变更：2026-10-05-input-teach-non-src
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-input-teach-non-src/requirements.md#FR-04
最近确认：c38dacd49ea5676df369b24cc1078a477cfa5f25

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-input-teach-non-src:flow:测试绑定FR-04
  tests: test/input-format-copy.test.mjs「② 教学点均带可照抄多行实例」 | test/input-teach-copyable.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-input-teach-non-src
  status: active
