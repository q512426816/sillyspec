---
id: task-03
title: doctor deps-main-drift + force 重装 + --change flag
title_zh: doctor 探测主仓依赖漂移并强制重装，补 --change 过滤
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-01, FR-02]
decision_ids: [D-02@v1]
allowed_paths:
  - src/worktree.js
  - src/worktree-deps.js
  - src/index.js
  - test/worktree-doctor.test.mjs
expects_from:
  task-01:
    - contract: checkDepsFreshness
      needs: [main-drift 状态判定]
---

## goal
doctor 用 task-01 提供的 `checkDepsFreshness` 探测 main-drift（主仓 lockfile 漂移）；`--fix` 先解 junction 再 `provisionDeps(force)` 强制重装；补 `--change` flag 按 changeName 过滤扫描范围。

## implementation
- **worktree.js doctor deps 块 (908-928)**：当前只判 `deps-missing/deps-stale/deps-failed`，新增调 `checkDepsFreshness(meta, this.cwd)`（task-01 提供）；返回 `main-drift` 时 push `deps-main-drift` issue（fixable=true）。
- **_doctorReprovision (835-845)**：当前直接 `provisionDeps(...)` 不解链，先复用 cleanup 解链代码 (722-743：lstatSync 判 link → Windows `rmdir` junction / 非 Win `unlinkSync`) 解 worktree/node_modules，再 `provisionDeps(wtPath, this.cwd, { force:true })`。
- **worktree-deps.js provisionDeps (196-267)**：加 `force` 选项；`force=true` 时绕过 tryLink 短路 (101-110 已存在 → 幂等返回) 与 lockfile 一致快路径 (216)，强制走 install 分支重装。
- **index.js doctor 解析 (867-893)**：加 `--change` 解析 → `wm.doctor({ fix, staleHours, changeName })`；doctor 内对 `metaEntries` (871) 按 `changeName` 过滤，多 wt 时只扫该 change。
- **in-place 守卫 (909)**：当前 `meta.mode !== 'in-place-fallback'` 跳过 deps 检查；放宽给 in-place 也跑 lockfile 自检（main-drift 对 in-place 同样有意义，不解链只告警）。

## acceptance
- 主仓 lockfile 变化 + wt 自身未变 → 报 `deps-main-drift`（wt lockfile 未变，所以 deps-stale 不触发，靠 main-drift 兜底）。
- `--fix` 后依赖一致（force 重装生效，meta.depsStatus 重置、depsLockHash 更新）。
- `doctor --change A` 多 wt 场景只扫 A，其他 change 不出现在 issues。
- in-place 模式也检查 main-drift（不再因 909 守卫整体跳过）。

## verify
`node test/worktree-doctor.test.mjs`——新增 deps-main-drift 触发 + `--change` 过滤 + force 重装三条断言。

## constraints
- 不传 `--change` 全量扫（兼容现有行为）。
- 不传 `force` 保留 tryLink 短路（101-110）与 lockfile 一致快路径（216）。
- Windows junction 必须先解链再 provisionDeps，防 `rmSync`/`git worktree remove` 跟随 junction 误删主仓 node_modules（722-743 同源坑）。
- in-place 模式 force 不解链（无独立 node_modules），仅 install。

## related_tests
- test/worktree-doctor.test.mjs（本 task 新增/改）
