---
id: task-02
title: run.js — --done 恢复 sessionId + 收尾
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P0
depends_on: [task-01]
blocks: [task-06]
allowed_paths:
  - src/run.js
expects_from:
  task-01:
    - contract: quick-session-id
      needs: [sessionId, changeName]
goal: |
  quick --done 恢复本会话 sessionId（优先 --change，fallback current-quick-run-id），
  收尾删 .runtime/quick-sessions/<sid>/。
implementation: |
  改 src/run.js：
  1. quick --done 启动时：优先读 --change（quick-<uuid8>）；未传则 fallback 读 current-quick-run-id。
  2. 用恢复的 sessionId 作 changeName（读/写 progress.quick-<uuid8>）。
  3. run.js:2924 quick 收尾 unlink 旧单文件 quick-guard.json → 改删 .runtime/quick-sessions/<sid>/ 目录。
acceptance: |
  - --done --change quick-<uuid8> 精确恢复
  - --done（不带）fallback current-quick-run-id（单会话兼容）
  - 收尾删 session 目录
verify: |
  task-06 测试覆盖：两 quick 会话各自 --done，steps 独立推进不互相影响。
constraints: |
  - 只改 src/run.js；fallback 是单会话兼容，多会话建议带 --change（文档声明）
---
# task-02: --done 恢复 sessionId
## 目标
见 frontmatter goal（FR-03 跨进程传递）。
