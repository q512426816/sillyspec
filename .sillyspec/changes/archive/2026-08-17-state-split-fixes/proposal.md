---
author: qinyi
created_at: 2026-08-16T23:15:00+08:00
updated_at: 2026-08-16T23:15:00+08:00
---

# 提案书（Proposal）

## 动机

本 session 两次完整流程在多 agent 并发下暴露三个重复摩擦源（run 目录静默缺失致 archive 错配、apply --merge 被 baseline 并行文件冲突阻塞、活文档引用漂移事后背锅），均有实证与源码定位。并发状态分裂是持续摩擦源，修复后 execute/apply/docs 三条链路的并发可靠性提升。

## 关键问题

1. marker 写入与 run 目录创建分离，静默失败让完成度判定错配到别的 run（两次手动补 review.json）
2. baseline checkpoint 污染 worktree 分支，整分支 merge 撞并行文件（一次手动 cp+三方适配）
3. 活文档引用漂移无改时提示，docs gate 基线共享让当前流程背锅（两次 18 处）

## 变更范围

三修复（详见 design.md）：#1 四处 marker 写入点原子化+分层 fail 语义；#2 applyByMerge 预对齐 baseline 并行文件（四条件过滤+dirty 保护）；#3 docsCheckHint 活文档漂移提示。7 src 文件 + 3 测试。

## 不在范围内（显式清单）

- 不改 baseline overlay 语义（merge 侧过滤）
- 不做 docs gate 基线按变更归属分离
- 不改 per-task review 写入机制

## 成功标准（可验证）

- execute 启动后 `execute-runs/<runId>/tasks/` 目录必然存在（不变量）；mkdir 失败各写入点按分层语义留痕/阻断
- baseline 含并行文件场景 `worktree apply --merge` 不再冲突（预对齐生效）；worktree 工作区 dirty 文件不被覆盖
- 改动活文档映射的源码文件时 quick 审计输出漂移提示
- npm test 全绿（既有 211 + 新增 3 测试文件）
