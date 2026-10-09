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

## FR-worktree-008 git-helper.js 的 safeGit 与 git 两个 exec 点统一注入 GIT_OPTIONAL_LOCKS=0（env 合并语义：与调用方传入 env 展开合并，不裸替换丢 Windows 系统变量）——CLI 自建的全部 git 子进程不再机会性抢 index.lock；写命令（add/commit 等）行为不变
变更：2026-10-06-git-optional-locks
状态：active
摘要：锁窗口消失（实测根因形态）
全文：.sillyspec/changes/archive/2026-10-06-git-optional-locks/requirements.md#FR-01
最近确认：549d1fd1ad01c69a24799dc22016c6fe1a976dac

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-git-optional-locks:flow:测试绑定FR-01
  tests: test/git-optional-locks.test.mjs「读调用无锁窗口（index 字节不变）+ 写调用照常」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-git-optional-locks
  status: active

## FR-worktree-009 watcher 等常驻/后台轮询进程经公共入口自动获得该行为（gitQuiet 委托 git），无需逐调用点改造
变更：2026-10-06-git-optional-locks
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-git-optional-locks/requirements.md#FR-02
最近确认：549d1fd1ad01c69a24799dc22016c6fe1a976dac

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-git-optional-locks:flow:测试绑定FR-02
  tests: test/git-optional-locks.test.mjs「gitQuiet 公共入口链同样无锁窗口」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-git-optional-locks
  status: active

## FR-worktree-010 测试覆盖：①经 git-helper 的 status 读调用在 stat 缓存脏场景下不改写 .git/index 字节（锁窗口消失的代理断言）；②带注入 env 的 add 照常暂存成功；③调用方自定义 env（如 baseline checkpoint 的 GIT identity 注入）仍生效不被覆盖
变更：2026-10-06-git-optional-locks
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-git-optional-locks/requirements.md#FR-03
最近确认：549d1fd1ad01c69a24799dc22016c6fe1a976dac

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-git-optional-locks:flow:测试绑定FR-03
  tests: test/git-optional-locks.test.mjs「全量用例（含调用方 env 合并）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-git-optional-locks
  status: active

## FR-worktree-011 命令提取器标点截断
变更：2026-10-09-verify-papercuts
状态：active
摘要：全角句读
全文：.sillyspec/changes/archive/2026-10-09-verify-papercuts/requirements.md#FR-01
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-verify-papercuts:flow:测试绑定FR-01
  tests: test/verify-papercuts-batch.test.mjs「① 全角标点不拼入 script 名」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-verify-papercuts
  status: active

## FR-worktree-012 --force 保人工面
变更：2026-10-09-verify-papercuts
状态：active
摘要：force 后重填归零
全文：.sillyspec/changes/archive/2026-10-09-verify-papercuts/requirements.md#FR-02
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-verify-papercuts:flow:测试绑定FR-02
  tests: test/verify-papercuts-batch.test.mjs「② --force 保人工面」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-verify-papercuts
  status: active

## FR-worktree-013 消息锚定救援窗口
变更：2026-10-09-verify-papercuts
状态：active
摘要：直改已 commit 不假红
全文：.sillyspec/changes/archive/2026-10-09-verify-papercuts/requirements.md#FR-03
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-verify-papercuts:flow:测试绑定FR-03
  tests: test/verify-papercuts-batch.test.mjs「③ 无分支锚形态：消息锚定窗口救赎」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-verify-papercuts
  status: active

## FR-worktree-014 归档暂存排除嵌套异物
变更：2026-10-09-verify-papercuts
状态：active
摘要：夹带拦截
全文：.sillyspec/changes/archive/2026-10-09-verify-papercuts/requirements.md#FR-04
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-verify-papercuts:flow:测试绑定FR-04
  tests: test/verify-papercuts-batch.test.mjs「④ 归档暂存排除嵌套 .sillyspec 异物」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-verify-papercuts
  status: active
