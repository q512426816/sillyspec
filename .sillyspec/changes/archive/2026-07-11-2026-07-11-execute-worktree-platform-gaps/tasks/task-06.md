---
id: task-06
title: index.js 注册 --merge flag + assess 文案补降级指引
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: [task-05]
blocks: [task-07]
allowed_paths:
  - src/index.js
---
> case 'apply' 注册 --merge flag 并传入 applyWorktree；assess 的 BLOCKED 文案补「可用 apply --merge 降级」指引。

## implementation
- src/index.js:638 case 'apply' 加 `const merge = args.includes('--merge');`
- :640 改为 `applyWorktree(wtName, { cwd: dir, checkOnly, merge });`
- :635 用法提示更新为 `sillyspec worktree apply <change-name> [--check-only] [--merge]`
- case 'assess'（:670-713）：若 assessApplyRisk BLOCKED 文案补充「可用 sillyspec worktree apply <change> --merge 降级」指引（assessApplyRisk 自身无 baseline 检测，:709 blocked 分支加指引）
- :703 assess auto-apply 不改（仅 SAFE/WARNING 触发，漂移时不到此）

## acceptance
- `sillyspec worktree apply <change> --merge` 不报参数错误，merge 传入
- `sillyspec worktree apply --help` 或无参用法提示含 [--merge]
- assess BLOCKED 文案含 apply --merge 降级指引

## verify
- `node bin/sillyspec.js worktree apply`（无参）用法提示含 --merge
- `npm test`（含 task-07）
- `npm run lint`

## constraints
- 不改 applyWorktree 内部逻辑（task-05 负责）
- --merge 默认 false（不传则行为完全不变）
- 中文文案
