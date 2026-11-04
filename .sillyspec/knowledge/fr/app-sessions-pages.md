---
author: sillyspec-fr-index
created_at: 2026-11-04T02:46:01.227Z
---

# FR 索引 — app-sessions-pages

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/app-sessions-pages.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-app-sessions-pages-001 供应商选择（暂存/预会话/即时三模式）时模型自动选中：该供应商上次显式选过的模型（浏览器本地记忆，无效则回退）→ 无记录取候选第一个 → 无候选为空（跟随）
变更：2026-11-04-model-provider-cascade
状态：active
摘要：暂存选供应商自动带上次模型；无记忆回退候选第一个；记忆值已不在候选集
全文：.sillyspec/changes/archive/2026-11-04-model-provider-cascade/requirements.md#FR-01
最近确认：63d3ff266d8f7974e916f8b12b47705cce6019d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-model-provider-cascade:flow:测试绑定FR-01
  tests: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「暂存选供应商自动带上次模型/无记忆取第一个/记忆越界回退第一个」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-model-provider-cascade
  status: active

## FR-app-sessions-pages-002 模型下拉在选中具体供应商时不再提供「默认」选项；「不指定」态维持现状（模型选择隐藏即默认语义）
变更：2026-11-04-model-provider-cascade
状态：active
摘要：具体供应商下无默认选项；快照模型为空的显示回退
全文：.sillyspec/changes/archive/2026-11-04-model-provider-cascade/requirements.md#FR-02
最近确认：63d3ff266d8f7974e916f8b12b47705cce6019d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-model-provider-cascade:flow:测试绑定FR-02
  tests: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「具体供应商下模型下拉不含默认选项；快照模型空时显示自动解析值」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-model-provider-cascade
  status: active

## FR-app-sessions-pages-003 显式选模型时记忆 供应商→模型（localStorage）
变更：2026-11-04-model-provider-cascade
状态：active
摘要：显式选模型写入记忆；读取容错
全文：.sillyspec/changes/archive/2026-11-04-model-provider-cascade/requirements.md#FR-03
最近确认：63d3ff266d8f7974e916f8b12b47705cce6019d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-model-provider-cascade:flow:测试绑定FR-03
  tests: test/frontend/src/lib/__tests__/model-memory.test.ts「remember/get 读写、坏 JSON 容错、缺键 null」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-model-provider-cascade
  status: active

## FR-app-sessions-pages-004 会话 provider NULL 时点选模型，暂存配置成对携带显示层供应商 id（engineDefaultProvider），发送载荷不再 422
变更：2026-11-04-model-provider-cascade
状态：active
摘要：provider NULL 点模型成对暂存；已显式暂存供应商时不重复配对
全文：.sillyspec/changes/archive/2026-11-04-model-provider-cascade/requirements.md#FR-04
最近确认：63d3ff266d8f7974e916f8b12b47705cce6019d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-model-provider-cascade:flow:测试绑定FR-04
  tests: test/frontend/src/components/sessions/__tests__/session-config-bar.test.tsx「provider NULL 点模型成对暂存 engineDefaultProvider；已有供应商暂存时不覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-model-provider-cascade
  status: active

## FR-app-sessions-pages-005 发送失败（含 422）即时 toast 提示后端错误信息（面板三发送点位+悬浮窗两点位）
变更：2026-11-04-model-provider-cascade
状态：active
摘要：发送 422 即时可见
全文：.sillyspec/changes/archive/2026-11-04-model-provider-cascade/requirements.md#FR-05
最近确认：63d3ff266d8f7974e916f8b12b47705cce6019d0

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-model-provider-cascade:flow:测试绑定FR-05
  tests: test/frontend/src/components/daemon/session-panel/__tests__/page.test.tsx「发送失败 notify.error 即时可见（横幅照旧）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-model-provider-cascade
  status: active
