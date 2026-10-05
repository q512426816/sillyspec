---
author: sillyspec-fr-index
created_at: 2026-10-05T11:39:44.226Z
---

# FR 索引 — worktree

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/worktree.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-worktree-001 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出
变更：2026-10-05-wt-list-resilience
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-wt-list-resilience/requirements.md#FR-01
最近确认：33bc4d2857eb29f15e10f062808e3d9d8eee2385

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wt-list-resilience:flow:测试绑定FR-01
  tests: test/worktree-list-resilience.test.mjs「缺字段 meta 兜底列出不崩溃（changeName=目录名、branch=-）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wt-list-resilience
  status: active

## FR-worktree-002 完整 meta 场景 list 输出不变（changeName/branch 取原值）
变更：2026-10-05-wt-list-resilience
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-wt-list-resilience/requirements.md#FR-02
最近确认：33bc4d2857eb29f15e10f062808e3d9d8eee2385

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wt-list-resilience:flow:测试绑定FR-02
  tests: test/worktree-list-resilience.test.mjs「完整 meta 原值透传不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wt-list-resilience
  status: active

## FR-worktree-003 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态
变更：2026-10-05-wt-list-resilience
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-wt-list-resilience/requirements.md#FR-03
最近确认：33bc4d2857eb29f15e10f062808e3d9d8eee2385

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-wt-list-resilience:flow:测试绑定FR-03
  tests: test/worktree-list-resilience.test.mjs「解析失败 meta 跳过不进列表」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-wt-list-resilience
  status: active

## FR-worktree-004 review.json 引用的 hash 是主仓 HEAD 可达（历史 commit）时不再计入引用——不打 tag、不打印审计锚定信息
变更：2026-10-05-branch-ref-anchor-scope
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-branch-ref-anchor-scope/requirements.md#FR-01
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-branch-ref-anchor-scope:flow:测试绑定FR-01
  tests: test/branch-ref-anchor-scope.test.mjs「历史 commit（主仓 HEAD 可达）引用不计入——不锚定」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-branch-ref-anchor-scope
  status: active

## FR-worktree-005 引用的 hash 是分支独有 commit（如 baseline checkpoint/task commit）时锚定行为不变（打 tag 保可达）
变更：2026-10-05-branch-ref-anchor-scope
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-branch-ref-anchor-scope/requirements.md#FR-02
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-branch-ref-anchor-scope:flow:测试绑定FR-02
  tests: test/branch-ref-anchor-scope.test.mjs「分支独有 commit（checkpoint/task）引用计入——锚定保可达」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-branch-ref-anchor-scope
  status: active

## FR-worktree-006 引用 hash 未知/畸形时维持 fail-closed（按需锚定，宁可误锚不误删）
变更：2026-10-05-branch-ref-anchor-scope
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-branch-ref-anchor-scope/requirements.md#FR-03
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-branch-ref-anchor-scope:flow:测试绑定FR-03
  tests: test/branch-ref-anchor-scope.test.mjs「畸形/未知 hash 既有跳过语义保持（非真实对象无可悬空链，不产生新误删面）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-branch-ref-anchor-scope
  status: active

## FR-worktree-007 单测覆盖：历史 commit 引用不锚定、分支独有 commit 引用锚定两形态
变更：2026-10-05-branch-ref-anchor-scope
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-05-branch-ref-anchor-scope/requirements.md#FR-04
最近确认：4983de1d7330240faeeabe6d47ca9b80f7f0c3bc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-05-branch-ref-anchor-scope:flow:测试绑定FR-04
  tests: test/branch-ref-anchor-scope.test.mjs「三形态断言齐备（fixture 快照）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-05-branch-ref-anchor-scope
  status: active
