---
id: task-04
title: archive CLI 下沉 git add（坑4）
title_zh: archive CLI 下沉 git add（坑4）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P0
depends_on: []
blocks: [task-06, task-07]
requirement_ids: [FR-04]
decision_ids: [D-04@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - test/archive-cli-git-add.test.mjs
goal: |
  archiveChangeDirectory 归档目录移动 + 注销 change 后，CLI 确定性 safeGit add
  .sillyspec/changes/archive/ + .sillyspec/docs/，不靠 step5 prompt 驱动 agent 自觉。
  实测新移入 archive/<destName>/ untracked 子目录不再漏暂存。
implementation: |
  - src/run/complete-handlers.js:137 unregisterChange 后追加（design §7 Fix-4）：
    try {
      safeGit(cwd, ['add', '--', '.sillyspec/changes/archive/'])
      safeGit(cwd, ['add', '--', '.sillyspec/docs/'])
    } catch {}
  - safeGit 已 import :26 from './shared.js'。POSIX 正斜杠路径（git 接受，跨平台）。
  - 新增 test/archive-cli-git-add.test.mjs：归档后 git status 含
    .sillyspec/changes/archive/<destName>/ + .sillyspec/docs/ 已暂存；safeGit 失败
    不阻断归档（mock safeGit throw，验证目录已移动 + change 已注销）。
acceptance: |
  - 归档后 git status 含 .sillyspec/changes/archive/<destName>/ 已暂存。
  - 归档后 git status 含 .sillyspec/docs/ 已暂存。
  - safeGit 失败不阻断归档（目录已移动 + change 已注销）。
verify: |
  node test/archive-cli-git-add.test.mjs
constraints: |
  - archiveChangeDirectory 移动 + 注销行为不变（仅末尾追加 safeGit add）。
  - archive.js step5 prompt git add 保留（幂等兜底，R-05 双保险不冲突）。
  - 精确 add changes/archive/（不扫其他活跃 change）+ docs/。
  - POSIX 路径正斜杠跨平台（Windows/Linux/macOS）。
  - safeGit 包 try-catch 静默失败不阻断归档（R-06）。
---

# task-04: archive CLI 下沉 git add（坑4）

archiveChangeDirectory（complete-handlers.js:95-150）移动目录 + 注销 change 但不更新 git
index；step5 prompt（archive.js:160）驱动 git add 不可靠，实测漏 archive/<destName>/
untracked 子目录。本 task 在 CLI 末尾确定性 safeGit add。

## 依据
- design.md §5 Fix-4 / §7 Fix-4 代码片段 / FR-04 / D-04@v1
- 根因：complete-handlers.js:95-150 不更新 git index；archive.js:160 step5 prompt 不可靠。
- safeGit 已 import complete-handlers.js:26 from './shared.js'。
