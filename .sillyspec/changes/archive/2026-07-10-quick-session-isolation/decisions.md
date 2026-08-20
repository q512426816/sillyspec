---
author: qinyi
created_at: 2026-07-10T16:10:00+08:00
---

# 决策记录（Decisions）— quick 会话状态隔离

## D-001@v1: 隔离方案 = sessionId 作 changeName 分行（非 worktree / 非检测告警）
- type: architecture
- status: accepted
- source: user
- question: quick 并发状态竞争怎么解？
- answer: sessionId（UUID8hex）作 changeName，DB 分行 `progress.quick-<uuid8>`。
- normalized_requirement: run.js:1386 去掉 quick 固定 default；每会话 quick-<uuid8>；不动 db schema。
- impacts: [FR-01, FR-02, task-01, task-02]
- evidence: 前置讨论——worktree（B 方案）太重且 baseline 语义冲突；检测告警（A 方案）不解决并发覆盖；sessionId 分行精准命中 DB 层痛点。

## D-002@v1: worktree-guard hook 合并所有活跃 session guard（非单 session 识别）
- type: architecture
- status: accepted
- source: code（Design Grill 发现）
- question: hook 独立进程如何读正确 session 的 guard？
- answer: 读所有活跃 `quick-sessions/*/guard.json`，合并 baseline/allowedFiles 并集。
- normalized_requirement: hook 不依赖 current-quick-run-id 单文件；合并所有活跃 guard。
- impacts: [FR-05, task-04]
- evidence: Design Grill § 可行性层——hook 在 agent 写文件时触发（独立进程），current-quick-run-id 多会话覆盖不可靠；合并并集安全侧倾斜（不误拦合法写）。

## D-003@v1: sessionId 用 crypto.randomUUID 前 8 hex（非时间戳）
- type: compatibility
- status: accepted
- source: user
- question: sessionId 格式？
- answer: `quick-<uuid8hex>`（crypto.randomUUID 前 8）。
- normalized_requirement: 摒弃现有 quick-YYYYMMDD-HHMMSS（同秒并发撞）。
- impacts: [FR-01, task-01]
- evidence: 现有时间戳格式本身竞态；UUID 全局唯一零依赖（Node 19+ 原生）。
