---
author: flow-machine-draft
created_at: 2026-11-08T04:59:59.870Z
---
# 任务注册表（Tasks）— 2026-11-08-bare-commit-attribution-narrow

- [x] task-01: src/foreign-declared.js 判定细分——buildCommitAttribution 增 tokened 标记（task-\d+ token 或变更名 touch）；isForeignByCommit 纯裸（unknown 且 !tokened 且 owners 不含本变更）判 foreign，token/具名恒 own
- [x] task-02: test/commit-attribution-split.test.mjs 改口径——纯裸 touch 剔除断言（split/冻结面双面）、token 裸恒 own 新断言、夹具补 token/纯裸两类提交序列
- [x] task-03: test/filter-committed-face.test.mjs / test/hunk-gate-commit-attribution.test.mjs / test/foreign-own-priority.test.mjs 检查并同步新语义断言
- [x] task-04: 归因测试面合并跑 node --test 全绿，逐任务显式 pathspec 提交
