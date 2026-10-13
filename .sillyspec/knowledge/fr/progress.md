---
author: sillyspec-fr-index
created_at: 2026-10-13T16:20:31.476Z
---

# FR 索引 — progress

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/progress.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-progress-001 initChangeIfNoActive（progress.js）：INSERT..SELECT 带 NOT EXISTS(status='active') 与 NOT EXISTS(name=?) 双守卫，单语句原子抢占；抢到→建行+种 stages+建目录，返回 created:true；已有活跃→created:false 附 activeChanges 清单；同名行已存在（任意 status）→created:false
变更：2026-10-13-autocreate-atomic-claim
状态：active
摘要：零活跃抢占成功；已有活跃拒绝；同名行已存在拒绝
全文：.sillyspec/changes/archive/2026-10-13-autocreate-atomic-claim/requirements.md#FR-01
最近确认：567661aa06918db579ea7e0f2d25e9effa4462f8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-autocreate-atomic-claim:flow:测试绑定FR-01
  tests: test/init-change-if-no-active.test.mjs「零活跃抢占/已有活跃拒绝/同名拒绝」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-autocreate-atomic-claim
  status: active

## FR-progress-002 run/command.js 两处自动建名调用点（brainstorm 无 --change / run auto）改用原子抢占，抢占失败走既有 exit 2 多活跃引导文案
变更：2026-10-13-autocreate-atomic-claim
状态：active
摘要：有活跃时裸 run brainstorm
全文：.sillyspec/changes/archive/2026-10-13-autocreate-atomic-claim/requirements.md#FR-02
最近确认：567661aa06918db579ea7e0f2d25e9effa4462f8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-autocreate-atomic-claim:flow:测试绑定FR-02
  tests: test/init-change-if-no-active.test.mjs「run brainstorm 裸跑 exit 2 引导」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-autocreate-atomic-claim
  status: active

## FR-progress-003 抢占失败的进程不得留下 changes/<自动名>/ 空目录或 DB 行（败者零残留）
变更：2026-10-13-autocreate-atomic-claim
状态：active
摘要：败者零残留
全文：.sillyspec/changes/archive/2026-10-13-autocreate-atomic-claim/requirements.md#FR-03
最近确认：567661aa06918db579ea7e0f2d25e9effa4462f8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-autocreate-atomic-claim:flow:测试绑定FR-03
  tests: test/init-change-if-no-active.test.mjs「败者零残留（目录与 DB 行）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-autocreate-atomic-claim
  status: active

## FR-progress-004 显式 --change 路径（initChange）语义不变，既有测试全绿
变更：2026-10-13-autocreate-atomic-claim
状态：active
摘要：显式路径回归
全文：.sillyspec/changes/archive/2026-10-13-autocreate-atomic-claim/requirements.md#FR-04
最近确认：567661aa06918db579ea7e0f2d25e9effa4462f8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-autocreate-atomic-claim:flow:测试绑定FR-04
  tests: test/init-change-if-no-active.test.mjs「initChange 显式路径语义不变（重名跳过/目录先建）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-autocreate-atomic-claim
  status: active
