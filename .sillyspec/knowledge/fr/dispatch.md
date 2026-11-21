---
author: sillyspec-fr-index
created_at: 2026-11-21T18:58:34.350Z
---

# FR 索引 — dispatch

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/dispatch.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-dispatch-001 声明 --no-review 或 --turbo 形态的变更，其 brainstorm/plan/execute 收口不再派发影子审查，对照账 skips 留痕理由含形态表述
变更：2026-11-21-shadow-dispatch-form-respect
状态：active
摘要：no-review 形态收口跳派留痕；turbo 形态收口同跳；run 跑道变更不命中（flow-state 缺失放行）
全文：.sillyspec/changes/archive/2026-11-21-shadow-dispatch-form-respect/requirements.md#FR-01
最近确认：f10e34e41a046fda1314158458da029968c1bd80

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-21-shadow-dispatch-form-respect:flow:测试绑定FR-01
  tests: test/shadow-dispatch-form.test.mjs「形态免评审 skip：review_force=false / turbo=true 各 skip+ledger 留痕，flow-state 缺失放行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-21-shadow-dispatch-form-respect
  status: active

## FR-dispatch-002 未声明免评审形态的轻档变更影子照派，且「影子审查已后台派发」披露行在收口命令退出前同步打出（不再 fire-and-forget 丢输出）
变更：2026-11-21-shadow-dispatch-form-respect
状态：active
摘要：派发成功披露行同步可见；平台不可用不 hang 收口
全文：.sillyspec/changes/archive/2026-11-21-shadow-dispatch-form-respect/requirements.md#FR-02
最近确认：f10e34e41a046fda1314158458da029968c1bd80

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-21-shadow-dispatch-form-respect:flow:测试绑定FR-02
  tests: test/shadow-dispatch-form.test.mjs「gates 影子挂点同步化：源码结构断言 await 语义（孤儿 .catch fire-and-forget 形态不存在）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-21-shadow-dispatch-form-respect
  status: active

## FR-dispatch-003 档位判定、ceremony.shadow 开关、幂等闸、probe 前置等既有影子链路逻辑零改动，缺省行为对非免评审形态变更不变
变更：2026-11-21-shadow-dispatch-form-respect
状态：active
摘要：既有 skip 理由不漂移；强制评审档不豁免
全文：.sillyspec/changes/archive/2026-11-21-shadow-dispatch-form-respect/requirements.md#FR-03
最近确认：f10e34e41a046fda1314158458da029968c1bd80

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-21-shadow-dispatch-form-respect:flow:测试绑定FR-03
  tests: test/shadow-dispatch-form.test.mjs「既有链零改动：非免评审形态走既有链 + tier-not-light 既有文案逐字 + review_force=true 不豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-21-shadow-dispatch-form-respect
  status: active
