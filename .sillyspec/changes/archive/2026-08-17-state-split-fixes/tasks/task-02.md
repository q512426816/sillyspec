---
id: task-02
title: applyByMerge baseline pre-align
title_zh: "#2 applyByMerge 预对齐 baseline 并行文件"
author: qinyi
created_at: 2026-08-16 23:25:00
priority: high
depends_on: []
blocks: [task-04]
allowed_paths:
  - src/worktree-apply.js
  - test/worktree-merge-baseline-align.test.mjs
goal: apply --merge 前把 baseline 并行文件预对齐 main 版，消除 merge 冲突主因（D-002@v1）
implementation: |
  applyByMerge（:717）merge 前加预对齐：
  1. 过滤集 = git diff <meta.baseHash>..<baselineCommit> 文件集（已提交口径）
     ∩ main 已推进集（merge-base 后 main 有该文件提交）
     ∖ 分支已变更集（git diff <baselineCommit>..HEAD -- <file> 非空）
     ∖ 工作区 dirty 集（git status --porcelain 该文件非空）
  2. 每文件 git checkout main -- <file>；全部完成后 commit（sillyspec: align baseline files to main (pre-merge, N files)）
  3. 失败任一步 → 跳过预对齐走原 merge + warning（降级）
  测试：tmp git 仓构造 baseline 含并行文件场景——预对齐后 merge 干净通过、并行文件取 main 版、
  交付文件保留；dirty 文件不被 checkout 覆盖；降级路径可触发。
  meta.baselineCommit 的实际字段名读 worktree.js 的 meta 结构确认。
acceptance:
  - baseline 含并行文件场景 apply --merge 成功（无冲突）
  - 交付文件正常合并（不被预对齐误伤）
  - 工作区 dirty 文件跳过预对齐（内容不被覆盖）
  - 降级路径（预对齐失败走原 merge）可触发
verify: node --test test/worktree-merge-baseline-align.test.mjs + npm test
constraints: 不改 cp 路径与 --check-only 行为；预对齐 commit 信息可追溯
---

