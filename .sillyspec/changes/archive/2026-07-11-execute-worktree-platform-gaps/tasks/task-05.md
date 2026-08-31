---
id: task-05
title: applyWorktree --merge 降级实现（坑 1 核心）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P0
depends_on: []
blocks: [task-06, task-07]
allowed_paths:
  - src/worktree-apply.js
---
> applyWorktree 加 merge 选项：baseline 漂移时走 git merge sillyspec/<change> 替代 patch，默认行为不变（D-001）。

## implementation
- 改签名 applyWorktree(changeName, { cwd, checkOnly=false, merge=false })（worktree-apply.js:76）
- 改步骤 4.5 漂移分支（:165-183）：merge=true 且 currentHash!==meta.baselineHash 时跳过步骤 5-7（patch 路径），改走 merge 降级；merge=false 维持现状 return error，文案补「可用 --merge 降级」
- 新增 merge 降级路径：execSync git -C <projectRoot> merge sillyspec/<change>（BRANCH_PREFIX=sillyspec/，worktree.js:18 已核实）；成功设 result.merged=true + 自动 cleanup；冲突 git merge --abort + result.errors push 冲突文件列表
- git 子进程沿用 execSync + stdio:['pipe','pipe','pipe']（CONVENTIONS）
- checkOnly=true 时 merge 不生效（行为矩阵见 design §8）

## acceptance
- FR-1：漂移 + merge=true → git merge 执行、result.merged===true、不报 error
- FR-2：漂移 + merge=false → return error 报 BLOCKED + 文案含「可用 --merge 降级」
- FR-5：merge 冲突 → return error 含冲突文件 + git merge --abort 回滚（主仓库无半成品）
- 无漂移时 patch 流程不变

## verify
- `npm test`（含 task-07 新测试）
- 手动构造漂移场景：applyWorktree(name,{merge:true}) 验 result.merged

## constraints
- 默认 patch 行为不变（--merge 仅 opt-in，D-002 与线性历史张力可控）
- 不自动解决 merge 冲突（冲突 abort + 报错）
- 不改 baseline 检测算法（排除规则不变）
- 不改 sillyspec.db
