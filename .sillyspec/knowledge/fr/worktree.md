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

## FR-worktree-015 归档态打捞必须逐文件识别归档搬运，禁止复制回原路径复活已归档目录
变更：2026-10-10-worktree-salvage-archive-aware
状态：active
摘要：归档后清理不复活（下游实证：2026-10-09-attachment-inline-reference 残留 13 文件）
全文：.sillyspec/changes/archive/2026-10-10-worktree-salvage-archive-aware/requirements.md#FR-01
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-worktree-salvage-archive-aware:flow:测试绑定FR-01
  tests: test/worktree-spec-salvage.test.mjs「3. 归档态清理：archive 副本在 → 跳过不复活原路径、副本不被旧快照覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-worktree-salvage-archive-aware
  status: active

## FR-worktree-016 未归档态打捞行为必须保持不变（坑 worktree-spec-artifact-misplace 不回归）
变更：2026-10-10-worktree-salvage-archive-aware
状态：active
摘要：既有打捞语义回归
全文：.sillyspec/changes/archive/2026-10-10-worktree-salvage-archive-aware/requirements.md#FR-02
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-worktree-salvage-archive-aware:flow:测试绑定FR-02
  tests: test/worktree-spec-salvage.test.mjs「1. cleanup 打捞：缺失 copy 回 / 冲突不覆盖（未归档态既有回归）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-worktree-salvage-archive-aware
  status: active

## FR-worktree-017 真独有产物（原路径与 archive 副本均缺）必须仍打捞，归档态目标位置为归档副本
变更：2026-10-10-worktree-salvage-archive-aware
状态：active
摘要：归档态独有产物进归档副本
全文：.sillyspec/changes/archive/2026-10-10-worktree-salvage-archive-aware/requirements.md#FR-03
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-worktree-salvage-archive-aware:flow:测试绑定FR-03
  tests: test/worktree-spec-salvage.test.mjs「3. 归档态独有产物 → 捞进 archive 副本、原路径不重建」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-worktree-salvage-archive-aware
  status: active

## FR-worktree-018 上述三态必须有测试覆盖，触及 src 的实测全绿
变更：2026-10-10-worktree-salvage-archive-aware
状态：active
摘要：收口实测
全文：.sillyspec/changes/archive/2026-10-10-worktree-salvage-archive-aware/requirements.md#FR-04
最近确认：e6ac0ef313acd83af9d5626877be05e58fa9b67d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-worktree-salvage-archive-aware:flow:测试绑定FR-04
  tests: test/worktree-spec-salvage.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-worktree-salvage-archive-aware
  status: active

## FR-worktree-019 parsePushArgs 忽略代执行环境残留的 shell 重定向 token（2>&1、>/dev/null、>/dev/null 等）并产生告警
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：末尾带 2>&1；重定向夹在合法参数之间
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-01
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-01
  tests: test/push-plan.test.mjs「parsePushArgs：容忍代执行残留的 shell 重定向 token」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-020 parsePushArgs 遇到管道/链式控制符（|、||、&&、;、&）截断其后参数并产生告警
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：管道后接 tail；参数后再接链式命令
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-02
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-02
  tests: test/push-plan.test.mjs「parsePushArgs：管道/链式控制符截断其后参数」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-021 合法参数组合与现有 fail-closed 行为保持不变
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：真正的位置参数仍被拒绝；互斥组合仍被拒绝
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-03
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-03
  tests: test/push-plan.test.mjs「parsePushArgs：默认 by-change；one 必须带 --change；未知/互斥 fail-closed」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-022 human 模式 git push 失败时错误信息包含底层 stderr 详情
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：pre-push hook 失败；远端拒绝推送
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-04
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-04
  tests: test/push-cli.test.mjs「human 模式 pre-push 失败错误含 hook stderr」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-023 成功与失败均由 CLI 转发捕获的 git 输出到终端
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：json 模式 stdout 纯净
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-05
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-05
  tests: test/push-cli.test.mjs「human 模式转发 git 输出、--json stdout 纯净」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-024 相关单测与集成测试通过
变更：2026-11-11-push-shell-token-tolerance
状态：active
摘要：测试套件
全文：.sillyspec/changes/archive/2026-11-11-push-shell-token-tolerance/requirements.md#FR-06
最近确认：8cb0c352b4d4a88311d0aad6a77dc04283bf9644

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-11-push-shell-token-tolerance:flow:测试绑定FR-06
  tests: test/push-plan.test.mjs「parsePushArgs：容忍代执行残留的 shell 重定向 token」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-11-push-shell-token-tolerance
  status: active

## FR-worktree-025 overlay 返回本变更声明命中集，声明文件不进 baseline checkpoint
变更：2026-11-12-baseline-own-declared-skip
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 主仓有未提交的 demo.js（被本变更 task 卡 allowed_paths 声明）与 other.js（未声明）；When 创建 worktree（overlay + checkpoint）；Then ownDeclaredFiles = [demo.js]；checkpoint 提交含 other.js 不含 demo.js；demo.js 在 worktr
全文：.sillyspec/changes/archive/2026-11-12-baseline-own-declared-skip/requirements.md#FR-01
最近确认：e4b93656e7446e58fd88c9379c1ed6600a399059

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-12-baseline-own-declared-skip:flow:测试绑定FR-01
  tests: test/baseline-own-declared-skip.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-12-baseline-own-declared-skip
  status: active

## FR-worktree-026 无声明命中时行为与现状一致
变更：2026-11-12-baseline-own-declared-skip
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 主仓未提交文件均不被当前变更声明；When 创建 worktree；Then ownDeclaredFiles 为空数组；checkpoint 含全部 overlay 文件（旧行为）
全文：.sillyspec/changes/archive/2026-11-12-baseline-own-declared-skip/requirements.md#FR-02
最近确认：e4b93656e7446e58fd88c9379c1ed6600a399059

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-12-baseline-own-declared-skip:flow:测试绑定FR-02
  tests: test/baseline-overlay-isolation.test.mjs | test/baseline-own-declared-skip.test.mjs「无声明命中 → ownDeclaredFiles 为空（旧行为）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-12-baseline-own-declared-skip
  status: active

## FR-worktree-027 归档交付面口径维持原样（撤销该修复）
变更：2026-11-12-baseline-own-declared-skip
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given worktree 有未提交交付改动（modified 或 untracked）；When 归档前置检查；Then 交付面非空 → 阻断归档（与原行为一致）
全文：.sillyspec/changes/archive/2026-11-12-baseline-own-declared-skip/requirements.md#FR-03
最近确认：e4b93656e7446e58fd88c9379c1ed6600a399059

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-12-baseline-own-declared-skip:flow:测试绑定FR-03
  tests: test/change-ownership-guards.test.mjs「⑦a worktree 有未 apply 交付面 → 归档阻断」 | test/change-ownership-guards.test.mjs「⑦a2 --skip-apply 留痕」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-12-baseline-own-declared-skip
  status: active

## FR-worktree-028 新增回归测试覆盖三条语义
变更：2026-11-12-baseline-own-declared-skip
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given test/baseline-own-declared-skip.test.mjs；When node --test 执行；Then 8 项断言全部通过；既有 baseline-overlay-isolation / cross-repo-baseline-anchor / archive-b
全文：.sillyspec/changes/archive/2026-11-12-baseline-own-declared-skip/requirements.md#FR-04
最近确认：e4b93656e7446e58fd88c9379c1ed6600a399059

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-12-baseline-own-declared-skip:flow:测试绑定FR-04
  tests: test/archive-baseline-entry.test.mjs | test/baseline-own-declared-skip.test.mjs | test/cross-repo-baseline-anchor.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-12-baseline-own-declared-skip
  status: active
