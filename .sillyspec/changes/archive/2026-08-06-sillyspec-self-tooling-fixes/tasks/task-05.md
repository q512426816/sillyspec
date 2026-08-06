---
id: task-05
title: ROADMAP 登记多代理 import 链污染（坑5）
title_zh: ROADMAP 登记多代理 import 链污染（坑5）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P2
depends_on: []
blocks: [task-07]
requirement_ids: [FR-05]
decision_ids: [D-05@v1]
allowed_paths:
  - .sillyspec/ROADMAP.md
goal: |
  把"多代理并行改 src 中间态含 SyntaxError 污染 import 链，另一子代理跑测试撞错"
  的架构级观察登记进 .sillyspec/ROADMAP.md。本 change 不修（架构级，需 worktree-per-task
  或 import 沙箱），仅登记债项。
implementation: |
  - .sillyspec/ROADMAP.md 加条目：
    - 标题：多代理并行中间态 import 链污染
    - 根因：多代理并发改 src 无隔离，单点 SyntaxError（如 packages/*/ 注释撞 ES module
      解析）全局连坐，另一子代理跑测试撞错，交叉发现后自修。
    - 来源：2026-08-05-tooling-feedback-fixes 复盘 task-06 plan-postcheck.js SyntaxError
      被 task-04/task-08 交叉发现自修。
    - 候选解：worktree-per-task（每子代理独立 worktree）/ import 沙箱（隔离中间态）。
    - 规模：架构级，超出本 change「确定性缺陷局部修复」范围。
acceptance: |
  - .sillyspec/ROADMAP.md 含坑5 条目（多代理 import 链污染 + 候选解 worktree-per-task / import 沙箱）。
verify: |
  grep -n "import 链污染" .sillyspec/ROADMAP.md
constraints: |
  - 本 change 不修（架构级延后，D-05）。
  - 仅登记 ROADMAP 条目，不改任何源码。
  - 不与 task-01~04 行为变更混在本 change 实施（规模不同）。
---

# task-05: ROADMAP 登记多代理 import 链污染（坑5）

execute 多子代理并行实现时，某子代理改 src 中间态含 SyntaxError 污染 import 链，
另一子代理跑测试撞错。根因是多代理并发改 src 无隔离。架构级（需 worktree-per-task 或
import 沙箱），本 change 不修，登记 ROADMAP。

## 依据
- design.md §1 坑5 / §3 非目标 / FR-05 / D-05@v1（deferred 入 ROADMAP）
- 来源：2026-08-05-tooling-feedback-fixes 复盘 task-06 plan-postcheck.js SyntaxError
  被 task-04/task-08 交叉发现自修。
