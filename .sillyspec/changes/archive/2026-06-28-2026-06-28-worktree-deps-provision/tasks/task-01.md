---
id: task-01
title: 依赖供给引擎 provisionDeps + lockfileHash
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P0
depends_on: []
blocks: [task-05, task-06, task-07]
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-005@v1, D-007@v1]
allowed_paths:
  - src/worktree-deps.js
goal: >
  新建独立供给引擎模块，实现 lockfile 哈希、junction/symlink 快路径、install 兜底与多语言命令推断，产出 depsStatus 状态对象，供 create/入口/doctor 复用。
implementation:
  - 新建 src/worktree-deps.js，导出 provisionDeps(worktreePath, mainCwd, opts) 与 lockfileHash(dir)
  - lockfileHash：取 pnpm-lock.yaml/package-lock.json/yarn.lock 首个命中的 sha256 前 16 位；无则 hash package.json；都无返回 null
  - provisionDeps 流程：解析 install 命令（local.yaml commands.install 优先，否则按 project.type+lockfile 推断）→ generic/无可执行 → {depsStatus:'n/a'}；否则快路径（main/node_modules 存在 且 hash 相等 → junction/symlink → linked）→ 否则 install（超时 300s，成功 installed/失败 failed+depsError）
  - junction：Windows `cmd /c mklink /J`，POSIX `ln -s`；失败回退 install
  - install 命令推断表见 design.md §7（nodejs 无 lockfile 兜底非 frozen npm install）
  - 返回 {depsStatus,depsMethod,depsSource,depsLockHash,depsCheckedAt,depsError?}
acceptance:
  - provisionDeps 在 lockfile 一致且有 main/node_modules 时返回 linked + depsMethod=junction|symlink
  - lockfile 不一致时执行 install 命令，成功返回 installed
  - install 失败/超时返回 failed + depsError，不抛错
  - generic/无 install 返回 n/a，不触碰文件系统
  - lockfileHash 对三种 lockfile 与 package.json 回退正确
verify:
  - node --check src/worktree-deps.js
  - node test/worktree-deps-provision.test.mjs（task-08 覆盖）
constraints:
  - 不修改 worktree.js（集成在 task-05）
  - junction 失败必须回退 install，不可静默失败
  - 平台无关：depsStatus 枚举不含平台词，机制记 depsMethod
