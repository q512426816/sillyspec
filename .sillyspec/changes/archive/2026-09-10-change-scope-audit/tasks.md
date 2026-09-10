---
author: qinyi
created_at: 2026-09-10 10:36:45
---
# 任务清单（Tasks）

- [x] task-01: 纯函数 computeChangeScopeAudit 双模式 + collectNumstatByPath 行数三档 + renderScopeAuditTable（NEW:src/scope-audit.js）
- [x] task-02: resolveReconcileActualFiles 补 export + 返回结构新增 baseAnchor（src/verify-postcheck.js）
- [x] task-03: scope-audit 命令路由 --change/--json（src/index.js）(depends_on: task-01, task-02)
- [x] task-04: execute --done 全表+快照双路径 与 verify --done 一行漂移确认（src/run/complete.js）(depends_on: task-01, task-02)
- [x] task-05: archive --confirm {SCOPE_AUDIT_TABLE} 占位与注入（src/stages/archive.js, src/run/prompt.js）(depends_on: task-01, task-02)
- [x] task-06: quick --done 文件行/审计行升级行数（src/run/complete-handlers.js）(depends_on: task-01)
- [x] task-07: 夹具测试 test/scope-audit.test.mjs + npm test 回归（NEW:test/scope-audit.test.mjs）(depends_on: task-01, task-02, task-03, task-04, task-05, task-06)
- [x] ql-20260910-004-b807 P1 垫底：独立审查通道优先序可配置（review_dispatch.channel_priority）+ 通道指引按配置序注入契约 + reviewer.channel 审计字段（gate 分支扩展）。P2 review-dispatch…
