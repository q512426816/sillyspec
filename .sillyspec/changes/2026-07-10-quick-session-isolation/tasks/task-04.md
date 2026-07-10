---
id: task-04
title: stages/quick.js — step1/3 prompt 适配
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P1
depends_on: [task-01]
blocks: [task-06]
allowed_paths:
  - src/stages/quick.js
expects_from:
  task-01:
    - contract: quick-session-id
      needs: [sessionId]
goal: |
  step1/3 prompt 告知 agent 本会话 sessionId + --done 需带 --change。
implementation: |
  改 src/stages/quick.js step1/step3 prompt：
  1. step1 prompt 加："本 quick 会话 sessionId: <sessionId>。完成 step3 时用 `sillyspec run quick --done --change <sessionId> --output ...` 推进。"
  2. step3 prompt 加：确认 --done 带 --change <sessionId>。
  3. {{sessionId}} 占位符由 run.js outputStep 替换（参考现有 {{linked-changes}} 占位符机制）。
acceptance: |
  - step1/3 prompt 含 sessionId + --done --change 指引
  - agent 知道本会话 id 和如何 --done
verify: |
  手工冒烟：sillyspec run quick → step1 prompt 含 sessionId。
constraints: |
  - 只改 src/stages/quick.js；占位符替换在 run.js（如需，run.js outputStep 加 {{sessionId}}）
---
# task-04: prompt 适配
## 目标
见 frontmatter goal（FR-03 agent 带参数）。
