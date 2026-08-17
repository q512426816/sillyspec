---
id: task-04
title: 新增 quick-close-linked-changes 回归测试
title_zh: 新增 quick-close-linked-changes 回归测试
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P0
depends_on: [task-01, task-02]
blocks: [task-06]
allowed_paths:
  - test/quick-close-linked-changes.test.mjs
goal: |
  用临时 git 仓库 + specDir 验证 closeQuickLinkedChanges 行为：自动归档、不误关、幂等。
implementation: |
  1. 创建临时 git 仓库，初始化 .sillyspec。
  2. 建一个变更目录 changes/some-change/，写入 tasks.md（含一个未勾选 task）。
  3. 调用 closeQuickLinkedChanges，断言未勾选时不归档。
  4. 勾选 task 后调用，断言 status=archived 且目录移到 archive/。
  5. 测试目标目录已存在时幂等跳过。
  6. 测试无 linkedChanges 时不报错。
acceptance: |
  - 测试覆盖 AC-01、AC-02、AC-03。
  - 测试不污染真实仓库。
verify: |
  npm test 中本测试通过。
constraints: |
  - 只新增 test/quick-close-linked-changes.test.mjs。
  - 使用 mkdtempSync 隔离。
---
# task-04: 新增回归测试
见 frontmatter。
