---
author: flow-machine-draft
created_at: 2026-10-11T13:55:38.251Z
---
# 任务注册表（Tasks）— 2026-10-11-resurrect-guard-verify-hardening

- [x] task-01: run <stage> 对「活跃目录与 changes/archive/<同名>/ 并存且库内无活跃行」的变更名拒绝注册 exit 2 并给双出口指引；doctor detectArchiveIntegrity 对同形态 pass=false severity=FAILED 给处置指引（test/archived-resurrect-guard.test.mjs 全绿）
- [x] task-02: verify 对账 diff 面锚点：merge-base(<主分支>,HEAD) 仅为立项点严格后代时采用（窗口只收窄），mb==HEAD、mb==立项点、非后代三形态一律退旧区间（test/verify-reconcile-merge-base.test.mjs 全绿）
- [x] task-03: resolveTestTimeoutMs 与 TEST_TIMEOUT_MS 同口径解析 SILLYSPEC_TEST_TIMEOUT_MS：<10000 按秒×1000，≥10000 按毫秒并告警促改秒
- [x] task-04: .claude/skills/sillyspec-quick/SKILL.md 存在且描述 run quick 三步生命周期与 --linked-changes 语义；auto/brainstorm SKILL.md 分叉文案指向 quick --linked-changes
- [x] task-05: node --test test/doc-ref-check.test.mjs 绿（platform-interface-map.md 零失效）；sillyspec docs check 全量 846 处引用零失效；docs gate 基线=0
- [x] task-06: 全量 npm test 零失败（749 文件）
