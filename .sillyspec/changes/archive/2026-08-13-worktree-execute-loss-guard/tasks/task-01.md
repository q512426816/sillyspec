---
id: task-01
title: cleanup fail-closed protection + call-site contracts
title_zh: cleanup fail-closed 保护 + 调用点契约
author: qinyi
created_at: 2026-08-13 15:02:00
priority: P0
allowed_paths:
  - src/worktree.js
  - src/index.js
  - src/worktree-apply.js
  - src/run/command.js
goal: >
  cleanup() 对未落主仓交付变更 fail-closed 拒绝清理（需 --force 绕过），并补全各调用点契约：
  apply 后自动 cleanup 与 execute reset 显式 force、显式 worktree cleanup 命令补 blocked 分支、
  doctor --fix stale 路径补 blocked 提示。
implementation:
  - worktree.js cleanup() 在 junction 解链与 git worktree remove --force 之前调 hasUnappliedChanges，hasChanges 为真且未 force 时返回 result blocked 并 console.error 列文件加提示
  - worktree-apply.js 三处 apply 后自动 cleanup（417/649/759 行）显式传 force 为 true，规避 main HEAD 未 commit 导致误阻
  - command.js execute reset 的 cleanup（960 行）显式传 force 为 true，reset 语义即显式销毁脏态
  - index.js 显式 worktree cleanup 命令对 blocked 返回补显式分支，打印拒绝提示而非误报 worktree 未找到
  - worktree.js doctor 修复 stale 路径的 cleanup 调用（约 1045 行）对 blocked 结果给出先 apply 或 commit 的明确提示
  - in-place 与 native-worktree 模式由 hasUnappliedChanges 内部返回 false 自然跳过保护，保持零回归
acceptance:
  - 未落主仓交付变更时 cleanup 返回 blocked 并列出文件，不删除 worktree 目录分支与 meta
  - 传 force 为 true 时跳过保护照常清理
  - apply 成功后自动 cleanup 与 execute reset 正常完成不被误阻
  - 显式 worktree cleanup 命令对 blocked 打印正确提示而非 worktree 未找到
  - 无未落主仓变更时 cleanup 行为与旧版完全一致
verify:
  - node test/worktree-cleanup-guard.test.mjs
  - node test/worktree-apply-classification.test.mjs 与 worktree-apply 相关真实 apply 回归
  - npm test 全量确认既有 cleanup 相关测试零回归
constraints:
  - 不改 hasUnappliedChanges 语义与 _changesAlreadyOnMain 的 main HEAD 判定
  - cleanup 签名不变，仅新增 blocked 返回值
  - Windows 兼容（junction 解链顺序与失败 fail-loud 保留）
  - 回归面为 worktree-apply 系列真实 apply 路径测试，force 为 true 实现后须照常通过
---

# task-01: cleanup fail-closed 保护 + 调用点契约

见 design.md 总体方案 Phase 1 与调用点契约、decisions.md D-001/D-006。
