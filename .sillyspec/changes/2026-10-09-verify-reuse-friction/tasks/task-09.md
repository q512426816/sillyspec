---
id: task-09
title: 模块卡同步 + 全量回归绿
title_zh: 模块卡同步 + 全量回归绿
wave: W4
status: draft
depends_on:
  - task-01
  - task-02
  - task-03
  - task-04
  - task-05
  - task-06
  - task-07
  - task-08
goal: 文档同步义务 + 全量回归收口（落点裁决：卡本体无行为变化不触碰，行为记录宿主=各模块 changelog——原卡把卡本体 .md 写进了 target_files，实际落点为 changelog sidecar）
implementation: 同步 runtime/core-engine/cli-entry/worktree 四张模块卡与 changelog（复用口径/门序/跨仓解析行为变化）. 回归走 node test/run-tests.mjs 全量
verify: node test/run-tests.mjs 全量回归. 模块卡 diff 与实际行为一致
constraints: 文档面改动不触发实测缓存语义变化；卡内容如实反映行为不夸大
acceptance:
  - 四卡+changelog 同步本变更行为变化
  - node test/run-tests.mjs 全量绿（含新增 8 个测试文件与既有核心面）
target_files:
  - docs/sillyspec/platform-interface-map.md
  - .sillyspec/docs/sillyspec/modules/runtime.changelog.md
  - .sillyspec/docs/sillyspec/modules/core-engine.changelog.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.changelog.md
  - .sillyspec/docs/sillyspec/modules/worktree.changelog.md
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/
  - .sillyspec/changes/2026-10-09-verify-reuse-friction/
---

