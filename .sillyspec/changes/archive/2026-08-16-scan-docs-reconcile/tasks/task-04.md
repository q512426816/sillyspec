---
id: task-04
title: P4 verify and commit
title_zh: P4 验证与提交
author: qinyi
created_at: 2026-08-16 18:25:17
priority: high
depends_on: [task-01, task-02, task-03]
blocks: []
allowed_paths:
  - .sillyspec/changes/2026-08-16-scan-docs-reconcile/module-impact.md
goal: 三重机械验证 + 显式 pathspec 分批提交，变更目录归档收尾
implementation: |
  docs check：清单内 14 文件 0 新增失效（存量 5 处并行遗留登记，D-001@v1 相对口径）；
  npm test：210 文件全绿；grep propose：scan/+modules/ 零阶段描述残留；
  git commit 显式 pathspec（每 task 一个 commit，隔离并行会话 state-machine-fail-open 暂存文件）；
  更新 module-impact.md 实际变更结果。
acceptance:
  - docs check 清单内 0 新增失效
  - npm test 全绿
  - 提交未夹带并行会话暂存文件（git status 首列核对）
verify: docs check + npm test + git log --stat 核对
constraints: 勿 git add . 全量；push 前知悉 pre-push gate 可能因存量 5 处拦截（预期内）
---
