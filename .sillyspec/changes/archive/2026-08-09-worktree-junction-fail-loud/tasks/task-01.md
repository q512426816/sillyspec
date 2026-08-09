---
id: task-01
title: cleanup junction unlink fail-loud
title_zh: cleanup junction 解链改 fail-loud
author: qinyi
created_at: 2026-08-09T16:10:00+08:00
priority: P0
depends_on: []
blocks: [task-02, task-03]
allowed_paths:
  - src/worktree.js
goal: cleanup(:738-757) 两处 try{}catch{} 静默 → fail-loud throw，保护主仓 node_modules 不被 git remove 跟 junction 误删
implementation: |
  - src/worktree.js cleanup 函数 :742 lstatSync 判 junction 的 try{}catch{} 静默 catch → 改 throw（EPERM 阻断，错误信息含「关闭占用进程或手动 rmdir "<wtNodeModules>" 后重试 sillyspec worktree cleanup」）
  - :744-754 junction 解链（win32 rmdir / unix unlinkSync）的 try{}catch{} → catch 改 throw（解链失败阻断，不继续 :764 git worktree remove，错误含 rmdir 指引）
  - isLink 初始值 `let isLink = false` 去掉 → lstat 失败直接 throw（不再默认 false 静默跳过解链）
acceptance:
  - lstatSync 抛 EPERM 时 cleanup throw Error（不跳过解链、不继续 git worktree remove）
  - 解链 rmdir/unlinkSync 失败时 cleanup throw Error（不继续 git worktree remove 跟 junction 删主仓 node_modules）
  - 正常 junction 仍解链成功（details push 既有 'worktree node_modules junction/symlink removed (protect main checkout)'）
verify:
  - node --test test/worktree-junction-fail-loud.test.mjs（task-03 提供）
constraints:
  - 接口签名 cleanup(changeName,{force,maxRetries}) 不变（仅容错策略收紧，仍可能 throw Error，调用方 run 已有 try/catch 兜底）
  - 错误信息含恢复指引（rmdir 路径 + 重试命令）
  - 遵循 D-001@v1（junction 解链 fail-loud）
related_tests: []
---

# task-01：cleanup junction 解链 fail-loud

## 背景
cleanup 在 Windows worktree 模式删 worktree 前，先解链 node_modules junction（指向主仓）。当前 `try { isLink = lstatSync(...).isSymbolicLink() } catch {}` 静默化——杀毒/索引锁 junction 偶发 EPERM 时 `isLink` 保持 false → 跳过解链 → `git worktree remove --force` 跟 junction **删主仓 node_modules**（memory sillyspec-worktree-cleanup-deletes-node-modules）。

## 改动点
1. lstat catch → throw（fail-loud，错误含恢复指引）
2. 解链 catch → throw（fail-loud，不继续 git remove）
3. 去 `isLink = false` 默认值（lstat 失败即 throw）
