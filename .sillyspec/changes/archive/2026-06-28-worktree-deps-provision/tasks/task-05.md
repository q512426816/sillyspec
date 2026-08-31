---
id: task-05
title: create() 集成 provisionDeps + meta 字段合并
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-01]
decision_ids: [D-005@v1]
allowed_paths:
  - src/worktree.js
goal: >
  在 WorktreeManager.create() 的 baseline overlay 之后调用 provisionDeps，把 depsStatus 系列字段合并进 meta.json，让 worktree 创建即可构建。
implementation:
  - 在 src/worktree.js create() 的 baseline overlay（~318 _overlayBaseline 调用）之后、meta.json 写入（~329）之前，调 import 的 provisionDeps
  - const deps = await provisionDeps(worktreePath, this.cwd, { specBase })（注意 create 当前是同步函数，需评估改 async 或用 execSync 形式保持一致；provisionDeps 若用 execSync 则无需 async）
  - 把 deps.depsStatus/depsMethod/depsSource/depsLockHash/depsCheckedAt/depsError 合并进 meta 对象（~329-343）
  - provision 失败不阻断 create：deps.depsStatus='failed' 只记 meta，不抛错
acceptance:
  - 新建 worktree 后 meta.json 含 depsStatus 等字段
  - junction 成功时 depsStatus=linked、depsMethod=junction
  - install 失败时 create 仍成功，meta 记 depsStatus=failed+depsError
  - 既有 create 流程（fetch/overlay/checkpoint）行为不变
verify:
  - node --check src/worktree.js
  - npm test
constraints:
  - provision 失败绝不阻断 create（只记 meta）
  - 不改变 create 的 short-circuit 行为（已存在 worktree 复用，~208）
  - 保持 create 现有返回结构，仅 meta 增字段
