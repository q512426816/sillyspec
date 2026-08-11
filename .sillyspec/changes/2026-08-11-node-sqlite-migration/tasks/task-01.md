---
id: task-01
title: 实证 node:sqlite floor（D-004 / spike-01）—— 测 22.x/24.x 是否需 experimental-sqlite flag（含 worktree-guard 子进程同 process.execPath 约束），把 floor 定论与证据记入 decisions.md D-004
title_zh: 实证 node:sqlite 版本下限
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: []
blocks: [task-07]
requirement_ids: [FR-06]
decision_ids: [D-004@v1]
allowed_paths:
  - .sillyspec/changes/2026-08-11-node-sqlite-migration/decisions.md
provides:
  - contract: NodeSqliteFloor
    fields: [engines_node_floor, flag_required_22x, evidence]
goal: >
  实证 node:sqlite 在 22.x 与 24.x 是否需 experimental-sqlite flag，定 engines.node floor，把定论与证据记入 decisions.md D-004，供 task-07 写 engines 字面值。
implementation:
  - 本地 node 24.15.0 跑动态 import node:sqlite 确认无 flag 可用
  - 查 Node 官方 changelog 定 node:sqlite 各版本 flag 行为（22.5.0 首现 experimental 需 flag，24.x 去 flag）
  - 核验 worktree-guard 子进程用同 process.execPath，floor 须同时覆盖主进程与子进程两路
  - 把 floor 定论与 22.x flag 行为证据追加写入 decisions.md D-004 的 evidence 段
acceptance:
  - engines.node floor 字面值确定（候选大于等于 22.5 或大于等于 24，实证驱动非猜测）
  - decisions.md D-004 evidence 段含 22.x flag 行为与 floor 定论
  - 子进程 flag 约束已纳入 floor 判定
verify:
  - 动态 import node:sqlite 在目标 node 无 flag 成功返回 function
  - grep decisions.md 含 D-004 floor 定论文本
constraints:
  - 本地仅 node 24.15.0 可直接实证，22.x 行为查官方 changelog 不猜测
  - 不改任何源码，只写 decisions.md
  - 实证驱动（D-004），floor 只能定在无 flag 可用的最低版本
---
