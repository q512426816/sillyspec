---
id: task-07
title: Wave 2 测试（applyWorktree --merge 行为矩阵）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: [task-05, task-06]
blocks: []
allowed_paths:
  - test/worktree-apply-merge-fallback.test.mjs
---
> 为坑 1 --merge 降级写行为矩阵测试（FR-1/2/5），在 run-tests.mjs 注册。

## implementation
- 新增 test/worktree-apply-merge-fallback.test.mjs，用临时 git 仓库 + worktree 构造：
  - 场景 A：构造 baseline 漂移（主工作区产生排除范围外脏变更），applyWorktree(name,{merge:true}) → 断言 result.merged===true、git log 含 merge commit、无 error
  - 场景 B：同漂移 applyWorktree(name,{merge:false}) → 断言 result.errors 含 BLOCKED + 「可用 --merge 降级」
  - 场景 C：构造 merge 冲突 → applyWorktree(name,{merge:true}) → 断言 result.errors 含冲突文件、主仓库 git status 无半成品合并（--abort 已回滚）
  - 场景 D：无漂移 applyWorktree(name,{merge:true}) → 走原 patch 流程，result.merged 非 true
- 在 test/run-tests.mjs 注册（TESTING.md 风格）
- 沿用内联 assertEqual/assertThrows

## acceptance
- 四场景测试通过
- 测试在 run-tests.mjs 注册
- 自包含（临时仓库，不污染主仓库）

## verify
- `npm test` 新测试通过
- `npm run lint` 0 error

## constraints
- 测试用临时目录（os.tmpdir），不污染 sillyspec 主仓库工作区
- 不改源码；发现 bug 走 reverse-sync
- brownfield：不破坏现有 npm test
