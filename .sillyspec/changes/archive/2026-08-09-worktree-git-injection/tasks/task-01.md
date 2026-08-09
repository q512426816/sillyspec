---
id: task-01
title: 新建 src/git-helper.js（safeGit 移入作单一实现 + 新增 git/gitQuiet，数组形式）+ src/run/shared.js safeGit 改 re-export（覆盖：FR-01, FR-02）
title_zh: 新建统一 git 调用入口并收口 safeGit
author: qinyi
created_at: 2026-08-09 11:18:45
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
requirement_ids: [FR-01, FR-02]
allowed_paths:
  - src/git-helper.js
  - src/run/shared.js
goal: >
  新建唯一公共 git 调用入口（execFileSync 数组形式），把 safeGit 从 run/shared.js 移入收口，并补抛错版 git 与静默版 gitQuiet，供 worktree 链与 run 层共用，消除口径分裂。
implementation:
  - 新建 src/git-helper.js，引入 child_process 的 execFileSync。
  - 把 safeGit 从 src/run/shared.js 原样移入作为单一实现，数组形式 execFileSync git 调用，前缀 -c safe.directory 与 -C cwd，默认 trim 与 timeout 5000，返回带 value 与 error 的对象。
  - 在 git-helper.js 新增抛错版 git，失败抛异常，返回 trim 后的字符串，对齐 worktree 本地 git 语义。
  - 在 git-helper.js 新增静默版 gitQuiet，内部调 git，失败返回 null，对齐 worktree 本地 gitQuiet 语义。
  - src/run/shared.js 删除本地 safeGit 实现，改为从 ../git-helper.js re-export 出 safeGit，run/ 层现有调用方路径与行为不变。
acceptance:
  - src/git-helper.js 存在并导出 safeGit、git、gitQuiet 三个函数，全部走 execFileSync 数组形式不经 shell。
  - src/run/shared.js 不再有本地 safeGit 实现体，仅 re-export，且原 safeGit 的 trim 与返回结构语义不变。
  - node --check 两文件语法通过；全量 npm test 中 run/ 层依赖 safeGit 的测试不回归。
verify:
  - node --check src/git-helper.js && node --check src/run/shared.js
  - npm test
  - npm run lint
constraints:
  - 行为不变：仅换实现载体与不经 shell，git 命令语义与返回值结构不变。
  - 不改 run/shared.js 其他函数；不动 worktree.js 与 worktree-apply.js 的调用点（属 task-02/03）。
  - 路径兼容 Windows/Linux/macOS，用数组形式天然规避 shell 拆词。
---
