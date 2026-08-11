---
id: task-09
title: execute 启动入口构造 MultiRepoContext + 透传调用链 + local.yaml repos 读取（覆盖：FR-03, D-001, D-013）
title_zh: execute 入口构造 ctx 与 local.yaml repos 读取透传
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01, task-02, task-08]
blocks: [task-11]
requirement_ids: [FR-03]
decision_ids: [D-001, D-013]
allowed_paths:
  - src/run/shared.js
  - src/index.js
  - src/run/command.js
  - src/run/complete.js
  - src/machine-interface.js
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [constructor]
  task-02:
    - contract: DeclaredRepos
      needs: [repoKey]
goal: >
  execute 启动入口读 local.yaml repos 段加扫 task 卡片 repo 构造 MultiRepoContext，进程级贯穿 apply 加 verify，透传到 4 调用点。
implementation:
  - execute 启动入口读 local.yaml repos 段解析 Map keyed by 仓名
  - 扫所有 task 卡片 repo（用 task-02 聚合）加 main 隐式为 cwd 构造 declaredRepos
  - 调 task-01 MultiRepoContext 构造，进程级贯穿 execute 加 apply 加 verify
  - 透传 ctx 到 applyWorktree 加 validateTaskReviews 加 runVerifyTestCheck 加 generateTaskReviewDrafts
acceptance:
  - execute 启动构造 ctx 一次贯穿 apply 加 verify 不重建
  - local.yaml repos 段正确解析为 Map
  - main 隐式为 cwd 不用注册
  - ctx 透传到 4 调用点签名
verify:
  - npm test
constraints:
  - ctx 构造一次进程级贯穿不重建（D-013）
  - local.yaml 无 repos 段时单仓 change 不读，跨仓 change 缺则 task-01 fail-closed
  - main 隐式为 cwd 不用注册
---
