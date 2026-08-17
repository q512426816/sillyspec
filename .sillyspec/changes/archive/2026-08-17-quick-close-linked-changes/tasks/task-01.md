---
id: task-01
title: complete-handlers.js — 实现 closeQuickLinkedChanges 与轻量归档
title_zh: complete-handlers.js — 实现 closeQuickLinkedChanges 与轻量归档
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P0
depends_on: []
blocks: [task-02, task-04]
allowed_paths:
  - src/run/complete-handlers.js
provides:
  - contract: closeQuickLinkedChanges
    fields: [pm, cwd, specBase, linkedChanges, platformOpts]
goal: |
  在 complete-handlers.js 新增并导出 closeQuickLinkedChanges，辅助函数 isChangeTasksComplete / closeSingleQuickLinkedChange。
  判定 tasks.md 全勾选；全勾选时执行轻量归档（unregisterChange + 移动目录到 archive/ + worktree cleanup + git add）。
implementation: |
  1. 在 complete-handlers.js 新增辅助函数 isChangeTasksComplete(specBase, changeName)：读 tasks.md，CRLF 归一化后用正则 /^-\s*\[\s*\]\s+/m 判未勾选。
  2. 新增 closeSingleQuickLinkedChange，复用 archiveDestDirName / renameSyncRetry / archiveWorktreeCleanup / safeGit / pm.unregisterChange；跳过 plan.md/module-impact.md 校验。
  3. 新增并导出 closeQuickLinkedChanges，遍历 linkedChanges，过滤 quick-<hex> 形态，对每个真实变更判定 + 归档；失败 warn 不抛。
acceptance: |
  - closeQuickLinkedChanges 可被 test import。
  - 全勾选变更调用后 status=archived 且目录移到 archive/。
  - 未勾选变更调用后 status 不变且目录不动。
  - 目标目录已存在时不移动并 warn。
verify: |
  运行 test/quick-close-linked-changes.test.mjs（task-04）+ 现有 complete-handlers / quick 相关测试。
constraints: |
  - 只改 src/run/complete-handlers.js。
  - 不阻断 quick 完成：单个归档失败 catch warn。
  - 复用现有工具函数，不引入新依赖。
---
# task-01: closeQuickLinkedChanges 实现
见 frontmatter。
