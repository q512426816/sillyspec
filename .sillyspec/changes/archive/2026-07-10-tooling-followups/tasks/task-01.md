---
id: task-01
title: "§4.6 quick 收尾从 session guard.json 读 guard（不依赖 progress.quickGuard）"
title_zh: "quick 收尾改为从 session guard.json 读 guard，跨进程 --done 不再跳过清理"
author: qinyi
created_at: 2026-07-10T22:51:30+08:00
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: [D-003@v1]
allowed_paths:
  - src/run.js
  - test/quick-session-guard-cleanup.test.mjs
---

# TaskCard — task-01

## goal
completeStep 的 quick 收尾块（src/run.js:2969-2995）当前用 `if (progress.quickGuard)` 驱动 auditQuickCompletion + session 目录清理，但 `progress._write` 不持久化顶层 quickGuard，导致跨进程 `--done` 时读出的 progress 无 quickGuard，收尾被整体跳过，`.runtime/quick-sessions/<sessionId>/` 残留僵尸。本任务把收尾块改为从文件 guard.json 读 guard，使收尾与进度持久化解耦。

## implementation
- 在 completeStep quick 收尾块内，用作用域内已有的 `changeName`（== sessionId == `quick-<uuid8>`）拼路径 `join(runtimeBase, 'quick-sessions', changeName, 'guard.json')`（runtimeBase 沿用现有 `platformOpts.runtimeRoot || join(specBase, '.runtime')`）。
- 用 readFileSync + existsSync 读 session guard.json（复用 run.js:1486-1490 已有的 session → legacy 读取模式），fallback 旧单文件 `join(specBase, '.runtime', 'quick-guard.json')`。
- 把读到的 guard 对象传入 `auditQuickCompletion(cwd, guard, { isConfirm })`（函数签名见 src/run.js:318，解构 baselineFiles/allowedFiles/allowNew/forceBaseline），替换原 `progress.quickGuard`。
- 保留现有 blocked 处理（review.status === 'blocked' → 步骤回退 pending + exit 1）与 printQuickAuditReview。
- 保留并下移 §4.6 清理逻辑（rmSync sessionDir + unlinkSync 旧 quick-guard.json），改为在「guard 命中」与「guard 缺失」两种情况都执行清理：guard 缺失 → 跳过 auditQuickCompletion，仅做 session 目录清理，不抛错。
- 移除对 `progress.quickGuard.review / completedAt` 的回写与 `delete progress.quickGuard`（guard 已不经 progress 流转）。

## acceptance
- 跨进程场景：quick 阶段 worktree/session 完成后，在新进程 `sillyspec run --done` 收尾时，能从 `.runtime/quick-sessions/<sessionId>/guard.json` 读到 guard，auditQuickCompletion 正常执行，session 目录被 rmSync 删除。
- fallback 兼容：session guard.json 不存在但存在旧单文件 `.runtime/quick-guard.json` → 用旧文件跑审计；两者都不存在 → 跳过审计，仅清理 sessionDir（若存在），不抛异常。
- blocked 路径不变：review.status === 'blocked' 时步骤回退 pending、completedAt 清空、process.exit(1)。
- 不再依赖 `progress.quickGuard`：收尾块读到的 progress 即使无 quickGuard 字段，清理与审计仍按文件 guard 执行。

## verify
`npm test`（新增 test/quick-session-guard-cleanup.test.mjs：构造 sessionDir + guard.json，模拟跨进程 read progress 无 quickGuard，断言审计被调用 + sessionDir 被删；构造无 guard.json 的 fallback 用例，断言仅清理不抛错）。

## constraints
- brownfield：guard 文件缺失只清理不抛错，session 目录不存在时 rmSync `{ recursive: true, force: true }` 已容忍。
- 不改 db 持久化 quickGuard（D-003@v1 明确不扩大改动面）。
- 不动 progress.js `_write` 的持久化字段，不动 worktree-guard hook 写 guard.json 的逻辑（run.js:1974 区域）。
