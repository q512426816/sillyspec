---
id: task-01
title: run.js — sessionId 生成 + changeName 解耦
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
allowed_paths:
  - src/run.js
provides:
  - contract: quick-session-id
    fields: [sessionId, changeName]
goal: |
  quick 启动时生成 sessionId（crypto.randomUUID 前 8 hex），作 changeName（不再固定 default）。
  写 current-quick-run-id + prompt 输出 sessionId 给 agent。
implementation: |
  改 src/run.js：
  1. run.js:1386 去掉 `if (stageName === 'quick') changeName = 'default'` 硬编码。
     改为：用户传 --change <name> → 尊重；未传 → `quick-<crypto.randomUUID().slice(0,8)>`。
  2. run.js:1585-1602 quick 启动块：生成 sessionId（如未传 --change），写 current-quick-run-id（单文件，最新 session fallback）。
  3. prompt 输出 sessionId（step1 prompt 显式打印"本会话 sessionId: quick-<uuid8>，--done 需带 --change quick-<uuid8>"）。
acceptance: |
  - quick 启动后 changeName=quick-<uuid8>（非 default）
  - current-quick-run-id 写本会话 sessionId
  - prompt 含 sessionId 输出（agent 可见）
verify: |
  node 冒烟：sillyspec run quick（临时 fixture）→ progress.quick-<uuid8> 存在 + current-quick-run-id 含 uuid8。
constraints: |
  - 只改 src/run.js；sessionId 用 crypto.randomUUID（Node 19+ 原生，零依赖）
  - 摒弃旧 quick-YYYYMMDD-HHMMSS 时间戳格式（同秒撞）
---
# task-01: sessionId + changeName 解耦
## 目标
见 frontmatter goal（D-001 分行、D-003 UUID8hex）。
## 验收
见 frontmatter acceptance。
