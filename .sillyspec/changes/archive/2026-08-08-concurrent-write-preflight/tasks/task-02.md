---
id: task-02
title: quick --done concurrent preflight hook
title_zh: quick 完成路径接入并发预检 warn
author: qinyi
created_at: 2026-08-08 13:16:00
priority: P0
depends_on: [task-01]
blocks: [task-04]
requirement_ids: [FR-05, FR-07]
decision_ids: [D-001@v1, D-003@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - test/quick-baseline-dirty-worktree.test.mjs
  - test/audit-quick-completion.test.mjs
---

## goal
> 在 quick --done 完成路径（complete-handlers.js auditQuickCompletion 调用点旁）接入 detectConcurrentChanges，有他者并发则 console.warn，不阻断 audit。

## implementation
- Edit 前重读 complete-handlers.js 最新态（并发会话曾改此文件，规则17），定位 auditQuickCompletion 调用点（约 588 行，handleQuickStageCompletion 内 if guard 块；mergedGuard 在约 583 行可用）
- 在 audit 返回后调 detectConcurrentChanges，ownFiles 合并 review.changedFiles 与 mergedGuard.baselineFiles，二者均用空数组兜底防 spread undefined 抛（D-001 + B-005）：展开式为 review.changedFiles 空兜底 合并 mergedGuard.baselineFiles 空兜底
- review 为 null 时 ownFiles 兜底空数组（D-003 brownfield 无 guard），不抛 TypeError
- 有警告则 console.warn 输出 formatConcurrentWarning 结果，随后照常推进，不改 review.status 不 exit

## acceptance
- 多 agent 脏工作树下 quick --done，本会话 baseline 文件不进 foreignFiles（D-001）
- review 为 null 时钩子不抛 TypeError（D-003）
- guard 缺 baselineFiles 字段时不抛（B-005 空兜底）
- 有他者并发时打印 warn，audit result.status 不变（safe 仍 safe）
- 无他者并发时零额外输出

## verify
- node -e 验证钩子调用不抛（集成行为由 task-04 的 test/concurrent-preflight-hooks.test.mjs 覆盖）
- node test/quick-baseline-dirty-worktree.test.mjs（D-001 金丝雀，确认 baseline 不被误报他者、warn 不冲其断言）

## constraints
- 钩子纯副作用 console.warn，不 return early 不 process exit 不改 review.status（FR-07）
- ownFiles 必须含 baselineFiles，否则 core use case 失效
- 用最小 scoped edit 插入，不重构既有完成逻辑
- 若 warn 输出致 quick-baseline-dirty-worktree 或 audit-quick-completion 既有 console 断言失效，在 allowed_paths 内调整这些测试（断言 warn 触发或隔离 fixture 使无他者）

## related_tests
- test/quick-baseline-dirty-worktree.test.mjs（D-001 金丝雀，直接测脏工作树 quick 完成，warn 若误报 baseline 会冲其输出断言）
- test/audit-quick-completion.test.mjs（覆盖 auditQuickCompletion 路径，钩子插点旁）
