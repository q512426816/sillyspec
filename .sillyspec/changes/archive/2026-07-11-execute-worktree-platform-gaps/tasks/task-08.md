---
id: task-08
title: Wave 2 模块文档同步（worktree + cli-entry + file-lifecycle，含 D-002 架构注）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P1
depends_on: [task-05]
blocks: []
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
  - docs/sillyspec/file-lifecycle.md
---
> 同步 worktree/cli-entry 模块文档 + file-lifecycle，记录 applyWorktree --merge 降级 + 架构决策张力注（D-002）。

## implementation
- .sillyspec/docs/sillyspec/modules/worktree.md：
  - applyWorktree 接口表加 `merge?` 参数说明（baseline 漂移时 git merge sillyspec/<change> 替代 patch）
  - 架构决策表（:84「补丁而非 merge」）补注：默认 patch 保持线性历史；--merge 为 baseline 漂移时可选降级，会引入合并提交（D-002）
- .sillyspec/docs/sillyspec/modules/cli-entry.md：worktree apply 命令补 [--merge] flag 说明
- docs/sillyspec/file-lifecycle.md：补 --merge flag 说明（更新 updated_at，CLAUDE.md 强制）
- 各 frontmatter updated_at 更新

## acceptance
- worktree.md applyWorktree 表含 merge 参数 + 架构决策表含 --merge 注
- cli-entry.md 含 [--merge]
- file-lifecycle.md 含 --merge，updated_at 更新

## verify
- `grep "merge" .sillyspec/docs/sillyspec/modules/worktree.md` 命中新增段
- `grep "updated_at" docs/sillyspec/file-lifecycle.md` 时间已更新
- markdown 语法无破损

## constraints
- 若涉及 skill 同步 .claude/skills/（worktree 相关 skill，按 CLAUDE.md）
- 不改其它模块文档
- 架构决策注明确「默认不变」（D-002）
