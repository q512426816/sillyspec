---
id: task-11
title: 跨仓端到端验证（multi-agent-platform↔sillyspec 真实场景，非自指 dogfood D-011）+ 单仓零回归验证（覆盖：AC-01~06, D-011, GOAL-2, GOAL-5）
title_zh: 跨仓端到端验证与单仓零回归验证
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-09, task-10]
blocks: [task-12]
requirement_ids: [FR-11]
decision_ids: [D-011]
allowed_paths:
  - test/multi-repo-context.test.mjs
  - test/cross-repo-task-review.test.mjs
  - test/cross-repo-apply.test.mjs
  - test/cross-repo-verify.test.mjs
goal: >
  用 multi-agent-platform 加 sillyspec 真实跨仓场景验证跨仓 task 全链路（review 加 apply no-op 加 verify），本仓改动走单仓 task 验证零回归，覆盖 AC-01 到 AC-06。
implementation:
  - 在 multi-agent-platform 仓建临时测试 change，跨仓 task 改 sillyspec 仓（注册到其 local.yaml repos）
  - 跑通跨仓 task 全链路（review repo 切跨仓 gitDir 加 apply no-op 加 verify 跨仓仓 npm test）
  - 本仓 sillyspec 改动全走单仓 task 验证 MultiRepoContext 退化单值 map 零回归
  - 覆盖 AC-01 到 AC-06 逐条验证
acceptance:
  - AC-01 跨仓 task review 过 Task Review Gate（跨仓 gitDir 校验）
  - AC-02 跨仓改动 apply 为 no-op 不进主仓
  - AC-03 verify 跨仓仓 npm test 过
  - AC-04 单仓 change 零行为变化
  - AC-05 未注册 repo fail-closed 阻断
  - AC-06 pathOwners 跨仓同名路径不误判
verify:
  - npm test
constraints:
  - 跨仓端到端用 multi-agent-platform 加 sillyspec 真实场景非自指（D-011，R-08）
  - 本仓改动走单仓 task 验证零回归（GOAL-2）
  - 临时测试 change 用完即清不污染 multi-agent-platform 仓
---
