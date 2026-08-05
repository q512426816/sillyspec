---
id: task-05
title: cwd worktree 副本漂移自动锁定主仓 spec
title_zh: cd 进 worktree 副本不再 exit，自动锚回主仓 spec 继续
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-03@v1]
allowed_paths:
  - src/run/command.js
  - test/worktree-execute-spec-drift.test.mjs
---

## goal
detectWorktreeSpecDrift 命中时不再 `exit(2)`，而是把 specBase 重写为 `wt.mainSpecBase`、warn 提示后继续流程——副本 cwd 也能跑 execute/plan/verify/archive，进度落主仓。

## implementation
- **command.js:530-538（worktree 副本漂移守卫）**：当前命中即 `exit(2)`（536）。改为：`const wt = detectWorktreeSpecDrift(specBase)`（532）命中时，`specBase = wt.mainSpecBase`，并同步重写关联 `specRoot`（与 specBase 同源派生，否则后续 pm.read/specRoot 仍指副本），`console.warn('⚠️ 已自动锚定主仓 spec（原 cwd 命中 worktree 副本 <changeName>）→ <mainSpecBase>')`，**不 exit**，流程继续落入下方 validateChangeExists（544）/ quick drift（557）。
- **不改的其他漂移**：changeMissing（544-550，exit 549）与 quick drift（557-565，exit 563）仍 `exit(2)`——二者非副本场景，不自动纠正。
- **不改跳过条件**：530-531 的 `platformOpts.specRoot || specDir`（平台模式/显式 --spec-dir）跳过本守卫的逻辑保留；cwd 纠正块（140-154）与平台指针判定不动。

## acceptance
- worktree 副本 cwd 跑 `execute`：不 exit，进度/artifact 写入 `wt.mainSpecBase`（主仓 .sillyspec），stderr 含「自动锚定」warn。
- 主仓正常 cwd、monorepo 子项目、平台模式、显式 `--spec-dir` 场景行为不变（不误触发重写）。
- changeMissing / quick drift 两路非副本漂移仍 `exit(2)`。

## verify
`node test/worktree-execute-spec-drift.test.mjs`——新建/改断言：由期望 `exit(2)` 改为「warn 含『自动锚定』+ 流程继续 + 进度落 mainSpecBase」。

## constraints
- 仅副本漂移自动纠正，其他漂移（changeMissing/quick）仍拒。
- `mainSpecBase` 已在 shared.js:244 计算并由 247 返回，**不新增路径解析、不改 shared.js**。
- 重写 specBase 后须连带重写 specRoot，避免下游读副本。

## related_tests
- test/worktree-execute-spec-drift.test.mjs（本 task 新建/改断言）
- test/worktree-spec-drift-guard.test.mjs（既有纯函数单测，不动——仍覆盖 detectWorktreeSpecDrift 路径判据）
