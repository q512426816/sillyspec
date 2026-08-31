---
id: task-08
title: 测试 worktree-deps-provision
author: qinyi
created_at: 2026-06-28 17:09:17
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05, task-06, task-07]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v2, D-007@v1]
allowed_paths:
  - test/worktree-deps-provision.test.mjs
goal: >
  新增测试文件覆盖供给快路径/兜底、门拒绝/opt-out、generic 跳门、入口自检、doctor 重供给，确保全 FR 可验证。
implementation:
  - 新建 test/worktree-deps-provision.test.mjs，仿 test/worktree-guard.test.mjs 风格（mkdtemp 建临时 git 仓库 + worktree）
  - lockfileHash 单测：三种 lockfile + package.json 回退
  - provisionDeps：mock main/node_modules + 一致 lockfile → linked；不一致 → install（mock 或 stub execSync）；generic → n/a
  - 门（task-02）：depsStatus=failed 时 completeStep execute 拒绝（exit/block）；wave 全 opt-out 跳门
  - 入口自检（task-06）：meta 缺字段/missing/stale 触发重供给
  - doctor（task-07）：deps-missing/stale/failed 检出 + --fix
  - 注册到 test/run-tests.mjs（如它是聚合入口）
acceptance:
  - 全部新增用例 PASS
  - npm test（含既有 28 测试）全绿
  - 覆盖 plan.md 全局验收的可自动化部分
verify:
  - node test/worktree-deps-provision.test.mjs
  - npm test
constraints:
  - 不 mock 掉被测核心逻辑（lockfileHash/provisionDeps 判定要真实跑）
  - install/网络类用 stub 或限定 dry 路径，保证 CI 稳定
  - 不改既有测试
