---
id: task-03
title: 'bumpScanDocBaselines 独立盖章函数 + 单测'
title_zh: 'bumpScanDocBaselines 独立盖章函数 + 单测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-3]
decision_ids: ['D-002@v1']
allowed_paths:
  - src/scan-postcheck.js
  - test/scan-refresh.test.mjs
target_files:
  - src/scan-postcheck.js
  - NEW:test/scan-refresh.test.mjs
provides:
  - 'bumpScanDocBaselines({cwd,specDir,project,docs,headShort,generator}) -> {bumped:[paths], skipped:[{file,reason}]}（幂等，只改点名文档三键）'
goal: >
  per-doc 基线推进盖章函数：只改点名文档 source_commit/updated_at/generator，独立于 stampScanDocHeaders 只补缺契约。
implementation:
  - scan-postcheck.js 新增导出 bumpScanDocBaselines({cwd,specDir,project,docs,headShort,generator})：逐点名文档改 frontmatter 三键，其余键与其余文档不动；不存在文档进 skipped [{file,reason}]
  - 幂等：已 bump 文档重跑同值零 diff
  - 创建 test/scan-refresh.test.mjs 首版：bump 单测（点名/未点名不动/幂等/缺失 skipped/其余键保留）
acceptance:
  - 点名文档三键更新、未点名文档与其余键逐字节不变
  - bumpScanDocBaselines 可从 scan-postcheck.js import
  - npm test 通过
verify:
  - npm test -- test/scan-refresh.test.mjs
constraints:
  - 不动 stampScanDocHeaders 及其调用方
  - 不写 .runtime 审计（归 task-06）
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
