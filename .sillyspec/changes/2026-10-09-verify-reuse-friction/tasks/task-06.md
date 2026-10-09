---
id: task-06
title: W4/FR-06 trace 行 repo 归属（写侧透传+读侧按行解析）
title_zh: W4/FR-06 trace 行 repo 归属（写侧透传+读侧按行解析）
wave: W4
status: draft
depends_on:
  - task-04
goal: 跨仓 trace 行不再主仓解析悬空
implementation: test-bindings 机器 candidate 行写侧透传 repo 字段（additive，源自 task 卡 repo 切片）；verify-postcheck 悬空判定与残差执行按行 repo 经 repos 注册表换根解析，无 repo 行回退主仓
verify: node --test test/test-bindings-crossrepo-row-resolution.test.mjs（先复现现行悬空，再验按行解析命中 + 存量回退兼容）
constraints: 先复现后修；additive 字段存量零迁移；同顶级名歧义不猜（D-005@v1）
acceptance:
  - 跨仓行携 repo 字段并按行 repo 根解析不悬空
  - 存量无 repo 行回退主仓兼容
  - 复现测试先行钉住现行缺陷
target_files:
  - src/test-bindings.js
  - src/verify-postcheck.js
  - test/test-bindings-crossrepo-row-resolution.test.mjs
allowed_paths:
  - src/test-bindings.js
  - src/verify-postcheck.js
  - test/test-bindings-crossrepo-row-resolution.test.mjs
---

