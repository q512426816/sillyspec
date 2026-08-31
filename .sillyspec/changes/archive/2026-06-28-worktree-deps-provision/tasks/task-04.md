---
id: task-04
title: 文档同步（CLAUDE.md 要求）
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P1
depends_on: []
blocks: []
requirement_ids: []
decision_ids: [D-002@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - docs/sillyspec/file-lifecycle/worktree-and-guard.md
goal: >
  按 CLAUDE.md 文档同步铁律，修复 worktree 模块文档与代码脱节，注册缺失模块，并把 deps provision 阶段与 meta 字段写入文件生命周期文档。
implementation:
  - 修 .sillyspec/docs/sillyspec/modules/worktree.md：路径 .sillyspec/worktrees/ → .sillyspec/.runtime/worktrees/；分支前缀 change/ → sillyspec/；补 provisionDeps 接口与 depsStatus meta 字段说明
  - 在 .sillyspec/docs/sillyspec/modules/_module-map.yaml 注册 worktree 模块（当前缺失，只有 stages/runtime/cli-entry/dashboard/migration）
  - 更新 docs/sillyspec/file-lifecycle/worktree-and-guard.md：补 create 后的 Dependency Provision 阶段 + meta.json deps 字段 + doctor deps 检查项；更新头部 updated_at
acceptance:
  - worktree.md 路径/分支前缀与 src/worktree.js（WORKTREES_REL、BRANCH_PREFIX）一致
  - _module-map.yaml 含 worktree 模块条目
  - file-lifecycle 文档描述 deps provision 流程与实际一致
verify:
  - grep 核对 worktree.md 路径/前缀与代码常量一致
constraints:
  - 文档头部保留/更新 author + created_at/updated_at
  - 只改文档，不改代码逻辑
