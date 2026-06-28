---
id: task-07
title: worktree doctor deps 三类检查 + --fix 重供给
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P1
depends_on: [task-01]
blocks: [task-08]
requirement_ids: [FR-08]
decision_ids: [D-001@v1]
allowed_paths:
  - src/worktree.js
  - src/index.js
goal: >
  在 worktree doctor 增加 deps-missing/stale/failed 三类检查，--fix 时调 provisionDeps 重供给，让依赖状态可观测可修复。
implementation:
  - 在 src/worktree.js doctor()（~642）扫描 meta 时新增三类检查：
    - deps-missing：meta.depsStatus∈{linked,installed} 但 existsSync(worktree/node_modules)=false → fixable
    - deps-stale：lockfileHash(worktreePath)!=meta.depsLockHash → fixable
    - deps-failed：meta.depsStatus==='failed' → fixable（重试）
  - fix 时对三类调 provisionDeps 重供给，更新 meta
  - 在 src/index.js worktree doctor 输出渲染（~551 附近）展示 deps 检查项
acceptance:
  - doctor 检出 deps-missing/stale/failed 并报告
  - doctor --fix 对三类重供给成功，meta 更新
  - 无 deps 问题的 worktree 不报 deps 项
verify:
  - node --check src/worktree.js src/index.js
  - npm test
constraints:
  - 只对 sillyspec 创建的 worktree（有 meta）检查
  - --fix 重供给失败不阻断 doctor，记 unfixable
  - 复用 doctor 现有 issues/fixed/unfixable 返回结构
