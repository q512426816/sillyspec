---
id: task-05
title: State machine guard regression tests (subprocess-driven)
title_zh: 状态机守卫回归测试（子进程驱动）
author: qinyi
created_at: 2026-08-16 16:02:14
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: [FR-06, FR-07]
decision_ids: [D-002@v2, D-003@v1, D-004@v1, D-005@v2, D-006@v1]
allowed_paths:
  - test/state-machine-guards.test.mjs
goal: >
  子进程驱动 CLI 断言进程级行为：--done 转换守卫拦截、auxiliary 不写 currentStage、只读查询不建 default、gate 失败 exit code=1。
implementation:
  - 新建 test/state-machine-guards.test.mjs，用子进程跑 node bin/sillyspec.js 构造各场景断言 exitCode 与 DB 状态
  - 既有受影响测试逐案定性：cli-top-level-aliases / run-complete-step-* / doctor-*（consistency-doctor-lost-update / doctor-align-execute-progress / worktree-doctor）/ sync-conflict-statemachine / audit-quick-completion——区分合法收紧（守卫拦未先建 currentStage 的 --done）与误伤
acceptance:
  - 新测试文件断言全绿
  - 全量 npm test EXIT=0、lint 通过
constraints:
  - 不改既有测试来「通过」（非测试逻辑错误）；测试隔离用 --spec-dir 钉死
verify: "node test/run-tests.mjs（含新测试文件）+ npm run lint"
---
