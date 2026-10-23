---
author: flow-machine-draft
created_at: 2026-10-23T15:39:59.137Z
---
# 任务注册表（Tasks）— 2026-10-23-push-plan-anchor-batch-perf

- [x] task-01: 锚点可解析性判定合并为单次批量调用（cat-file --batch-check 按输入序回读），逐锚 spawn 消除
- [x] task-02: 预存坏锚点警告收敛为单行摘要（计数+分类+首 3 锚点名），不再逐行刷屏
- [x] task-03: runPush fetch 后将远端跟踪引用传入 planPush，消除非 dry-run 路径的第二次 ls-remote 网络探测
- [x] task-04: dry-run 计划输出语义不变（base/groups/守卫判定与改前一致），既有 push 测试面全绿
