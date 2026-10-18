---
author: flow-machine-draft
created_at: 2026-10-18T03:09:27.361Z
---
# 任务注册表（Tasks）— 2026-10-18-runtime-relayout

- [x] task-01: 新建 src/runtime-paths.js（runtimeStatePath/runtimeTempPath/migrateRuntimeLayout）+ test/runtime-relayout.test.mjs 迁移用例（幂等/fail-open/未知文件不动）跑绿
- [x] task-02: 19 类 per-change 散文件全部读写点接入 runtimeStatePath（写入点：sync.js/flow-draft.js/route-hindsight.js/watcher.js/verify-postcheck.js/run-test-ledger/ceremony-tier.js/verify-draft.js/review-dispatch.js/scope-audit.js/handoff.js/contract-matrix.js/friction-tally.js/flow.js/verify-probes.js；读点：index.js/task-tick.js/review-tier.js/run-gates.js/run-stage.js/run-complete.js/stage-review.js/complete-handlers.js）+ state/ 落径断言用例跑绿
- [x] task-03: 日志与备份产物接入 runtimeTempPath（watcher.js watcher.log+lock tmp / run-bg-sync spec-sync-bg.log / git-helper.js exclude 面 / consistency-doctor.js audit.log / db.js corrupt / progress.js pre-import）+ temp/ 落径与删除不阻断用例跑绿
- [x] task-04: pruneArchivedChangeRuntime 扩 state/ 19 类精确名回收（保留根路径兜底）+ 回收用例跑绿
- [x] task-05: CLI 入口（src/index.js 主分发前）与 doctor 接 migrateRuntimeLayout + 入口迁移用例跑绿
- [ ] task-06: 既有测试面路径字面量修正（26 文件）+ 全量测试套绿
- [ ] task-07: 本仓 .sillyspec/.runtime 执行迁移 + 一次性遗留物（repro-*.mjs、anchor-*.mjs、full-test-*.log 等）归置 temp/ + 根目录文件计数验收 ≤60 + flow status 冒烟
