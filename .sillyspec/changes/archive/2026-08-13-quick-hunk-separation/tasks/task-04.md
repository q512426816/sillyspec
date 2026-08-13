---
id: task-04
title: 补 test/quick-same-file-concurrent.test.mjs
title_zh: 补同文件并发检测测试
allowed_paths:
  - test/quick-same-file-concurrent.test.mjs
goal: 测同文件并发检测（warn + 分离指引 + advisory 不阻断 + 旧 guard 跳过）
implementation: |
  新建 test/quick-same-file-concurrent.test.mjs：构造 guard（allowedFilesHash + baselineFiles）+ 改 allowedFile 内容 + 调 auditQuickCompletion → 断言 warn 含"同文件并发"+"git add -p"；断言 result.status 不变（advisory）；旧 guard（无 allowedFilesHash）→ 不 warn（向后兼容）。自包含临时 fixture。
acceptance: 测试覆盖 检测 warn / advisory 不阻断 / 旧 guard 跳过
verify: node test/quick-same-file-concurrent.test.mjs 全绿
constraints: node:assert strict；自包含临时 fixture；不依赖共享状态
depends_on:
  - task-02
---

# task-04: 补 test/quick-same-file-concurrent.test.mjs

测检测 warn + advisory + 旧 guard 跳过。自包含临时 fixture。
