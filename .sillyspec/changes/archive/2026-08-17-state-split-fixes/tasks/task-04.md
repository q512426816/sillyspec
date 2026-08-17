---
id: task-04
title: verify + docs sync + commit
title_zh: 全量验证 + 文档同步 + 提交
author: qinyi
created_at: 2026-08-16 23:25:00
priority: high
depends_on: [task-01, task-02, task-03]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/troubleshooting.md
  - .sillyspec/changes/2026-08-16-state-split-fixes/module-impact.md
goal: 全量验证 + 文档同步（marker 机制/三坑登记）+ 显式 pathspec 提交
implementation: |
  npm test 全绿（211+3 新增）；docs check 无新增失效；
  file-lifecycle.md 补 marker 写入原子化不变量描述（execute 行或相关段）；
  troubleshooting.md 登记三坑闭环（execute-runs 静默缺失/worktree merge baseline 冲突/活文档漂移提示，注明修复 commit）；
  module-impact 按实际变更更新；显式 pathspec 提交（隔离并行会话）。
acceptance:
  - npm test 全绿；docs check 无新增失效
  - file-lifecycle 含 marker 不变量描述；troubleshooting 三坑登记
  - 提交未夹带并行会话改动
verify: npm test + docs check + git log --stat
constraints: 勿 git add . 全量
---

