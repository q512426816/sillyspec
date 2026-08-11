---
id: task-02
title: parseRepo + parseBaseCommit/parseHeadCommit task 卡片 frontmatter 解析（覆盖：FR-01, FR-02, D-001, D-010）
title_zh: task 卡片 repo 与 base/head 锡点 frontmatter 解析
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: []
blocks: [task-04, task-08]
requirement_ids: [FR-01, FR-02]
decision_ids: [D-001, D-010]
allowed_paths:
  - src/stages/plan-postcheck.js
provides:
  - contract: DeclaredRepos
    fields: [repoKey]
  - contract: TaskCardRepo
    fields: [repo, base_commit, head_commit]
goal: >
  新增 parseRepo/parseBaseCommit/parseHeadCommit 解析 task 卡片 frontmatter 的跨仓字段，供 MultiRepoContext 构造与 review 锡点读取。
implementation:
  - 在 plan-postcheck.js 新增 parseRepo 解析 frontmatter repo 字段，缺省返 main
  - 新增 parseBaseCommit/parseHeadCommit 解析 base_commit/head_commit（CLI 锡点字段），未锡点时返 null
  - 与 parseAllowedPaths 同源 frontmatter 正则风格，复用现有 fmMatch 逻辑
  - 提供聚合函数收集所有 task 卡片的 repo 集合供 MultiRepoContext 构造
acceptance:
  - parseRepo 正确解析 repo:sillyspec，旧卡片无 repo 字段时返 main
  - parseBaseCommit/parseHeadCommit 正确解析 hash 或未锡点返 null
  - 聚合函数返回所有 task 卡片去重 repo 集合
verify:
  - npm test
constraints:
  - 只做 frontmatter 解析，不读 local.yaml repos 段（那是 task-09 职责）
  - 向后兼容旧 task 卡片（无 repo 视 main，无 base_commit/head_commit 视 null）
---
