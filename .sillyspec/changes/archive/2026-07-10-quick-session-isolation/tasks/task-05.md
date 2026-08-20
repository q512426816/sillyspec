---
id: task-05
title: hooks/worktree-guard.js — 读 guard 改合并所有活跃 session
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P0
depends_on: [task-03]
blocks: [task-06]
allowed_paths:
  - src/hooks/worktree-guard.js
expects_from:
  task-03:
    - contract: quick-guard-session-path
      needs: [sessionGuardDir]
goal: |
  worktree-guard hook 读 guard 改合并所有活跃 quick-sessions/*/guard.json（baseline/allowedFiles 并集）。
  D-002@v1：hook 独立进程无法可靠知当前 session，改合并所有活跃。
implementation: |
  改 src/hooks/worktree-guard.js：
  1. :598-619 shouldBlockWrite + :683-701 shouldBlockBash：读 guard 从单文件
     join(root,'.sillyspec','.runtime','quick-guard.json') 改为扫描
     join(root,'.sillyspec','.runtime','quick-sessions','*','guard.json')。
  2. 合并所有活跃 session 的 baselineFiles（并集）+ allowedFiles（并集）。
  3. 判定逻辑不变（baseline 文件拦截 + allowedFiles 放行），但用并集。
  4. 兼容：旧单文件 quick-guard.json（无 session 目录）仍读（迁移期）。
acceptance: |
  - 两 session（baseline/allowedFiles 不同）→ hook 放行各自 allowedFiles（并集），不误拦
  - 旧单文件 guard 兼容
verify: |
  task-06 测试覆盖 hook 合并行为。
constraints: |
  - 只改 src/hooks/worktree-guard.js；安全侧倾斜（过宽保护，不误拦合法写）
---
# task-05: hook 合并 guard
## 目标
见 frontmatter goal（D-002@v1, FR-05）。
