---
id: task-06
title: execute 入口自检 missing/stale/缺字段重供给
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P0
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-07]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run.js
goal: >
  在 execute 入口对当前 change 的 worktree 自检 deps 新鲜度，处理 create short-circuit 不供给的已存在 worktree，缺失/stale/缺字段时重供给。
implementation:
  - 在 src/run.js runStage（~runStage execute 分支，进入 wave 执行前）加自检
  - 读取 meta：const meta = WorktreeManager.getMeta(changeName)
  - 触发重供给条件（任一）：meta 无 depsStatus / （meta.depsStatus∈{linked,installed} 但 worktree/node_modules 不存在 → missing）/ lockfileHash(worktree)!=meta.depsLockHash → stale
  - 命中则调 provisionDeps(worktreePath, mainCwd) 重供给，更新 meta.json（merge deps 字段 + 重写 meta）
  - 自检幂等：重复进入不重复供给（meta 新鲜则跳过）
  - 重供给后再交 task-02 的门判定
acceptance:
  - 旧 worktree（meta 无 depsStatus）首次 execute 触发供给补全
  - node_modules 被清后 resume 触发重供给
  - lockfile 变化后触发重供给并更新 depsLockHash
  - meta 新鲜时自检无副作用
verify:
  - node --check src/run.js
  - npm test
constraints:
  - 自检仅 execute 阶段触发（与门一致）
  - 重供给失败记 meta.failed，由门阻断，不自检循环
  - 不改变 runStage 其它阶段行为
