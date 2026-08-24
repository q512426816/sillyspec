---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — worktree

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-901@v1 worktree 清理先解链 node_modules junction 再删目录
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/worktree.js:81
最近确认：71a7fe6
理由：删除/重建 worktree 目录必须先经 unlinkNodeModulesLinks/safeRemoveWorktreeDir 解链根目录与 meta.depsModules 各子模块的 node_modules junction 再 rmSync——裸 rmSync 或 Git Bash rm -rf 会跟随 junction 穿透删掉主仓 node_modules（user-inputs 两次事故实录），幽灵目录清理同理走统一出口。
