---
id: task-03
title: new tests for cleanup guard and landing verification
title_zh: 新增 cleanup 保护与阶段级核验测试
author: qinyi
created_at: 2026-08-13 15:02:20
priority: P0
depends_on: task-01, task-02
allowed_paths:
  - test/worktree-cleanup-guard.test.mjs
  - test/execute-loss-guard.test.mjs
goal: >
  新增两个测试文件，覆盖 FR-01 至 FR-06：cleanup fail-closed 保护（拦截与 force 绕过与 apply 后 force 放行）
  与 findMissingDeliverables 纯函数（分支 tree 与工作区与两处皆无与无法核验）及 execute 完成路径聚合。
implementation:
  - worktree-cleanup-guard.test.mjs 用临时 git 仓加 worktree fixture 验证 cleanup 未落主仓变更返回 blocked 与 force 绕过与 apply 后 force 放行
  - execute-loss-guard.test.mjs 对 findMissingDeliverables 纯函数覆盖分支 tree 命中与工作区命中与两处皆无与 checked 为 false
  - execute 完成路径聚合集成测验证缺失 warn 输出与跨仓过滤
  - 相关既有 worktree-apply 真实 apply 测试与 junction 测试作为零回归核对面跑通
acceptance:
  - cleanup 保护测试全绿（拦截 force 绕过 apply 后放行 in-place 跳过）
  - findMissingDeliverables 各分支测试全绿
  - execute 完成路径聚合测试验证 warn 不阻断
verify:
  - node test/worktree-cleanup-guard.test.mjs
  - node test/execute-loss-guard.test.mjs
  - node test/worktree-apply-classification.test.mjs 等相关既有 apply 测试零回归
constraints:
  - 测试用临时目录隔离不污染真实仓库
  - 断言真实行为与副作用不写空断言
  - 不修改既有测试逻辑来通过
  - Windows 兼容不依赖平台特定命令
---

# task-03: 新增测试

见 design.md 文件变更清单新增项、requirements.md FR-01 至 FR-06。
