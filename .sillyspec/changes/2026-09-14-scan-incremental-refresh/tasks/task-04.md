---
id: task-04
title: 'worktree-guard 握手分支 + 7/40 归一化修复'
title_zh: 'worktree-guard 握手分支 + 7/40 归一化修复'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-7]
decision_ids: ['D-007@v1']
allowed_paths:
  - src/hooks/worktree-guard.js
  - test/worktree-guard.test.mjs
target_files:
  - src/hooks/worktree-guard.js
  - test/worktree-guard.test.mjs
provides:
  - 'guard 握手契约：scan-guard.json {mode:scan-refresh, refreshDocs:[specRoot相对POSIX路径], sourceCommit:7位短哈希, docHashes:{路径:sha256}, startedAt, forceRescan} → hook 白名单放行'
goal: >
  refresh 编辑拍走通：guard 加 scan-refresh 会话态前置分支（白名单放行），修复 check-1 的 7/40 位哈希错配恒拦存量 bug。
implementation:
  - shouldBlockScanDocOverwrite：guard 读取后、forceRescan 短路后插前置分支——mode=scan-refresh 且 refreshDocs 数组含目标文档（specRoot 相对 POSIX 路径）则放行；白名单外继续原保护
  - check-1 归一化：两侧 String(x).slice(0,7) 后不等才拦（恢复同基线放行/异基线拦截本意）
  - 存量 guard（无 mode 字段）路径逐字节不变
  - test 新增：白名单内放行/白名单外拦截/无 mode 行为不变/7-40 位混合归一；存量用例不删不改
acceptance:
  - mode=scan-refresh + refreshDocs 含目标 → 放行；不含 → 原拦截
  - guard 40 位 vs frontmatter 7 位同基线放行（修复实证）、异基线拦截
  - 存量用例零删除零改写，npm test 通过
verify:
  - npm test -- test/worktree-guard.test.mjs
  - npm test
constraints:
  - hook 禁止 import 仓内非 hook 模块（known-issues#hook-import-restriction）——分支自包含
  - 不滥用 forceRescan 语义
  - 存量用例不删不改
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
