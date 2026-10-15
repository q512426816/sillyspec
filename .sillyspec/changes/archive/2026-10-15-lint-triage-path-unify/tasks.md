---
author: flow-machine-draft
created_at: 2026-10-15T10:34:31.850Z
---
# 任务注册表（Tasks）— 2026-10-15-lint-triage-path-unify

- [x] task-01: lintOwnershipDowngrade 语义：pre-existing→true+降档 warning；owned/unattributable/鉴定链异常→false（保守硬拦）
- [x] task-02: gates.js 与 verify-quality-scan.js 两路径同源接线（无复制粘贴分叉）
- [x] task-03: 新增 test/lint-ownership-path.test.mjs 覆盖 helper 四态 + 两路径源级接线断言，全绿
- [x] task-04: flow done 实测门（npm test + npm run lint）通过
