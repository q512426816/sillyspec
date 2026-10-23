---
author: flow-machine-draft
created_at: 2026-10-23T15:39:59.136Z
---
# 提案书（Proposal）— 2026-10-23-push-plan-anchor-batch-perf

## 动机

任务原话转写：push 计划层锚点批量解析提速

实测 dry-run 3.6s（纯 git+网络对照 0.67s）：computeEffectiveBase 对 43 个 scan 锚点逐锚 rev-parse+is-ancestor 两次 spawn（约 86 次进程启动）占大头；真推送另有 fetch 后二次 ls-remote 的双网络往返；25 行逐锚警告刷屏。本变更只做计划层提速与警告收敛，守卫语义零变化。

成功标准：
- 锚点可解析性判定合并为单次批量调用（cat-file --batch-check 按输入序回读），逐锚 spawn 消除
- 预存坏锚点警告收敛为单行摘要（计数+分类+首 3 锚点名），不再逐行刷屏
- runPush fetch 后将远端跟踪引用传入 planPush，消除非 dry-run 路径的第二次 ls-remote 网络探测
- dry-run 计划输出语义不变（base/groups/守卫判定与改前一致），既有 push 测试面全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 锚点可解析性判定合并为单次批量调用（cat-file --batch-check 按输入序回读），逐锚 spawn 消除
2. 预存坏锚点警告收敛为单行摘要（计数+分类+首 3 锚点名），不再逐行刷屏
3. runPush fetch 后将远端跟踪引用传入 planPush，消除非 dry-run 路径的第二次 ls-remote 网络探测
4. dry-run 计划输出语义不变（base/groups/守卫判定与改前一致），既有 push 测试面全绿

## 成功标准（可验证）

1. 锚点可解析性判定合并为单次批量调用（cat-file --batch-check 按输入序回读），逐锚 spawn 消除
2. 预存坏锚点警告收敛为单行摘要（计数+分类+首 3 锚点名），不再逐行刷屏
3. runPush fetch 后将远端跟踪引用传入 planPush，消除非 dry-run 路径的第二次 ls-remote 网络探测
4. dry-run 计划输出语义不变（base/groups/守卫判定与改前一致），既有 push 测试面全绿
